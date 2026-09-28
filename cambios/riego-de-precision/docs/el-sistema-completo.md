# El sistema completo: como se llama lo que buscabas, y que pieza sobra

**28/09/2026.** El dueño describio el sistema entero que quiere y pregunto por dos cosas que **existen
y tienen nombre**. Este documento las nombra, y saca una pieza de su plan que **no hace falta**.

## 1. "Los documentos donde se registran todas las variables de crecimiento de las plantas"

**Existen, son publicos, y son de gente que lleva cuarenta años construyendo modelos de cultivo.**

| como se llama | que es |
|---|---|
| **ICASA Data Standards v2.0** | el **vocabulario estandar** para describir un experimento agricola: que se midio, como se llama cada variable y en que unidad. Se sigue actualizando con nuevos rasgos y variables ambientales ([ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S016816991300077X), [DSSAT](https://dssat.net/data/standards_v2/)) |
| **Minimum Data Set (MDS)** | **la lista**: el minimo que hay que guardar para **correr** un modelo de cultivo **y para evaluarlo**. Nacio en un taller del ICRISAT ([DSSAT](https://dssat.net/data/minimum-data/)) |
| **DSSAT** | el motor de simulacion de sistemas de cultivo mas usado |
| **AquaCrop** (FAO) | **el modelo de respuesta del rendimiento AL AGUA.** Es el que mas le sirve a este proyecto, porque este proyecto es riego |
| **FAO-56** | el paper de Riego y Drenaje 56 de la FAO: de ahi sale el **ETo** que AquaCrop pide, y que el `proposal.md` ya tiene en la hoja de ruta |

### Que pide el Minimum Data Set, y por que importa MAS de lo que parece

| lo que pide | de donde sale en este sistema |
|---|---|
| **Clima diario de toda la campaña** -- temperatura maxima y minima, radiacion solar, lluvia, y ETo | **la estacion meteorologica** |
| **Suelo: caracteristicas de superficie Y el PERFIL** | **el analisis del IPTA.** NO sale de ningun sensor |
| **El manejo del experimento** -- que se sembro, cuando, a que densidad, que se aplico, cuando se rego | **nadie lo mide: hay que ESCRIBIRLO** |
| **Observaciones: rendimiento, componentes del rendimiento, y las FECHAS FENOLOGICAS** | **tampoco se miden: se anotan** |

> **Y aca esta lo que este documento vino a decir.** La regla de este proyecto es *"guardar todo
> crudo"*, y esta bien. **Pero "todo" hasta hoy quiso decir "todo lo que manda un sensor" -- y la
> mitad del Minimum Data Set NO viene de un sensor.**
>
> El perfil del suelo, la densidad de siembra, la fecha de floracion, los kilos cosechados: **ningun
> aparato los manda. Si nadie los escribe, no existen** -- y **sin ellos el historico de sensores no
> alimenta ningun modelo agronomico serio**, por prolijo que sea.

**Consecuencia directa y barata: el MDS es la lista de campos del formulario que el dueño tiene que
llenar cada campaña.** No hay que inventar que guardar: **ya esta escrito por la FAO y por DSSAT, y es
gratis.** Es exactamente lo que `campania` y `analisis_suelo` existen para guardar, y hoy estan vacias
de contenido pensado.

**Y una honestidad sobre el ML**: con el MDS completo, el historico deja de ser "datos" y pasa a ser
**un dataset comparable con los que usa la literatura**. Sin el, son series de sensores sin contexto,
que describen y no predicen.

## 2. Pesar las vacas: lo que el dueño imagino ya existe, y NO necesita el dron

**El plan que describio:** *"quiero pesar todas mis vacas del potrero X, el dron sale, trae las vacas,
el IoT pesa de a uno, el GPS identifica quien es quien"*.

**Existe, es comercial, y se llama `walk-over weighing` (WOW) -- pesaje al paso.**

| como funciona | |
|---|---|
| Que es | una **plataforma de pesaje con lector RFID incorporado y procesador**, alimentada por **panel solar** |
| Donde va | en un **paso obligado**: se cerca la aguada y el unico modo de entrar a tomar agua es **cruzando la plataforma** |
| Que hace | **pesa e identifica a cada animal cada vez que cruza**, y sube el dato solo |
| Que NO hace falta | **ni arrear, ni encerrar, ni tocar al animal** |

Fuentes: [FutureBeef](https://futurebeef.com.au/resources/automated-cattle-weighing/),
[Tru-Test / Datamars WOW](https://au.tru-test.com/products/autonomous-weighing-wow), y validacion
academica en [Journal of Animal Science](https://pmc.ncbi.nlm.nih.gov/articles/PMC9493787/).

### Las tres piezas del plan que esto reemplaza

| pieza del plan | que pasa |
|---|---|
| **El dron arreador** | **sobra.** Las vacas van solas al agua todos los dias. El dron resuelve un problema que **desaparece con poner la balanza en el lugar correcto** |
| **El corral** | **sobra.** El pesaje pasa en el potrero, sin encierro |
| **El GPS para identificar** | **nunca fue la herramienta.** El GPS contesta *donde esta*; la pregunta era *quien es*, y eso lo contesta **la caravana RFID en la plataforma** |

> **Y esto cierra la frustracion del dueño con el chip GPS: no habia solucion confiable porque el GPS
> no era el problema a resolver.** Para *quien es* -> RFID. Para *donde esta el rodeo* -> un collar en
> el animal guia. **Para el 90% de lo que pidio -- peso, consumo, evolucion -- no hace falta saber
> donde esta nadie.**

**Y encaja con lo que este repo ya venia diciendo por otro camino**: `economia/ganaderia.md` pone
**el agua como la linea mas fuerte** y propone sensores en la aguada;
`colmena/09` recomienda **caravana leida en un paso obligado**. **La aguada es el mismo lugar en los
tres casos.**

```
LA AGUADA COMO CENTRO DE TODO
  nivel del tajamar  +  caudal del bebedero  +  RFID  +  balanza al paso
  = quien tomo agua, quien NO tomo (primer sintoma de enfermo), cuanto pesa
    y cuanto gano por dia -- todos los dias, sin tocar un animal
```

**Requisito que la propia fuente marca**: funciona bien **donde el ganado va regularmente a UN punto de
agua**. Si hay varias aguadas libres, hay que cercar y dejar una. **Es la pregunta a hacer en el campo.**

## 3. Razas, alimentacion y dosis: existe la referencia, y el ML NO es para eso

El dueño pidio *"que razas son las mejores, con que alimentar, la dosis, todas las variables que
aceleran el engorde y la reproduccion"*.

**Eso tambien esta publicado y no hay que descubrirlo:** los requerimientos nutricionales del bovino de
carne son una referencia tecnica estandar (**NRC, *Nutrient Requirements of Beef Cattle***), y para
**como registrar** los datos del animal existe **ICAR**, el comite internacional de registro animal.

> **Y aca va una advertencia que conviene decir ahora y no despues de gastar en el modelo: el ML NO va
> a descubrir que raza es mejor ni cuanta proteina pide un novillo. Eso ya se sabe, esta medido en
> decadas de ensayos, y esta en tablas.**
>
> **Lo que el ML SI puede hacer -- y es lo que nadie mas puede hacer por el dueño -- es lo que NO esta
> publicado: como responde SU rodeo, en SU potrero, con SU pasto y SU agua.** Las tablas dan el
> promedio de la especie; el modelo propio da el de su campo.

**Construir un modelo para redescubrir las tablas del NRC es gastar plata para llegar segundo.**
Usar las tablas como punto de partida **y medir la desviacion propia** es el producto.

## 4. Lo otro que vio: piloto automatico y drones

| | veredicto |
|---|---|
| **Maquinaria con piloto automatico** (autoguia, RTK) | **es real y es otra industria** -- John Deere, Trimble. Se justifica en cientos de hectareas de extensivo. **En 1.000 m2 de tomate no tiene sentido**, y no es un producto que este proyecto pueda construir |
| **Drones arreadores** | existen y se usan en Australia y Nueva Zelanda. **Pero ver §2: con la balanza en la aguada, no hay que arrear a nadie** |

## 5. Sobre "tener la app para conseguir inversor"

**Es una estrategia legitima y esta bien pensada**: mostrar el sistema funcionando es mas convincente
que un plan escrito, y el capital para el hardware puede venir despues.

**Con una sola condicion, y es la que decide si funciona**: un inversor con criterio **va a preguntar
que parte es real y que parte es maqueta**. Si la app muestra pesajes automaticos que no existen, la
demo se convierte en un problema de credibilidad en la primera pregunta.

> **La version que si funciona -- y es la que el `proposal.md` ya declara**: la app hace de verdad lo
> que hay medido hoy, **y deja el lugar donde se enchufa el resto**. *"Esta ficha construye el dataset
> y deja el lugar donde el modelo se va a enchufar."* **Eso se puede mostrar sin mentir**, y el hueco
> visible es justamente lo que se pide financiar.

## 6. "Seria un big data potente para todo el sector agropecuario"

**Es cierto en potencia, y el orden en que pasa importa mas que la idea.**

**Donde tiene toda la razon:** nadie en Paraguay esta midiendo **pasto, agua y peso juntos**. Lo dice
el propio repo: las apps de gestion registran lo que el productor tipea y **ninguna mide el pasto ni
el agua**. Un historico **medido**, local y de varios años **no lo tiene ninguna empresa extranjera**,
porque no tienen los fierros puestos en campos paraguayos.

### Pero el numero que manda no es la cantidad de filas

> **Un campo instrumentado no es big data: es un CASO.** En datos agricolas el tamaño efectivo de la
> muestra es **campos x años**, no mediciones. **130 vacas en un campo durante un año son UN dato**
> para aprender sobre razas, aunque sean diez millones de filas.

**Y el motivo es estadistico, no de opinion**: la variabilidad que importa -- suelo, clima, manejo --
esta **ENTRE campos**, no adentro de uno. Medir el mismo potrero cada cinco minutos durante un año da
mucha resolucion **de un solo punto**. Para decir *"esta raza rinde mas"* o *"esta dosis acelera el
engorde"* hacen falta **muchos campos distintos**, no muchas filas del mismo.

```
valor del dataset  ~  campos x años x (etiqueta completa)
                      NO  cantidad de mediciones
```

**Consecuencia, y es la que ordena todo:**

| | |
|---|---|
| **El dato es CONSECUENCIA de vender, no un atajo para saltear la venta** | cada cliente nuevo suma un campo-año; sin clientes no hay N |
| **Y eso es un argumento a favor del escenario B de la [pregunta 0](../PREGUNTAS.md)** | **una cooperativa = muchos campos de una sola firma.** Para construir el dataset, un contrato con la cooperativa vale lo que veinte productores sueltos |
| **El foso no es el dato: es la base instalada** | cualquiera compra los mismos sensores. **Lo dificil es tenerlos puestos en N campos**, y el dato es el subproducto de eso |
| **Y lo que da valor sigue siendo la ETIQUETA** | cincuenta campos con rendimiento y ganancia de peso anotados valen mas que un millon de filas de sensores sin resultado |

### La decision que hay que tomar AHORA, con cero clientes

**De quien es el dato del cliente, y que se puede hacer con el agregado.**

> **Hoy no cuesta nada decidirlo. Con veinte clientes firmados es imposible retroactivarlo**, porque
> hay que volver a pedirle permiso a los veinte -- y el que diga que no, sale del dataset.

Lo minimo que el contrato tiene que decir, y en criollo:

1. **El dato de SU campo es de EL.** Se lo lleva si se va, y en el formato en que se guardo.
2. **El agregado anonimo es nuestro**, y sirve para mejorar el modelo que despues **lo beneficia a el**.
3. **Nunca se muestra el dato identificable de un productor a otro.** Eso ya lo hace cumplir el motor
   -- es exactamente la RLS -- pero tiene que estar escrito **ademas** de programado.

**Y el comprador del agregado NO es el productor**: son el **frigorifico** (que necesita el dato de sus
proveedores para el EUDR), la **cooperativa**, el **asegurador**, el proveedor de insumos y los
**organismos**. Es otra venta, a otro precio y con otro ciclo. **Se anota y no se persigue todavia.**

## Lo que hay que averiguar

- **Cuanto sale una plataforma WOW puesta en Paraguay**, o si se puede armar: es balanza de carga +
  lector RFID + solar + controlador. **Es la pregunta de hardware mas importante de la ganaderia.**
- **Va el ganado del señor a UN solo punto de agua?** De eso depende que el WOW sirva.
- **Bajar el Minimum Data Set de DSSAT y AquaCrop y convertirlo en el formulario de `campania`.** Es
  gratis, es una tarde, y es lo que hace que el historico sirva para un modelo.
- **Que fechas fenologicas hay que anotar en tomate y en sandia**, y quien las anota.
- **Las tablas del NRC** como punto de partida de la racion, antes de medir nada.
- **La clausula de propiedad del dato**, escrita antes del primer contrato. Es gratis hoy.
