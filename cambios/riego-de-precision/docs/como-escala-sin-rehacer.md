# Como escala sin rehacer: el metodo de riego como fila, y la geometria de las cañerias

**28/09/2026.** Dos planteos del dueño, y los dos apuntan a lo mismo:

> *"Si el goteo no se hace para arroz, ahi entra otro tipo de producto que igual puede utilizar el
> sistema de humedad y todo eso. Un poco de POO para escalar cuando se quiera sin cambiar mucho."*
>
> *"Para el goteo tambien se puede guardar la geometria de las tuberias y lineas? Ese es un dato
> importante tambien, o al menos eso creo yo."*

## 1. "Un poco de POO": la traduccion correcta es NO heredar, PARAMETRIZAR

**El instinto es correcto y es el mismo de la definicion de ERP**: lo que cambia entre el arroz y el
tomate **no es el sistema, es una pieza**. Pero en una base de datos, *"un poco de POO"* **no se hace
con una tabla por metodo** -- eso es herencia, y en SQL la herencia se paga en cada consulta.

**Se hace con una fila de catalogo.**

```
metodo_de_riego  ->  goteo | inundacion | aspersion | microaspersion | surco
```

Y de ahi sale la separacion que importa:

| | varia por metodo? | por que |
|---|---|---|
| **`medicion`** | **NO** | en tomate se mide humedad a 30 cm; en arroz se mide la **lamina de agua** sobre el lote. **Son dos magnitudes, no dos tablas** -- y es el **cuarto** argumento independiente para la [pregunta 4](../PREGUNTAS.md) angosta |
| **`parcela`** | **NO** | un lote de arroz es un poligono igual que un lote de tomate |
| **`campania`** | **NO** | *"que se puso, cuando, cuanto rindio"* vale para los dos |
| **`riego_evento`** | **NO** | *"que condicion habia, que decidi, con que politica, y que resulto"* **vale para cualquier metodo**. Cambia el contenido, no la forma |
| **`politica_riego`** | **SI, y es lo UNICO** | goteo: *umbral de humedad + ventana + duracion*. Arroz: *lamina objetivo + fecha de entrada y de salida del agua*. Surco: *turno* |
| **El actuador** | **SI** | una valvula de goteo, una compuerta de taipa, una bomba. Es `dispositivo` con otro `tipo` |

> **La regla que resume todo: LA POLITICA varia, EL EVENTO no.** Lo que se decide cambia de forma
> segun el metodo; **lo que se registro de esa decision tiene la misma forma siempre.** Y el evento es
> el que alimenta al ML, no la politica.

**Consecuencia practica**: la politica es **configuracion**, no medicion. Puede guardarse con una
forma por metodo -validada contra el metodo- sin romper nada, **porque no es el dataset**. El dataset
es `medicion` + `riego_evento` + `campania`, y esos tres **no cambian de forma nunca**.

**Y eso contesta el pedido**: agregar arroz **no toca ninguna tabla del nucleo**. Es una fila en
`metodo_de_riego`, una forma de politica, un tipo de dispositivo y una magnitud nueva. **Lo mismo que
agregar hidroponia o ganaderia, y por el mismo motivo.**

## 2. La geometria de las cañerias: si, y el dueño tiene razon en que importa

**Se puede, y PostGIS lo hace nativo.** `parcela` es un `Polygon`, `dispositivo` es un `Point`, y una
cañeria es una **`LineString`**.

```sql
tramo.geom  geometry(LineString, 4326)   -- con indice GiST, igual que el resto
```

**Y no es un adorno. Cinco cosas que solo se pueden con eso:**

| | sin la geometria | con la geometria |
|---|---|---|
| **Encontrar una fuga** | *"el caudalimetro mide 41% mas de lo esperado"*. **Y ahora que** | *"la perdida esta entre el cabezal y P3"*. **Es la diferencia entre un aviso y una orden de trabajo** |
| **Presion** | se estima a ojo | la perdida de carga **depende del largo y el diametro**, y el largo **sale solo** de la linea |
| **Que se riega al abrir esta valvula** | hay que acordarse | es un **recorrido por el grafo**: la valvula y todo lo que cuelga de ella |
| **No romperla con el tractor** | la principal va **enterrada y no se ve**. Se rompe una vez y se aprende | **queda dibujada**. Es de las cosas que mas se pierden cuando se va la persona que la instalo |
| **Reponer** | *"comprar cinta"* | **cuantos metros exactos**, por tramo |

### Pero hay DOS niveles, y conviene no confundirlos

| | que se guarda | que cuesta | que habilita |
|---|---|---|---|
| **A. La TOPOLOGIA** | que tramo cuelga de cual, de que diametro y de cuantos metros | **casi nada**: se escribe al instalar | presion, reposicion, **y sobre todo "que se riega al abrir esta valvula"** |
| **B. La GEOMETRIA dibujada** | la linea, con sus coordenadas | hay que recorrerla con el GPS del telefono o dibujarla sobre la imagen | **ubicar la fuga** y **no romperla** |

> **Recomendacion: la topologia desde el dia uno, la geometria opcional.** La topologia es la que
> permite **razonar** -- y es la que no se puede reconstruir despues, porque vive en la cabeza del que
> instalo --. La geometria se puede agregar cualquier dia, caminando con el telefono, **y un tramo
> puede tener largo sin tener linea dibujada.**

### Y una cosa que se olvida: la cinta es CONSUMIBLE

La cinta de goteo **se cambia**: se tapa, se rompe, se pincha. Entonces un tramo **no es una cosa
permanente, es una cosa con vida**:

```
instalado_en   -- cuando se puso
retirado_en    -- cuando se saco (NULL = esta puesto)
```

**Y no se borra, se cierra** -- igual que `calibracion` y por el mismo motivo: un evento de riego
viejo apunta al tramo que **habia en ese momento**, no al que hay hoy. Si el tramo se edita por
debajo, el historico empieza a mentir sobre por donde paso el agua.

**Y ahi hay un dato que hoy nadie tiene y que sale gratis de esto**: **cuanto dura una cinta de goteo
en la practica.** Es exactamente lo que el proveedor no te va a decir y lo que decide el costo real
por hectarea y por año.

## 3. Lo que esto agrega al esquema, y es poco

| tabla | que guarda |
|---|---|
| `metodo_de_riego` | catalogo: goteo, inundacion, aspersion, surco |
| `tramo` | **el caño o la cinta**: tipo (principal / portalaterales / lateral), diametro, largo, `geom` **nullable**, de que tramo cuelga, y su vida |
| *(`politica_riego` ya existe)* | se le agrega el metodo, y su forma pasa a depender de el |

**Ninguna toca el nucleo.** Es la misma prueba del documento del ERP: **escriben contra `parcela`,
`medicion` y `campania`, no se traen las suyas.**

## Sobre el desarrollo -- queda dicho una vez y no se repite

El dueño contesto la objecion de costo: **Claude remoto en paralelo mientras trabaja, y la hermana o
el compañero haciendo QA.** Es una respuesta valida y **cubre lo que faltaba**, que era quien revisa.

**Y hay una consecuencia practica que conviene aprovechar**: si el QA lo hace otra persona, **esa
persona necesita contra que probar** -- no puede adivinar si esta bien.

> **Para eso existe `HECHO_CUANDO.md`, y por eso se escribio antes de construir nada.** Los siete
> pasos del criterio de aceptacion de [api-de-control.md](api-de-control.md) **no son documentacion:
> son el guion que le pasas a quien hace QA**, y lo puede correr sin saber nada del codigo.

**Un QA sin criterio escrito encuentra lo que se ve. Con criterio escrito encuentra lo que importa** --
y los tres pasos que todo el mundo olvida (escribir con el tenant de otro, el token viejo despues de
la baja, y que el dato siga estando) **son justamente los que nadie prueba por su cuenta.**

## Lo que falta decidir

- **Si la politica se guarda con una forma por metodo** (validada) o si cada metodo lleva su tabla.
  Entra en la Fase 1 junto con el resto.
- **Si el arroz entra alguna vez.** Hoy esta descartado por agua ([economia/misiones-tajamar.md](../economia/misiones-tajamar.md)),
  y lo de arriba es para que **el dia que entre no cueste un rediseño**, no para construirlo ahora.
- **Como se captura la geometria de un tramo**: caminando con el telefono, o dibujando sobre la imagen
  satelital. Lo segundo es gratis y lo primero es mas exacto.
