# Design: riego-de-precision

Como se construye lo que el `proposal.md` pidio. Cubre el **primer producto entero**: goteo
autonomo en una parcela, con el dato guardado de forma que sirva para ML.

El modelo de datos graficado esta en `desarrollo/diagramas/modelo-de-datos.html` y la
infraestructura completa en `infraestructura-completa.html`. Aca va el **por que** de cada
decision, que el diagrama no puede mostrar.

> **Supuesto declarado**: corre en el VPS de staging, namespace propio (opcion A de la pregunta 1).
> El disparador para mudarse a un VPS de produccion esta al final, en "Cuando mudarse".

## 1. La base de datos

Una sola base: **PostgreSQL 16 + TimescaleDB + PostGIS**. El 90% del volumen es serie temporal y
el 100% del significado es geografico; separarlos en dos motores rompe la consulta que el ML
necesita -"dame la humedad de los ultimos 30 dias de las parcelas cuyo NDVI bajo"- que en un solo
motor es un JOIN y en dos es trabajo de aplicacion.

### Las once tablas, y cual es cual

| tabla | que es | naturaleza |
|---|---|---|
| `cliente` | el tenant | catalogo |
| `campo` | el establecimiento de un cliente | catalogo |
| `parcela` | **la unidad de analisis**: un poligono | catalogo + geometria |
| `dispositivo` | sensor, trampa, estacion o controlador: un punto | catalogo + geometria |
| `politica_riego` | los umbrales vigentes de una parcela | catalogo versionado |
| `campania` | que se sembro, cuando y **cuanto rindio** | catalogo + **etiqueta de ML** |
| `analisis_suelo` | el laboratorio, con su punto de muestreo | evento raro |
| `indice_espacial` | NDVI por parcela y fecha, de **satelite o dron** | serie rala |
| `medicion` | lo que manda un sensor | **hypertable** |
| `captura_trampa` | conteo de plagas por fecha | evento |
| `riego_evento` | que decidio el controlador y cuanto rego | **hypertable + etiqueta de ML** |

Solo `medicion` y `riego_evento` son hypertables de Timescale. Convertir un catalogo de 200 filas
en hypertable es costo sin beneficio.

### Lo que hace que el dato sirva para ML

Esto no es estilo: es la razon de ser del proyecto y donde un error **no se puede deshacer**.

1. **Crudo Y calibrado, con la version de calibracion.**
   ```
   valor_crudo      double precision NOT NULL,   -- lo que mando el sensor, sin tocar
   valor_calibrado  double precision,            -- NULL si no hay calibracion vigente
   calibracion_id   bigint REFERENCES calibracion(id)
   ```
   Guardar solo el calibrado ata el historico a la formula del dia en que se guardo. Si en seis
   meses se descubre que la formula estaba mal, con el crudo **se recalcula todo**; sin el crudo
   se perdio todo. `double precision`, no `real`: la diferencia de disco es despreciable y la de
   precision no.

2. **Dos tiempos, nunca uno.**
   ```
   medido_en   timestamptz NOT NULL,   -- el reloj del dispositivo
   recibido_en timestamptz NOT NULL DEFAULT now()
   ```
   El gateway encola dias sin señal. Un solo timestamp obliga a elegir entre mentir sobre cuando
   se midio o perder cuanto tardo en llegar, y **las dos cosas le importan al modelo**: la primera
   es la variable, la segunda es la calidad del enlace. La hypertable particiona por `medido_en`,
   que es el eje del analisis.

3. **`NULL` no es `0`.** Un sensor que no reporto **no midio humedad cero**. La columna es
   nullable y nunca se rellena con un default: un `0` inventado le enseña al modelo que el suelo
   se seca de golpe.

4. **No se agrega en la ingesta.** Nada de promediar por hora "para ahorrar disco". La agregacion
   va en **continuous aggregates** de Timescale, que son vistas materializadas **derivadas**: se
   pueden tirar y recalcular. Un promedio escrito en lugar del dato no se puede des-promediar.

5. **La retencion se decide contra el disco medido, y solo sobre lo derivado.** El crudo de
   `medicion` es el activo; si hay que comprimir, se usa la compresion nativa de Timescale
   -que no pierde dato- antes que borrar filas. Numeros concretos cuando la Fase 5 de a serie.

### La geometria ata todo

`parcela.geom geometry(Polygon, 4326)` y `dispositivo.punto geometry(Point, 4326)`, los dos con
indice GiST. La pertenencia **no se declara a mano**: sale de `ST_Contains(parcela.geom,
dispositivo.punto)`. Consecuencia buscada: **si el cliente corrige el limite de una parcela, todo
se recalcula solo** -que dispositivos le pertenecen, que NDVI le corresponde, que mediciones
entran en su serie-.

**`indice_espacial` cubre satelite y dron con una sola tabla**, distinguidos por `fuente`
(`sentinel2` | `dron`) y `resolucion_m`. Son el mismo tipo de dato a distinta escala; separarlos en
dos tablas rompe la consulta que los quiere juntos. **No se guarda el raster**: un vuelo produce
gigabytes. Va el **agregado por parcela** -media, p10, p90 y **coeficiente de variacion**- mas un
puntero al archivo en almacenamiento de objetos. El coeficiente de variacion es el que contesta
"esta parcela es uniforme?", que es lo que decide cuantos sensores lleva.

SRID 4326 (WGS84) porque es lo que da el GPS y lo que entrega Sentinel-2. Para calcular areas y
distancias se proyecta en la consulta (`::geography` o UTM 21S), nunca se guarda proyectado: el
dato crudo se guarda como llego, tambien en geometria.

### Multi-cliente: Row-Level Security

Cada tabla con dato de cliente lleva `tenant_id uuid NOT NULL`, y **la base lo hace cumplir**:

```sql
ALTER TABLE medicion ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_aislado ON medicion
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

La API abre la transaccion con `SET LOCAL app.tenant_id = ...` sacado del token, nunca de un
parametro del request. **Una query sin tenant no devuelve filas**, y eso es una propiedad del
motor, no una convencion que el primer bug rompe.

El rol de la aplicacion **no** es superusuario ni dueño de las tablas: un dueño de tabla saltea
RLS por default (`NOFORCE`), asi que ademas va `ALTER TABLE ... FORCE ROW LEVEL SECURITY`. Se
prueba **en rojo**: con dos tenants cargados, la query del tenant A no puede ver una fila de B.

## 2. El lazo de control

La regla del proposal: **el controlador decide en el campo**. Concretamente:

| vive en | que decide |
|---|---|
| **controlador** (en el lote) | abrir y cerrar la valvula, ahora |
| **nube** | la POLITICA: umbrales, ventanas horarias, duracion maxima |

El controlador guarda la ultima politica recibida y su fecha. Si pasan **N dias sin politica
nueva**, no se queda esperando ni sigue con la ultima indefinidamente: **cae a un programa
conservador** -riego minimo de supervivencia- y lo registra. Una falla de enlace no puede
convertirse en un lote inundado ni en uno seco.

Cada decision se registra entera en `riego_evento`: la **condicion** que la causo (que humedad
leyo, de que sensores), la **decision** (regar/no, cuanto), la **politica** vigente y el
**resultado** (minutos efectivos, litros si hay caudalimetro). Eso es lo que convierte al
historico en dataset supervisado: sin la accion y su contexto, el ML describe pero no predice.

### Litros por parcela: medido y estimado, los dos

Hoy nadie mide el consumo de agua de forma granular -no se sabe cuantos litros uso UNA parcela en
UN periodo-. Con el lazo de riego ya instrumentado, eso sale casi gratis, y conviene guardarlo de
**dos formas a la vez**:

| | de donde sale | precision |
|---|---|---|
| `litros_estimados` | minutos de valvula x caudal nominal de los goteros | +-20/30%, se degrada con la presion y los goteros tapados |
| `litros_medidos` | pulsos de un caudalimetro en la linea del sector | real |

**Guardar las dos no es redundancia: la DIFERENCIA es el diagnostico.** Medir mas de lo esperado
es fuga o rotura; medir menos es goteros tapados, filtro sucio o presion caida. Ese delta es la
señal que convierte el mantenimiento de una visita de rutina en un aviso concreto, y es una linea
de ingreso del negocio -no una metrica de adorno-.

En el esquema es una columna mas en `riego_evento` y un `dispositivo` de tipo caudalimetro. La
consulta "litros de la parcela X entre dos fechas" no necesita nada nuevo: el evento cuelga del
dispositivo y el dispositivo cae adentro de la parcela por `ST_Contains`.

**Tres usos, en orden de valor:**
1. **Probar el ahorro.** Es lo que hoy no se puede demostrar y es el argumento de venta entero.
   Con esto se pasa de "ahorras agua" a un numero por parcela y por ciclo.
2. **Litros por kilo cosechado.** Cruzado con el rendimiento de `campania`, es el KPI agronomico
   de verdad -productividad del agua- y la etiqueta mas util que va a tener el modelo.
3. **Justificar consumo** ante derechos de agua o restricciones por sequia.

**Advertencia de dimensionamiento, medida y no supuesta**: un sector de goteo de media hectarea
mueve del orden de 60 L/min por una linea de 1 1/2 a 2 pulgadas. El YF-S201 de 1/2" que se
consigue local (Gs 95.000) llega a ~30 L/min y es de turbina Hall: sirve para el **banco**, donde
lo que se valida es el conteo de pulsos y la acumulacion, **no para un sector real**. Para el lote
va un medidor de riego de 1 1/2 a 2" con salida de pulsos (~40 a 100 USD), que aguanta agua sucia
y caudal bajo.

**El gateway es independiente**: si muere, el controlador sigue regando y acumula eventos para
cuando vuelva el enlace. El backend **deduplica por `(dispositivo_id, medido_en)`** con un indice
unico, porque el store-and-forward reenvia.

## 3. La API

FastAPI, Python 3.12, async. Tres superficies separadas a proposito:

| superficie | quien la usa | forma |
|---|---|---|
| **ingesta** | gateway | MQTT QoS 1, no HTTP |
| **api de aplicacion** | el front | REST/JSON con OpenAPI |
| **api de politica** | controlador | REST, la unica que el campo consulta |

La ingesta va por **MQTT y no por HTTP** porque el gateway reconecta solo, encola y reintenta sin
que nadie programe eso: es lo que el protocolo ya hace. Un worker consume el topico, valida,
deduplica y escribe en lote.

Las tres corren como deployments separados: la ingesta tiene un perfil de carga distinto al del
front y no queremos que un pico de mediciones vuelva lenta la pantalla del cliente.

## 4. El front

Next.js. Lo que la fase 1 necesita, y nada mas: **mapa de parcelas** (el poligono, los
dispositivos, el estado), **series** de humedad y clima, **reportes** y el **historial de riego**.
El mapa es la pantalla principal porque la parcela es la unidad de analisis: todo se navega desde
ahi.

No hay app movil nativa en esta fase (no-objetivo del proposal). Web responsive.

## 5. Como se despliega

Sobre lo que ya existe, sin inventar nada: `environments/staging/<app>/` + `apps/<app>/base/`,
reconciliado por Argo CD. Lo que la admision **va a rechazar** si no se respeta -esta en
`desarrollo/desplegar-una-app.md`, no se adivina-: imagen por digest `@sha256`, version fija,
registry en allowlist, `requests`/`limits` declarados, PSA `restricted`.

Dos flujos de red nuevos, y **cada uno es una CCNP declarada en git** con el `tracking-id` de Argo
-la red es default-deny, no se abre un puerto-:

1. **entrante**: el gateway del campo -> el broker MQTT
2. **saliente**: el worker de NDVI -> Copernicus (Sentinel-2)

La base es un StatefulSet con PVC. **El backup de la base es requisito de la primera vuelta**, no
una mejora: el dato es el activo del negocio y una base de series sin backup es una apuesta.

## 6. Orden de construccion

Cada paso deja algo que se puede probar solo. El detalle por tarea va en `tasks.md`.

| # | que | se prueba con |
|---|---|---|
| 1 | Esquema + RLS + hypertables | dos tenants cargados; A no ve nada de B |
| 2 | Ingesta MQTT -> base, con dedup | reenviar el mismo payload no duplica filas |
| 3 | API de politica + controlador simulado | corta el enlace: sigue regando y cae al programa conservador |
| 4 | Controlador real en banco (ESP32 + valvula) | la valvula abre por humedad medida, no por reloj |
| 5 | Front: mapa, series, historial | la parcela se ve y sus dispositivos caen adentro solos |
| 6 | NDVI de Sentinel-2 por parcela | un poligono nuevo trae su serie de NDVI |
| 7 | Estacion meteorologica | sus variables entran al mismo modelo de medicion |

El paso 4 es el primero que necesita hardware, y son **~63 USD** (ver `ECONOMIA.md`). Los tres
primeros no necesitan comprar nada.

## Cuando mudarse a un VPS propio

El supuesto declarado arriba es "corre en staging". **El disparador de la mudanza es el primer
cliente que paga**, no un umbral tecnico: a partir de ahi el dato de un tercero no comparte disco
con un ambiente de pruebas. Antes de eso, dos señales adelantan la mudanza: `await` de disco
sostenido arriba de 20 ms con la base andando, o que el backup no entre en la ventana.
