# Cualquier cultivo, la API del satelite, que da el NDVI, y el dron termico

**28/09/2026.** Cuatro preguntas del dueño, contestadas contra el
[design.md](../design.md) que ya existe.

## 1. Se pueden cargar todas estas mediciones? Casi todo si, y hay UN hueco

**Lo que el diseño ya resuelve, y es agnostico al cultivo por construccion:**

| | por que sirve igual para lechuga hidroponica que para tomate |
|---|---|
| `medicion` con **`valor_crudo` + `valor_calibrado` + `calibracion_id`** | **no le importa que magnitud es.** Guardar el crudo vale lo mismo para humedad de suelo que para EC de solucion, y por la misma razon: si la formula estaba mal, con el crudo **se recalcula todo** |
| **`medido_en` y `recibido_en`** separados | igual de necesario: el nodo del patio tambien puede encolar |
| **`NULL` no es `0`** | un sensor de pH que no reporto **no midio pH cero** |
| **No se agrega en la ingesta** | vale igual |
| `parcela` como **poligono PostGIS** | un bloque hidroponico **es** una unidad de analisis. Un poligono de 2 m2 es tan valido como un potrero de 100 ha, y `ST_Contains` le asigna los dispositivos solo |
| `campania` con **"cuanto rindio"** | es **la etiqueta de ML**, y es la misma para cualquier cultivo |

> **Y el principio que contesta "preparar para cualquier tipo de cultivo": NO se prepara agregando
> columnas por cultivo. Se prepara no teniendo ninguna.** La magnitud es una **fila**, el cultivo es una
> **fila**, el umbral es una **fila** en `politica_riego`. **La prueba: si agregar frutilla obliga a una
> migracion, el diseño fallo.**

### EL HUECO, y hay que cerrarlo antes de escribir la primera migracion

**`design.md` muestra las columnas de valor de `medicion` pero nunca dice como se distingue una
humedad de un pH.** O sea: **no esta declarado si `medicion` es angosta -- una fila por (dispositivo,
momento, magnitud, valor) -- o ancha, con una columna por variable.**

| | consecuencia |
|---|---|
| **Angosta** (una fila por magnitud, con `magnitud_id` y unidad) | **cada magnitud nueva es una FILA de catalogo.** EC, pH, oxigeno disuelto, temperatura de solucion entran sin tocar el esquema |
| **Ancha** (una columna por variable) | **cada magnitud nueva es una MIGRACION.** Y agregar hidroponia serian cuatro |

**Esto no es un detalle de estilo: es exactamente la pregunta que el dueño hizo.** Va a `PREGUNTAS.md`
o se decide en la Fase 1, y la respuesta tiene que ser **angosta**, con `magnitud` como catalogo
(codigo, unidad, rango valido).

### Lo que falta AGREGAR para hidroponia -- y es poco

| tabla nueva | por que |
|---|---|
| **`solucion_nutritiva`** | la receta vigente, el objetivo de EC y pH, y **cuando se renovo**. Sin esto, un pH medido no se puede atribuir a una receta, y el dato no enseña nada. **Es el `calibracion` de la solucion**: versionada, nunca editada |
| **`bloque_experimental`** | que bloque, **que variable se vario** y cual es el control. Sin esto el metodo de bloques de [como-aprender-de-cada-ciclo.md](como-aprender-de-cada-ciclo.md) **no se puede consultar**, y un experimento que no se puede consultar no existe |

**Y dos semanticas que cambian sin cambiar tablas:**

- **`analisis_suelo` no aplica** en hidroponia. Su equivalente es **analisis de solucion**, que es otra
  cosa y va contra `solucion_nutritiva`.
- **`riego_evento`**: en tierra es *"abri la valvula 20 minutos y entraron 300 litros"*. En hidroponia
  es *"recircule"* o *"dosifique 40 ml de A y 40 de B"*. **Misma tabla, distinto tipo de evento** -- y
  esa es la prueba de que la tabla estaba bien pensada.

## 2. API del satelite: si, y tu diseño ya la asumio sin saberlo

**Existe, es gratis y no hay que bajar imagenes.** Se llama **Statistical API** del **Copernicus Data
Space Ecosystem** ([docs](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Statistical/Examples.html)).

> *"Permite obtener estadisticas calculadas sobre imagenes satelitales, **sin necesidad de descargar
> imagenes**. Se define el area de interes, el rango de fechas, el evalscript y las medidas
> estadisticas. El resultado es un JSON."*

**Y ahora mira lo que `design.md` ya decia de `indice_espacial`:**

> *"**No se guarda el raster**: un vuelo produce gigabytes. Va el **agregado por parcela** -- media, p10,
> p90 y **coeficiente de variacion** -- mas un puntero al archivo."*

| lo que manda la API | lo que la tabla queria |
|---|---|
| poligono + rango de fechas | `parcela.geom` |
| JSON con media, min, max, desviacion por fecha | `media`, `p10`, `p90`, coeficiente de variacion |

**Encaja uno a uno.** La integracion satelital **no es un pipeline de procesamiento de imagenes**: es
un **job del backend que llama una API con un poligono e inserta filas**. Eso cambia el tamaño del
paso 6 del orden de construccion de semanas a dias.

**Lo que hay que tener en cuenta:**

- **Cuota del free tier**, con unidades de procesamiento que **se reinician el dia 1 de cada mes y no
  se acumulan**. Hay que medir cuanto consume una consulta por parcela y por fecha **antes** de
  automatizar un barrido diario.
- **La salida a Copernicus es una CCNP declarada en git**, porque la red es default-deny
  ([proposal.md](../proposal.md) decision 5). Se le pasa a `infra-platform`, no se abre un puerto.
- Alternativas si la cuota molesta: Sentinel-2 en **AWS Open Data** (COGs gratis) o el **Planetary
  Computer** de Microsoft.

## 3. Que se puede hacer con el NDVI, concretamente

**En las 120 ha de pasto -- que es donde sirve de verdad:**

| | que contesta |
|---|---|
| **Comparar potreros hoy** | **cual tiene mas pasto**, o sea **a cual mover la hacienda**. Es la pregunta que un ganadero se hace todas las semanas |
| **Serie por potrero en el tiempo** | **cual se esta degradando** año contra año. Eso no se ve mirando, porque baja despacio |
| **Caida repentina en un sector** | **un problema antes de que se vea**: agua, plaga o nutricion, dias antes que el ojo |
| **Contra el mismo mes de años anteriores** | si **es un año malo o un pedazo malo** -- y son decisiones opuestas |
| **Coeficiente de variacion dentro de la parcela** | **si la parcela es uniforme**, que es lo que decide **cuantos sensores lleva**. Tu diseño ya lo pide, y es la respuesta barata a la pregunta de los dos sensores a un metro |
| Biomasa -> **capacidad de carga** | cuantos animales aguanta ese potrero. **Necesita calibracion local**: cortar, secar y pesar. Es trabajo real, no sale de la API |

**Y los limites, dichos sin adornos:**

- **10 m por pixel.** 120 ha son ~12.000 pixeles: excelente. **1.000 m2 son 10 pixeles: inservible.**
  Para el patio y la parcela chica, el satelite no sirve.
- **Nubes.** Pasa cada 5 dias, pero en temporada humeda las imagenes usables pueden ser cada 10-15.
- **El NDVI se satura** con mucha biomasa: llegado un punto deja de distinguir. Para eso Sentinel-2
  tiene **borde rojo** (bandas 5/6/7) y el **NDRE** funciona mejor arriba. Vale mas que el NDVI en
  pasto denso.
- **Dice donde y cuando, nunca por que.** El NDVI te manda a caminar al lugar correcto; el diagnostico
  lo hace el sensor o la persona.

## 4. El dron con camara termica de USD 2.000

**Para que sirve una termica, de verdad:**

| uso | por que funciona |
|---|---|
| **Estres hidrico antes de que se vea** | una planta bien regada **transpira y esta mas fria** que el aire; una estresada cierra estomas y **se calienta**. Es el indice CWSI, y detecta antes que el marchitamiento y antes que el NDVI |
| **Encontrar goteros tapados y perdidas** | un gotero tapado deja **un punto caliente**; una perdida, uno frio. **Es el modo de falla de tu propio producto, hecho visible** |
| **Mapa de heladas** | el aire frio se acumula en los bajos. Relevante en La Colmena, donde las heladas estan documentadas |

**Y las tres razones por las que no la compres ahora:**

1. **USD 2.000 son ~Gs 16,5 millones: mas que TODO tu capital de Gs 12 M.** Y resuelve un problema
   diagnostico que todavia no tenes, porque todavia no tenes cultivo bajo riego que diagnosticar.
2. **Preguntar si es radiometrica, y a ese precio probablemente no lo sea del todo.** Una termica **no
   radiometrica** da una imagen linda con temperaturas **relativas** -- inservible para CWSI. Una
   radiometrica da temperatura por pixel, y en esa gama la exactitud absoluta anda en **±2 a 5 °C**.
   **El CWSI trabaja con diferencias de 1 a 3 °C.** El instrumento es del orden del efecto que quiere
   medir.
3. **La termica sin referencia no compara entre vuelos.** Para un CWSI usable hace falta temperatura y
   humedad del aire **del mismo momento** -- la estacion -- y superficies de referencia. Y hay que
   volar **cerca del mediodia solar, con cielo claro, poco viento y rapido**, porque las condiciones
   cambian mientras volas.

### El argumento que decide: el dron resuelve ESCALA y ACCESO, y no tenes ninguno de los dos

```
120 ha de pasto   ->  Sentinel-2 lo cubre GRATIS y bien
1.000 m2          ->  lo caminas en dos minutos
el patio          ->  lo tocas con la mano
```

**En el patio un dron es absurdo.** Una camara fija en un poste hace mas, porque **filma siempre** en
vez de una vez por semana.

### Y la alternativa barata que es MEJOR para lo que necesitas ahora

| | precio | que da |
|---|---|---|
| Dron con termica | **~USD 2.000** | un mapa **una vez por semana**, si el clima deja volar |
| **MLX90640** (matriz termica 32x24) fija sobre un bloque | **~USD 50** | **temperatura de canopia CONTINUA, 24/7, logueada** |
| Termica para telefono (FLIR One, Seek) | ~USD 200-400 | inspeccion a mano, sin vuelo |

> **Un sensor barato que loguea siempre le gana a uno caro que muestrea poco.** Para aprender la
> relacion entre temperatura de canopia, EC, luz y rendimiento -- que es lo que estas tratando de
> aprender -- **una serie continua de un bloque vale mas que doce fotos del año.**

**Cuando SI vale el dron**: cuando haya **clientes con 50 a 200 ha de cultivo de valor que paguen por
diagnostico**. Ahi el dron es un **servicio que se factura**, no un gasto. Y para ese dia, **el esquema
ya esta listo**: `indice_espacial` tiene `fuente = dron` y `resolucion_m` desde el primer diseño, y el
agregado por parcela con puntero al archivo. **No hay que rehacer nada.**

## Lo que hay que decidir

- **`medicion` angosta o ancha.** Es el hueco real de este documento y **bloquea la Fase 1**.
- **Cuanta cuota consume** una consulta de Statistical API por parcela y fecha, antes de automatizar.
- **`solucion_nutritiva` y `bloque_experimental`**: entran al esquema de la Fase 1 o quedan para una
  ficha aparte de hidroponia.
- **Si se usa NDRE ademas de NDVI** en el pasto. Sentinel-2 tiene las bandas; es una linea de
  evalscript.
