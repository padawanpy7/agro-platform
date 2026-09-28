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

## 3b. Se puede traer la serie de 5 años? Se puede traer NUEVE -- y eso cambia el calendario de ML

**Si, y mucho mas de lo que se pidio.**

| | desde cuando | resolucion |
|---|---|---|
| Sentinel-2 **L1C** | **junio 2015** (lanzamiento del 2A, el 23/06/2015) | 10 m |
| **Sentinel-2 L2A global** | **enero 2017** | 10 m |
| Revisita de **5 dias** (con el 2B, lanzado 07/03/2017) | **marzo 2017** | 10 m |
| **Landsat** | **1984** | 30 m |

Fuentes: [Sentinel-2 (Wikipedia/ESA)](https://en.wikipedia.org/wiki/Sentinel-2),
[USGS EROS](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-sentinel-2),
[disponibilidad global 1984-2023](https://www.sciencedirect.com/science/article/pii/S2352340924010163).

**A septiembre de 2026 eso son ~9 años y 9 meses de L2A**, con revisita de 5 dias desde 2017.

> **Y para la pregunta de degradacion de potreros, Landsat a 30 m sirve igual**: 120 ha son ~1.333
> pixeles a 30 m. **Cinco años pueden no mostrar una tendencia; cuarenta la muestran sin discusion.**
> Sentinel para el detalle reciente, Landsat para la tendencia larga.

### Cuanto ocupa ese historico? Casi nada, y por eso se trae ENTERO el primer dia

```
Revisita 5 dias              ->  ~73 pasadas/año
Menos nubes (Paraguay)       ->  ~30 a 45 fechas usables/año
10 potreros x 40 x 10 años   ->  ~4.000 filas
100 parcelas x 40 x 10 años  ->  ~40.000 filas
```

**Son unos pocos miles de filas.** Los gigabytes son los rasters, y el diseño ya decidio **no
guardarlos**. Guardar el agregado por parcela hace que **el historico completo de toda la tierra
entre en una tabla chica**.

> **No hay ninguna razon para empezar desde hoy. Se hace backfill de los diez años el primer dia.**

### Y aca esta lo que de verdad importa

El [proposal.md](../proposal.md) dice que **"entrenar sin historico propio es inventar"**, y que esta
ficha *"construye el dataset y deja el lugar donde el modelo se va a enchufar"*. Eso asumia **esperar
años** a que los sensores acumulen.

> **Pero el satelite lleva nueve años acumulando historico sobre esa misma tierra, gratis, y es
> retroactivo. No hay que esperar: el dataset espacial ya existe y se baja en un rato.**

**Con la honestidad correspondiente**: es historico de **vigor vegetal**, no de humedad de suelo, ni de
eventos de riego, ni de rendimiento. **Es el esqueleto espacio-temporal, no el dataset completo.** Lo
que falta es justamente lo que los sensores y `campania` van a aportar.

### Que se puede hacer HOY con esos nueve años, sin una sola etiqueta

Todo esto es **no supervisado**: no necesita saber cuanto rindio nada.

| analisis | que contesta | valor |
|---|---|---|
| **Zonificacion estable**: promedio por pixel sobre 9 años | los pixeles que estan **SIEMPRE** bajos son problema de **suelo o terreno**, no de clima | **el de mas valor.** Separa el problema **permanente** del **pasajero**, y dice **donde poner el sensor** y donde no invertir |
| **Banda historica de percentiles** por semana del año | si el NDVI de esta semana esta dentro o fuera de lo normal de esa semana | deteccion de anomalias **sin ML**, solo percentiles |
| **Pendiente del pico anual** a lo largo de los años | **cual potrero se degrada**, 1% por año | no se ve mirando: baja demasiado despacio |
| **Fenologia por campaña**: fecha de emergencia, fecha de pico, **integral bajo la curva** | biomasa acumulada del ciclo | la integral es lo que mejor correlaciona con rendimiento |
| **NDVI cruzado con lluvia historica** | **cuanto cae ESE potrero por mm que no llovio** | sensibilidad a sequia **por potrero**: dice cual descargar primero en un año seco |

**Lo que NO se puede hacer todavia: predecir rendimiento.** Eso necesita la **etiqueta** -- kilos
cosechados -- y de eso no hay historico. **El capataz puede tener registros de su chacra**, y
`campania` esta diseñada exactamente para guardarlos.

### Dos cosas que hay que agregar a `indice_espacial`, y la API ya las da

**1. La fraccion de pixeles validos.** La Statistical API devuelve **`sampleCount` y `noDataCount`**
por intervalo, ademas de min, max, media y desviacion.

> **Una media de NDVI calculada sobre 3 pixeles validos porque las nubes taparon el resto se ve
> IDENTICA a una buena.** Sin guardar `sampleCount` y `noDataCount`, **dentro de dos años no hay forma
> de distinguirlas** -- y es exactamente la clase de error irreversible que la regla 1 del contrato
> prohibe. `design.md` lista media, p10, p90 y coeficiente de variacion; **falta esto.**

**2. La version del evalscript.** El evalscript es la formula del indice y de la mascara de nubes.

> **El evalscript ES la calibracion del satelite.** Si mañana se cambia la formula o la mascara, hay
> que saber que filas salieron de que version -- igual que `medicion.calibracion_id`. Se cierra la
> vigente y se inserta otra; **nunca se edita**. Con eso el historico **se puede recalcular**; sin eso,
> se mezcla y se pierde.

### Detalles de la API que conviene saber antes de programar el backfill

- **`aggregationInterval` minimo de un dia** (`P1D`, `P5D`, `P30D`). Para fenologia conviene `P1D` o
  `P5D`; para tendencia larga, `P30D` baja mucho el consumo.
- **`lastIntervalBehavior`**: `SKIP` por default descarta el ultimo intervalo incompleto. Con
  `SHORTEN` o `EXTEND` no se pierde el tramo final.
- **Filtro de nubosidad por tile** (`maxCloudCoverage` en %): por ejemplo 20 usa solo tiles con hasta
  20% de nubes. **Ojo: es del tile entero, no de la parcela** -- una parcela despejada dentro de un
  tile nublado se descarta igual. Por eso hace falta igual el `noDataCount`.
- **La cuota se reinicia el dia 1 y no se acumula**: conviene hacer el backfill de diez años **en un
  mes** y despues solo el incremental.

Documentacion: [Statistical API](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Statistical.html).

## 3c. Y si solo tengo la ubicacion de la casa, sin el poligono?

**Un punto solo NO sirve. Una mensura NO hace falta. Lo que se necesita esta en el medio, y se consigue
gratis esta semana.**

### Por que el punto solo no alcanza

Un punto es **un pixel de 10 x 10 m**. La Statistical API necesita una geometria, asi que la unica
salida seria **un circulo alrededor del punto** -- y un circulo sobre un establecimiento **mezcla
potreros, monte, casco, caminos y tajamar**.

> **La media de esa mezcla no significa nada, y es peor que no tenerla: sale un numero, y un numero se
> cree.** Una serie de nueve años calculada sobre un circulo arbitrario parece un dato y no lo es.

### Pero una mensura tampoco hace falta

Con pixeles de 10 m, **errar el limite por tres o cinco metros da lo mismo**. Lo que **no** da lo mismo
es meter adentro el monte, el camino o el casco. El criterio no es precision legal:

> **El poligono es suficiente cuando todos los pixeles de adentro pertenecen a la MISMA unidad de
> manejo.** Nada mas que eso.

### Tres formas de conseguirlo sin agrimensor, de mas barata a menos

| | como | precision | cuando |
|---|---|---|---|
| **1. Dibujarlo sobre la imagen satelital** | Google Earth (dibujar y exportar KML), QGIS con fondo satelital, geojson.io o el EO Browser de Copernicus | mas que suficiente | **esta semana, desde la ciudad, gratis** |
| **2. Caminar o recorrer el perimetro con el telefono** | cualquier app de GPS que exporte GPX o KML | **3 a 10 m** | **el sabado que ya se va a ir** |
| **3. El plano del establecimiento** | **preguntarle al señor si lo tiene** -- un campo titulado suele tenerlo | definitiva | una pregunta, gratis |

**La 1 es la que desbloquea todo hoy**, y la 2 la corrige. La 3 conviene preguntarla igual porque es
gratis y puede ahorrar las otras dos.

> **Y los potreros se VEN desde arriba**: los alambrados, las lineas de arboles, las huellas y el cambio
> de vegetacion marcan los limites. Con **nueve años de imagenes**, el manejo distinto de cada potrero
> deja firmas distintas, **y los limites se dibujan solos**. Si no se sabe donde estan los potreros, la
> propia serie los muestra.

### Empezar con UN poligono grueso, y subdividir despues

**No hace falta tener los potreros para arrancar.** El perimetro del establecimiento, dibujado a ojo
sobre la imagen, **ya da**:

- el vigor total y su serie de nueve años,
- las anomalias contra la banda historica,
- la sensibilidad a la sequia,
- y la **zonificacion estable**, que es la que **muestra donde estan las zonas distintas** -- o sea, la
  que ayuda a dibujar los potreros despues.

**Lo unico que exige los potreros por separado es la decision operativa** -- *"mové la hacienda al
potrero 3"* --. Todo lo demas funciona con el limite de afuera.

### La consecuencia de diseño, y hay que anotarla

`parcela.geom` es `geometry(Polygon, 4326)`: **un punto no entra**, asi que o no se crea la parcela
hasta tener poligono, o se acepta uno provisorio.

**Si se acepta uno provisorio, hay que versionarlo.** El diseño dice que si el cliente corrige el
limite *"todo se recalcula solo"*, y eso es cierto para `ST_Contains` -- que dispositivos caen adentro
--. **Pero NO es cierto para `indice_espacial`**: esas filas las calculo una API externa **contra un
poligono concreto**, y corregir el limite **no las recalcula**: hay que volver a pedirlas.

> **El poligono es la calibracion del dato espacial**, igual que `calibracion` lo es del sensor y el
> evalscript lo es del satelite. **Sin saber contra que version de la geometria se calculo cada fila,
> corregir un limite invalida el historico en silencio.**

Va a la lista de agregados de `indice_espacial`: **`geom_version`**, mas un estado `provisorio` en
`parcela`.

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
- **Agregar a `indice_espacial`: `sample_count`, `no_data_count`, `evalscript_version` y `geom_version`.** Los dos
  primeros los devuelve la API y sin ellos no se distingue una media buena de una calculada sobre tres
  pixeles; el tercero es el `calibracion_id` del satelite. **Entra en la Fase 1, con la migracion.**
- **Si el backfill arranca en 2017 (L2A global) o en 2015 (L1C).** L2A viene corregido
  atmosfericamente; L1C no, y mezclarlos sin decirlo ensucia la serie. **Recomendacion: L2A desde
  2017, y si hace falta ir mas atras, Landsat -- pero en una `fuente` distinta, nunca mezclado en la
  misma serie.**
