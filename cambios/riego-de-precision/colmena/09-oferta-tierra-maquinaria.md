# La oferta del contacto: su maquinaria y 1 ha -- que se puede plantar ya

**28/09/2026.** El contacto de La Colmena ofrecio **prestar su maquinaria y una hectarea para
plantar**. Dijo que *"la tierra se limpia en mayo y se planta en agosto para el arroz"*, y que
*"ahi no hay problema de agua, podemos plantar cualquier cosa"*.

## Lo primero: si, hay ventana. Estamos a tiempo

Fines de septiembre es **la apertura de la zafra de verano**, no el final de nada.

| cultivo | cuando se siembra | cosecha | plantas/ha | tutorado | mano de obra |
|---|---|---|---|---|---|
| **Sandia** | **septiembre-octubre**, **directa a golpes** | **~85 dias** -> diciembre | **~2.500** (2 m x 2 m) | **NO** | **baja** |
| **Melon** | **2a quincena de julio a febrero** | 90-100 dias | baja densidad | **NO** | **baja** |
| **Maiz verano** | mediados de agosto a **octubre** | diciembre-febrero | -- | NO | baja |
| **Mani** | **septiembre a noviembre** | -- | -- | NO | baja |
| Soja | 15 de septiembre al 15 de diciembre | -- | -- | NO | baja |
| **Tomate** | **almacigo julio-noviembre**, **transplante octubre-diciembre** | enero-febrero | **18.000** | **SI** | **alta** |

Fuentes: [Agrotec -- calendario de siembra Paraguay](https://agrotec.com.py/informagrotec/calendario-de-siembra-paraguay/)
(soja, maiz, mani), [ABC Rural -- cultivo de la sandia y el melon](https://www.abc.com.py/edicion-impresa/suplementos/abc-rural/cultivo-de-la-sandia-y-el-melon-780377.html),
y el [manual tecnico de tomate del IPTA](https://www.ipta.gov.py/application/files/2615/6261/3962/Mnual_Tecnico_Tomate_-_Papa_-_Pimiento_-_Cebolla_08jul.pdf).

> **Correccion de algo que yo mismo di por perdido**: la ventana del tomate **no** se esta cerrando.
> El almacigo va de julio a noviembre y el transplante de octubre a diciembre. **Estamos justo en el
> momento de sembrar el almacigo.**

## Y ahora la contradiccion que hay que resolver antes de gastar un guarani

**El dice que ahi no hay problema de agua. Pero su arroz se murio.**

Esta en [02-caica.md](02-caica.md): *"cultivaba arroz y lo dejo -- se le murio"*, y este relevamiento
ya lo habia marcado como **el dato mas cargado de toda la conversacion, sin saber por que**. Ahora
deja de ser una curiosidad y pasa a ser **la variable de la que depende la decision**.

| si el arroz murio por... | que significa para plantar ahi |
|---|---|
| **Falto agua** | entonces "no hay problema de agua" es optimismo, y **el riego es exactamente el producto** |
| **Sobro agua / no drena** | **el peor caso.** Sandia, melon y tomate **se pudren en suelo encharcado**, y ningun riego arregla un suelo que no drena |
| **Plaga o enfermedad** | queda en el suelo. Importa muchisimo saber cual |
| **Precio o mano de obra** | **no tiene nada que ver con la tierra** y la hectarea esta perfecta |

**Es una pregunta, es gratis, y ya estaba escrita como la primera de la
[guia de relevamiento](guia-relevamiento.md).** Ahora hay una razon concreta para hacerla.

### El otro flag, y es agronomico

*"Se limpia en mayo y se planta en agosto para el arroz"* describe **tierra arrocera**. Y tierra
arrocera es **tierra plana, pesada y preparada para RETENER agua** -- con taipas, hecha a proposito
para que el agua no se vaya.

> **Eso es lo contrario de lo que quieren el tomate, la sandia y el melon**, que necesitan drenaje y
> se pudren de raiz si el agua no se va. **No alcanza con que "haya agua": tiene que poder irse.**

Es la misma pregunta que [banco-de-pruebas.md](../banco-de-pruebas.md) declara como LA pregunta en
Misiones -- **es alto o bajo? se inunda?** -- y aplica igual aca. **Hay que saber si la hectarea
ofrecida es suelo arrocero bajo o tierra alta.** Si es lo primero, la lista de arriba se reduce
mucho.

## Lo que vale de verdad esta oferta, y no es la hectarea

| lo obvio | lo que importa de verdad |
|---|---|
| tierra gratis y maquinaria gratis | **la tierra y la maquina son del cliente posible, en la zona de la cooperativa** |

Es el escenario A/B de la [pregunta 0](../PREGUNTAS.md) volviendose concreto: pone los sensores
adelante de **la persona que podria comprar**, en el cultivo de su zona, sin pagar la tierra.

**Pero la hectarea prestada no es gratis.** Lo que cuesta:

1. **El costo de zafra sigue siendo del dueño**: en tomate son **Gs 45 a 108 millones por hectarea**
   ([inversion-inicial-tomate.md](../economia/inversion-inicial-tomate.md)).
2. **La mano de obra tampoco viene prestada**, y es el limite real. 18.000 plantas tutoradas no las
   maneja una persona.
3. **Es tierra ajena, o sea que un fracaso se paga en relacion** -- exactamente el costo que
   `banco-de-pruebas.md` decia que la tierra propia evita. Y la relacion es con **el unico cliente
   posible identificado**.
4. **Nada esta escrito.** Quien es el dueño de la cosecha, quien pone los insumos, que pasa si se
   pierde. **Se acuerda ANTES de sembrar**, no en la cosecha. No por desconfianza: porque un acuerdo
   verbal sobre una cosecha que todavia no existe se recuerda distinto de los dos lados.

## Que hacer, en dos frentes separados

### Frente 1 -- esta semana, cuesta casi nada y no depende de la siembra

**Instrumentar lo que el YA hace, y contestar por que se murio el arroz.** Eso es el producto y no
necesita zafra: un sensor, una medicion guardada, una pantalla. Si esto funciona, hay algo que
mostrar sin haber plantado nada.

### Frente 2 -- la siembra

**Recomendacion: sandia o melon, en una fraccion, no la hectarea entera de tomate.** Por que:

- **Se siembra directa**: sin almacigo, sin transplante y **sin tutorado**.
- **~2.500 plantas contra 18.000.** Es la diferencia entre algo que se puede atender y algo que
  necesita una cuadrilla.
- **85 a 100 dias**: cosecha en diciembre, **en pleno verano**, que es cuando la sandia se vende.
- **Si sale mal, se perdio poco y no se quemo la relacion.** Es la primera vez en esa tierra y no se
  conoce el suelo.

**Y en paralelo, el almacigo de tomate ya**, que es la jugada mas barata de todas: el almacigo cuesta
casi nada, la ventana de transplante llega hasta diciembre, y **deja la decision del tomate abierta
un mes y medio mas** -- para cuando ya se sepa si el suelo drena. Si el suelo no sirve, se perdio un
almacigo; si sirve, no se perdio la zafra.

**El tomate a una hectarea completa queda para el ciclo siguiente**, con el suelo conocido, la mano
de obra resuelta y el acuerdo escrito.

## Lo que falta preguntarle, en orden

1. **Por que se murio el arroz?** Falto agua, sobro agua, plaga, precio o gente. **Es la primera y de
   ella dependen todas las demas.**
2. **La hectarea es suelo arrocero bajo o tierra alta? Se inunda?**
3. **Que maquinaria tiene exactamente?** Tractor con que implementos, y sirven para horticultura o
   solo para arroz.
4. **De quien es la cosecha?** Y quien pone los insumos.
5. **Hay agua de riego ahi, y de donde sale?** Arroyo, pozo, tajamar. "No hay problema de agua" no
   dice **de donde**.
6. **Le interesa que sea SU cultivo el que se instrumente?** Si acepta que se mida, la oferta vale el
   doble.
