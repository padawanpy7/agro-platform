# Proposal: riego-de-precision

producto agro multi-cliente: riego por goteo autonomo, con el dato preciso para ML

> **Estado: en la compuerta del dueño.** Esto es la fase 1 del SDD -el objetivo, y nada mas-. El
> `design.md` y el `tasks.md` se escriben DESPUES de que esto se apruebe.

> Los dos diagramas que acompañan a esta ficha viven en `desarrollo/diagramas/`:
> la infraestructura completa (del sensor enterrado al VPS) y el modelo de datos.

## Que cambia

Hasta hoy este repo construyo **una plataforma**: un VPS con k3s, GitOps, admision y red cerrada.
No corre ningun producto propio arriba -`primavera-nati` es de un tercero-. Esta ficha abre el
**primer producto del dueño**, y es lo que justifica todo lo anterior.

El producto es un **sistema de agricultura de precision multi-cliente**, vendido como
**instalacion + suscripcion a la app + mantenimiento**. Cuatro lineas, en este orden:

| # | Linea | Que hace | Rol |
|---|---|---|---|
| 1 | **Riego por goteo** | mide humedad enterrada y riega lo justo | **el caballo de batalla** |
| 2 | **Estacion meteorologica** | clima del lote: lluvia, temperatura, viento, humedad | alimenta 1 y 4 |
| 3 | **Trampa de plagas** | conteo de capturas por fecha y punto | alerta temprana |
| 4 | **Imagen satelital** | NDVI por parcela desde Sentinel-2 | estado del terreno, sin hardware |

**Los cultivos objetivo, decididos el 25/09/2026: horticultura y frutales. Soja NO.** El analisis
esta en `MERCADO.md`; el resumen es que el tomate factura **26 veces mas por hectarea** que la soja
y que instalar goteo en soja cuesta **3 a 4 años del bruto entero** del cultivo. Ademas horticultura
y frutales estan **desatendidos** en Paraguay, mientras que en extensivo compiten Kilimo -que ya
opera aca-, Solinftec, Agrosmart y las multinacionales. **La ventaja de este proyecto es estar donde
no hay nadie.**

La **parcela es la unidad de analisis**: un poligono PostGIS al que se le atan las mediciones, los
analisis de suelo, el NDVI, las capturas y los eventos de riego. Todo lo demas cuelga de ahi.

## Por que

Tres razones, y ninguna es "queda lindo":

1. **Sequia.** El goteo no se vende como automatizacion sino como **ahorro de agua**: regar por lo
   que el suelo mide, no por un programa horario. Es el argumento comercial y el tecnico a la vez.
2. **El dato es el activo.** El objetivo declarado del dueño es **ML sobre el historico**: predecir
   riego, rendimiento, plaga y nutricion. Eso condiciona TODO el diseño, porque
   **un dato que se guarda mal no se arregla despues**. De nada sirven GB de historico que no se
   puedan usar.
3. **Un solo sistema.** El punto final es tener en un unico lugar **todo lo que hace crecer a una
   planta** -agua, clima, suelo, nutrientes, plagas, estado foliar-. Hoy eso esta repartido en
   planillas, cuadernos y memoria de gente.

## Objetivo y no-objetivos

- **Objetivo**: que una parcela con goteo instalado **riegue sola y bien**, y que cada decision de
  riego quede registrada con el dato que la causo.
- **Objetivo**: que el lazo de control **viva en el campo**. El controlador decide con lo que mide
  aunque lleve dias sin señal; la nube manda la **politica** (umbrales, ventanas), **nunca** el
  abrir y cerrar de una valvula. El gateway es independiente del controlador: si el gateway muere,
  el riego sigue.
- **Objetivo**: **no perder precision**. El dato se guarda como llego -crudo y calibrado, sin
  promediar en la ingesta-, con la hora de **medicion** y la hora de **llegada** separadas, y con
  el punto geografico de donde salio. Eso es lo que hace entrenable el historico.
- **Objetivo**: multi-cliente de verdad desde el dia 1. Un cliente no puede ver la parcela de otro,
  y eso se hace cumplir en la base, no en el front.
- **No-objetivo (por ahora)**: app movil nativa. La fase 1 de la app es **consultar y pedir
  reportes**; eso es web. El offline que importa es el del **campo**, no el del telefono.
- **No-objetivo (por ahora)**: fertirriego y recomendacion de nutrientes. Es la continuacion natural
  -la valvula ya esta puesta-, pero entra cuando el goteo este andando y con datos.
- **No-objetivo (por ahora)**: modelos de ML en produccion. Esta ficha **construye el dataset y
  deja el lugar donde el modelo se va a enchufar**. Entrenar sin historico propio es inventar.
- **No-objetivo**: vender los 4 productos a la vez. El goteo primero, entero, con un cliente real.

## Lo que ya esta decidido y condiciona el diseño

No son propuestas: son decisiones tomadas y restricciones heredadas.

1. **Stack: Python + FastAPI en el backend, Next.js en el front.** Decision del dueño; el codigo lo
   escribe la IA. Python ademas es donde vive el ecosistema de ML que es el objetivo final.
2. **Base de datos: PostgreSQL con TimescaleDB + PostGIS.** Una sola base. Timescale porque el 90%
   del volumen es serie temporal; PostGIS porque **la geometria es la que ata todo** -la medicion
   vale por el punto donde se midio, y la parcela es un poligono-. Separar series y geometria en
   dos motores rompe la consulta que el ML necesita.
3. **Multi-cliente por `tenant_id` + Row-Level Security de Postgres**, no un namespace por cliente.
   El aislamiento se hace cumplir en el motor: una query sin tenant no devuelve filas. Un namespace
   por cliente multiplica la operacion por N y no protege la base, que es donde esta el dato.
4. **Transporte: LoRaWAN del sensor al gateway, MQTT con QoS 1 del gateway al VPS.** El gateway hace
   **store-and-forward**: si no hay señal, encola y reenvia; el backend deduplica por
   (dispositivo, hora de medicion).
5. **Corre sobre la plataforma que ya existe.** Lo que corre se declara en `environments/` y lo
   reconcilia Argo CD; la admision de la Fase 4 exige imagen por digest, version fija, registry en
   allowlist y `requests/limits`; la red es default-deny, asi que **cada flujo nuevo -MQTT entrante,
   Sentinel-2 saliente- es una CCNP declarada en git**, no un puerto que se abre.
6. **El disco es el cuello.** El 07/09 el `fsync` se fue a 3 segundos. Una base de series temporales
   es la carga mas pesada que este VPS habra visto: la retencion y la compresion se eligen contra
   `await` **medido**, con la serie que deja la Fase 5.

## Hoja de ruta: que se agrega despues, y en que orden

El goteo es la fase 1. Todo esto se apoya en lo que esa fase deja instalado, y el orden sale de
**cuanto valor da contra cuanto falta poner**, no de que suena mejor.

### Casi gratis: software sobre el hardware que ya va a estar

| | que da |
|---|---|
| **Evapotranspiracion (ETo)** | de la estacion meteorologica, con Penman-Monteith. Convierte el riego de **reactivo a predictivo**: se riega antes de que el suelo baje, no despues |
| **Balance hidrico** | entradas (riego + lluvia) menos salidas (ETo). Es EL modelo del riego de precision y sale de datos que ya se guardan |
| **Grados-dia acumulados** | predice fenologia: cuando florece, cuando cosechar. Solo necesita temperatura |
| **Alerta de helada** | la estacion ya mide temperatura |
| **Litros por kilo cosechado** | `riego_evento` cruzado con el rendimiento de `campania`. Es el KPI agronomico de verdad |

### Un sensor mas, en el nodo que ya esta

- **Humedad a varias profundidades (10 / 30 / 60 cm).** La mas importante de la lista: dice si el
  agua **paso de largo la zona radicular**, que es agua tirada. Es la medicion que **prueba** el
  sobre-riego en vez de suponerlo.
- **Presion en la linea.** Detecta tapado y fuga antes que el caudal, porque la presion cae primero.
- **Conductividad electrica (EC) del suelo.** El sensor SE01 elegido **ya la mide**: da salinidad y
  es la base del fertirriego.

### Producto nuevo

- **Fertirriego.** Inyectar fertilizante en la linea de goteo, controlado por la EC que el sensor ya
  lee. La valvula y la lectura ya estan puestas. **Es el mayor valor por hectarea de toda la lista**
  y es el camino hacia el objetivo declarado: todo lo que hace crecer a una planta en un solo sistema.
- **Camara en la trampa + vision.** Conteo automatico de plagas; reemplaza la foto manual de la fase 1.

### Drones: como encajan, y cuando (cerrado el 25/09/2026)

**Decision del dueño: entran cuando haya mas capital y mas clientes.** Abajo queda la ficha
completa para no volver a investigarlo.

#### Que ve el dron que NO ven ni el sensor ni el satelite

| | resolucion | frecuencia | que ve |
|---|---|---|---|
| Sensor enterrado | **un punto** | cada 15 min | la verdad, pero de UN punto |
| Sentinel-2 | 10 m/pixel | cada 5 dias, si no hay nubes | la tendencia del lote |
| **Dron** | **2-5 cm/pixel** | cuando uno quiera | **la variabilidad DENTRO del lote** |

El aporte unico del dron es **espacial**: el sensor dice la verdad en su punto, el dron dice **si
ese punto representa a la parcela**.

**Y de ahi sale su mejor uso, que no es el que uno imagina: el dron dice DONDE enterrar los
sensores.** Es la misma pregunta que la prueba de los dos sensores a un metro -"cuantos hacen falta
por hectarea"-, contestada para el lote entero en un vuelo. Un vuelo antes de instalar ahorra
sensores mal puestos, que es el error mas caro de deshacer.

#### Las tres camaras, y cual sirve para que

| camara | que da | para que |
|---|---|---|
| RGB | ortomosaico | limites de parcela, conteo de plantas, documentacion |
| **Multiespectral** (Green, Red, RedEdge, NIR) | NDVI y NDRE reales | vigor, nitrogeno, enfermedad temprana |
| **Termica** (radiometrica) | temperatura del dosel -> **CWSI** | **estres hidrico y auditoria del riego** |

**El dato que cambia la compra: el DJI Mavic 3M -el multiespectral- NO tiene camara termica.** Son
dos equipos distintos. Y **lo que mas nos sirve -auditar el riego- necesita la TERMICA**, no la
multiespectral. Comprar el 3M pensando que hace las dos cosas es el error clasico.

El **CWSI** (Crop Water Stress Index) va de 0 -sin estres- a 1 -estres maximo- y se calcula
comparando la temperatura del dosel contra la del aire. El riego guiado por termografia reduce el
consumo de agua **15-25%** segun experiencias de campo en la cuenca mediterranea.

#### Como se toma la medicion

1. **Plan de vuelo sobre el poligono de la parcela** -que ya esta en PostGIS: el plan sale de la
   base, no se dibuja a mano-.
2. **Vuelo automatico**: 43-45 min, hasta **200 ha por mision**.
3. **RTK** georreferencia cada imagen **sin puntos de control en el piso**.
4. **Sensor de irradiancia solar**: compensa la luz del dia. **Es lo que hace comparables dos vuelos
   de fechas distintas** -sin eso, un dia nublado y uno despejado dan indices que no se pueden
   poner en la misma serie, y una serie que no se puede comparar no sirve para ML-.
5. **Procesamiento**: ortomosaico + indice. Comercial (Pix4Dfields, DroneDeploy) o **OpenDroneMap**,
   que es gratis y es trabajo.
6. **Recorte por parcela con PostGIS** y carga.

#### Como entra al modelo de datos

**No es una tabla nueva.** `indice_satelital` se generaliza a **`indice_espacial`** con dos columnas
mas: `fuente` (`sentinel2` | `dron`) y `resolucion_m`. Un NDVI de satelite y uno de dron son el
mismo tipo de dato a distinta escala, y separarlos en dos tablas rompe la consulta que los quiere
juntos.

**Lo que se guarda NO es el raster.** Un vuelo produce gigabytes; la base guarda el **agregado por
parcela** -media, p10, p90 y **coeficiente de variacion**- y un puntero al archivo en
almacenamiento de objetos.

**El coeficiente de variacion es el numero que mas vale**: es la respuesta a "esta parcela es
uniforme?". Si es bajo, un sensor alcanza. Si es alto, hay que poner mas **y el mapa dice donde**.

#### Cuanto cuesta

| | USD |
|---|---|
| DJI Mavic 3M -- multiespectral + RGB, RTK, 200 ha/mision | **5.729** |
| DJI Mavic 3T -- termica radiometrica 640x512 | **6.809** |
| **Los dos** | **~12.500** |
| Software de procesamiento comercial | ~2.000/año, o **0 con OpenDroneMap** |
| Seguro de responsabilidad civil | **obligatorio** (ver abajo) |

> DJI reemplazo la linea Mavic 3 Enterprise por la serie Matrice 4 en enero de 2025. El M3T sigue
> disponible en distribuidores, pero **hay que verificar disponibilidad y sucesor antes de comprar**.

**Contra el presupuesto de hoy**: el piloto entero son ~1.700 USD. El dron solo es **3 a 7 veces
todo el capital disponible**. Por eso se posterga, y es la decision correcta.

#### Lo regulatorio en Paraguay

**DINAC R1103** (Resolucion 2170/2017) regula RPA/RPAS. Lo que aplica a un uso comercial:

- **Se necesita autorizacion previa de DINAC.** La excepcion es solo para uso recreativo.
- **Poliza de seguro OBLIGATORIA** por daños a terceros en superficie: sin ella no se autoriza la
  circulacion.
- Ademas intervienen la Fuerza Aerea (espacio aereo), DIGEMABEL (equipos de doble uso) y la Policia
  Nacional (fiscalizacion).

**Hay un proyecto de ley en tratamiento** que elevaria la normativa de resolucion a ley. Verificar
el estado antes de operar.

#### Herramienta o servicio: son dos negocios

- **Como herramienta** (lo usamos nosotros): ubicar sensores en la instalacion y auditar el riego.
  Es un costo que mejora el servicio y reduce visitas.
- **Como servicio** (se lo cobramos al cliente): un vuelo por campaña, con informe. Es una linea de
  ingreso nueva.

**Empezar como herramienta y tercerizando el vuelo.** Ya hay operadores en la region que vuelan por
hectarea; se les paga hasta que el volumen justifique el equipo.

#### El disparador para comprarlo

No es una fecha ni una sensacion. **Un Mavic cubre 200 ha por mision.** Por debajo de **~200 ha bajo
gestion**, el equipo esta parado la mayor parte del mes y el vuelo tercerizado sale mas barato que
amortizarlo.

> **Se compra cuando haya ~200 ha bajo gestion** -que es tambien cuando el ingreso recurrente
> empieza a poder absorberlo-. Hasta ahi, se terceriza.

### El orden

1. Profundidades multiples -barato, y prueba el ahorro, que es el agujero comercial de hoy-
2. ETo + balance hidrico -software puro, cero hardware-
3. Fertirriego -el salto de valor por hectarea-
4. Dron termico tercerizado -cuando haya clientes que auditar-

## Lo que NO existe todavia

Para que nadie confunda el diagrama con la realidad. De todo lo de arriba, **hoy corre unicamente
el VPS**: k3s, Cilium, Argo CD, Traefik, la admision y el candado de Cloudflare. **No existe**:
ningun sensor, ningun gateway, ningun controlador, ningun broker MQTT, ninguna base del producto,
ninguna app. La parte de campo del diagrama es **el objetivo**, no un inventario.
