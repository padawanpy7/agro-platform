# Preparado para ganaderia: el nombre, el GPS, y que tiene que aguantar el esquema

**28/09/2026.** Tres pedidos del dueño en un mensaje: **el producto no es riego de precision**, en esta
fase es solo agricultura **pero el esquema tiene que aguantar ganaderia**, y una lista concreta de lo
que quiere para el ganado.

## 1. El nombre: tiene razon, y "agronomia" todavia se queda corto

**"Riego de precision" es el nombre de UNA linea, no del producto.** El
[proposal.md](../proposal.md) ya declara cuatro -- riego, estacion meteorologica, trampa de plagas e
imagen satelital -- y el riego es *"el caballo de batalla"*, no el todo.

**Pero si tiene que abarcar ganaderia, "agronomia de precision" tampoco alcanza**: la agronomia es de
las plantas. La palabra que incluye las dos en el Paraguay es **agropecuaria**.

| nombre | que abarca |
|---|---|
| Riego de precision | una linea |
| **Agronomia** de precision | los cultivos |
| **Agropecuaria** de precision | **cultivo Y ganado** -- que es lo que el dueño acaba de describir |

**Decision del dueño**, y hay que separar dos cosas que se confunden:

- **El nombre del PRODUCTO** -- cambiarlo es reescribir el encabezado del `proposal.md` y poco mas.
- **El nombre del TICKET** (`cambios/riego-de-precision/`) -- es un identificador, y renombrar la
  carpeta **rompe decenas de enlaces** en toda la ficha. **Recomendacion: dejar el ticket como esta y
  cambiar el producto.** Un ticket se llama como se llamaba el dia que se abrio; eso no es deuda, es
  historia.

## 2. El GPS de auto: si se puede, y CORRIJO lo que escribi antes

**El dueño pregunto por los rastreadores GPS de vehiculo. Son mas baratos de lo que yo habia
supuesto**, y eso mueve una cuenta que di por cerrada en
[economia/ganaderia.md](../economia/ganaderia.md).

| | precio en Paraguay | fuente |
|---|---|---|
| Rastreador GPS en tiempo real | **Gs 250.000 - 270.000** | [Clasipar](https://clasipar.paraguay.com/motor/repuestos-y-accesorios/rastreador-gps-tracker-en-tiempo-real-939050) |
| **Mini GPS a chip** para auto y moto | **Gs 85.000** (unitario), **Gs 70.000** mayorista | [Clasipar](https://clasipar.paraguay.com/electronica/otros-electronica/mini-gps-rastreador-a-chip-p-auto-moto-2294716), [FERTEC](https://www.fertec.com.py/products/gps-rastreador-a-chip-para-auto-y-moto) |
| Consumo de datos | **~20 MB/mes**, SIM prepaga o plan | idem |

**Y traen de fabrica exactamente lo que el dueño pidio**: geocerca, alarma de movimiento e historial
de recorridos. No hay que programarlo.

> **La correccion:** yo habia escrito que *"cualquier dispositivo activo por animal queda afuera"*
> tomando el nodo LoRa a **Gs 290.000**. A **Gs 70.000-85.000** el aparato **ya no es el problema**.
> **Lo que no baja es el chip.**

### Los tres problemas, y el tercero es el que decide

| | por que |
|---|---|
| **1. Energia** | esta hecho para los **12V del auto**. A bateria sola dura dias, no meses. En una vaca pide solar y bateria, y eso le devuelve el tamaño y el precio |
| **2. Una SIM POR ANIMAL** | son 20 MB/mes cada uno. **A 130 cabezas, aunque el chip salga Gs 10.000/mes, son Gs 1,3 millones POR MES -- Gs 15,6 millones al año, para siempre.** Eso es exactamente el costo recurrente que LoRa no tiene |
| **3. Donde no hay señal, no reporta** | y la cobertura celular **baja justo en el campo**; en el Chaco es limitada fuera de los centros ([Tigo](https://www.tigo.com.py/movil/cobertura), [nPerf](https://www.nperf.com/en/map/PY/-/-/signal)) |

**Veredicto: el GPS de auto SI sirve -- para tres a cinco animales guia en campo abierto**, con la
geocerca de fabrica. **No para las 130**, y el motivo cambio: **ya no es el precio del aparato, es el
chip mensual y la cobertura.**

### Y la vuelta que importa: en un CORRAL, el GPS no es la herramienta

El dueño pidio *"las vacas en un corral en tiempo real"*. **Eso no es un problema de GPS:**

1. **Un corral es chico y el GPS tiene 3 a 5 metros de error.** Eso es el corral entero: el punto no
   dice nada util.
2. **En un corral hay energia cerca** y los animales **pasan por lugares fijos**: comedero, bebedero,
   manga.
3. Entonces la respuesta correcta es **lectura en punto fijo** -- caravana leida al pasar --, que es
   justo lo que ya esta escrito en [economia/ganaderia.md](../economia/ganaderia.md) y **cuesta
   Gs 1.000-3.000 por animal en vez de Gs 85.000 mas chip**.

> **El GPS es para el campo abierto. La caravana es para el corral.** Y la pregunta *"donde esta la
> vaca"* en un corral casi nunca es la pregunta real: la real es **"comio, tomo agua, cuanto pesa"**,
> y eso se lee en el punto fijo, no en el aire.

## 3. Lo que el dueño quiere para el ganado, contra lo que su propio repo ya midio

Pidio: **control de vacunas, registro de lo que come cada vaca, evolucion de peso, que se le dio de
comer hoy, y el dato al ML para optimizar el engorde.**

> **Advertencia que sale de [economia/ganaderia.md](../economia/ganaderia.md), y hay que tenerla
> presente antes de construir**: en **software de gestion ganadera SI hay competencia madura**.
> **GanApp** ya cubre sanidad, pesajes, movimientos y lectura RFID, con prueba gratis de 30 dias, mas
> Control Ganadero, BovControl, VacAPP, Huella y GanSoft. **Entrar a competir con un registro de rodeo
> es entrar tarde y por abajo.**

**Pero el dueño acaba de decir la diferencia sin nombrarla, y es real:**

| | GanApp y las demas | esto |
|---|---|---|
| El peso | **lo escribe el productor** | **lo mide una balanza** en el paso al agua |
| Lo que comio | **lo escribe el productor** | **lo mide el comedero** |
| El pasto del potrero | **nadie lo mide** | **satelite, gratis, 9 años hacia atras** |

> **La diferencia no es la funcionalidad: es quien produce el dato.** Un cuaderno digital contra un
> instrumento. Y el dato tipeado a mano **no sirve para ML** -- es esporadico, sesgado y se deja de
> cargar a las tres semanas. **El dato medido si.**

### Y la idea buena es la ultima, la que el dueño puso al final

> *"combinado con la agricultura que va a decir en que corral meter"*

**Eso es lo unico de toda la lista que nadie hace**, y sale de cruzar dos cosas que este proyecto ya
tiene: **el NDVI por potrero** (cuanto pasto hay, y su serie de nueve años) **con la ganancia de peso
por animal** (cuanto rindio ese potrero de verdad).

```
pasto medido por potrero  +  peso ganado por animal en ese potrero
                          =  a que potrero conviene mover, y cuantos dias
```

**Ninguna app de gestion puede hacer eso, porque ninguna mide el pasto.** Es la misma frase que ya
estaba escrita en `ganaderia.md` como el hueco -- y el dueño acaba de decir para que sirve.

## 4. Que significa "preparado para ganaderia", concreto

**No significa construirlo ahora. Significa no cerrarse puertas hoy.** Tres cosas alcanzan:

### 4.1 `medicion` ANGOSTA -- y este es el TERCER argumento independiente

La [pregunta 4](../PREGUNTAS.md) sigue abierta. Con ganaderia adentro, la respuesta se vuelve obvia:

| magnitud | de donde viene |
|---|---|
| humedad de suelo, temperatura, lluvia | riego |
| EC, pH, temperatura de solucion, nivel | hidroponia |
| **peso del animal, kilos consumidos, litros tomados** | **ganaderia** |

**Con la tabla ancha, el ganado son tres migraciones mas. Con la angosta, son tres FILAS de catalogo.**
Tres dominios distintos pidiendo lo mismo ya no es una preferencia de diseño: **es la respuesta.**

### 4.2 El animal es un objeto MOVIL, y es lo unico verdaderamente nuevo

`ganaderia.md` ya lo habia anotado: *"el animal es un objeto movil. El modelo necesita una entidad
nueva -- `animal`, con posicion en el tiempo -- que es **una hypertable mas, no un rediseño**"*.

**Lo que ya sirve tal cual:** `parcela` es un poligono, y **un corral ES una parcela chica**; el
`tenant_id` y la RLS; `dispositivo` como punto; `medicion` con crudo, calibrado y los dos relojes.

**Lo que hay que agregar el dia que se construya** -- y son pocas, y ninguna cambia lo existente:

| | que guarda |
|---|---|
| `animal` | la caravana, el nacimiento, la madre, el estado |
| `animal_ubicacion` | **hypertable**: en que parcela o corral estuvo, y desde cuando |
| `evento_sanitario` | vacunas y tratamientos, con fecha y producto |
| `racion` | que se le dio de comer, cuando y cuanto |
| `lote_animal` | el grupo que se maneja junto -- que es la unidad real del manejo, no el animal suelto |

**El peso NO necesita tabla propia: es una `medicion` mas.** Y esa es la prueba de que la tabla
angosta era la correcta.

### 4.3 La etiqueta de ML del ganado es la GANANCIA DE PESO

En cultivo la etiqueta es `campania` con *"cuanto rindio"*. **En ganaderia es kilos ganados por dia**,
por animal y por potrero.

**Sin esa etiqueta no hay optimizacion de engorde posible**, por mas sensores que se pongan --
exactamente el mismo problema que
[como-aprender-de-cada-ciclo.md](como-aprender-de-cada-ciclo.md): todo el mundo loguea la entrada y
nadie loguea la salida.

## 5. El mapa en dos niveles: la jerarquia YA existe, y le falta una geometria

Pedido del dueño: **el terreno completo y los sub-terrenos -- los potreros -- adentro del grande.**

**Buena noticia: el modelo ya lo tiene.** El [design.md](../design.md) declara `cliente` -> `campo`
(*"el establecimiento de un cliente"*) -> `parcela` (*"la unidad de analisis: un poligono"*). El campo
es el terreno completo y la parcela es el potrero. **La jerarquia estaba desde el primer diseño.**

**Lo que falta es una sola cosa, y es concreta:** en la tabla de las doce, `campo` figura como
**catalogo** y `parcela` como **catalogo + geometria**. O sea que **hoy el campo NO tiene poligono**.
Para dibujar el terreno completo en el mapa hace falta:

```sql
campo.geom  geometry(Polygon, 4326)   -- con indice GiST, igual que parcela
```

Mas una validacion que el motor puede hacer solo: **`ST_Contains(campo.geom, parcela.geom)`** -- un
potrero que se sale del campo es un error de carga, y conviene que salte al dibujarlo y no seis meses
despues.

### Y la trampa: la suma de los potreros NO es el campo

**Entre los potreros hay monte, caminos, el casco y el tajamar**, y eso es tierra real que no pertenece
a ningun potrero.

> **Consecuencia directa y facil de pasar por alto: si se mide NDVI del campo ENTERO, el monte
> contamina el numero.** Un establecimiento con 30 ha de monte da un "verdor" alto que **no es pasto** y
> que no se come ninguna vaca. **El NDVI que sirve para decidir es el del POTRERO, no el del campo.**

Por eso los dos niveles **no son el mismo dato a dos escalas: contestan preguntas distintas.**

| nivel | contesta | quien lo mira |
|---|---|---|
| **Campo** (terreno completo) | *"cuanta tierra tengo y donde termina"* -- contexto, limites, el dibujo general | el **dueño** |
| **Potrero** (sub-terreno) | *"a cual muevo la hacienda", "cual se degrada", "donde riego"* -- **es la unidad de decision** | el **capataz** y el dueño |

**Y eso ordena el mapa solo**: el campo es el **fondo**, los potreros son lo que **se toca**. El capataz
trabaja sobre potreros; el dueño necesita ver el conjunto.

**Ninguno de los dos se dibuja a mano si el dueño consigue el KML** -- el señor de La Colmena ya quedo
en armar los poligonos con Google Earth. **Ese KML trae los dos niveles**: el perimetro es el campo,
cada division es un potrero.

## Lo que hay que decidir

- **El nombre del producto.** Agronomia o agropecuaria, y si el ticket se renombra (recomendacion: no).
- **Si se compra UN rastreador GPS de Gs 85.000 para probar.** Es barato, trae geocerca de fabrica, y
  contesta con datos si la cobertura del campo alcanza. **Es la prueba mas barata de esta lista.**
- **Cuanto sale un chip de datos** de 20 MB/mes en Paraguay, prepago. Es el numero que decide si el
  GPS escala o queda para los animales guia.
- **Si hay corral con energia** en el campo de La Colmena, y si los animales pasan por un lugar fijo.
- **`campo.geom`**: agregarlo en la Fase 1 con la migracion, que es cuando sale gratis.
- **Nada de esto se construye antes de que el riego funcione.** Es preparacion de esquema, no una fase.
