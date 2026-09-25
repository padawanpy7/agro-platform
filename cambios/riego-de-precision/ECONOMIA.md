# ECONOMIA - riego-de-precision

Como escala el costo por hectarea y cuanto cobrar. **Todo lo de aca son estimaciones de
planificacion, no numeros medidos**: los precios de hardware si son de lista (25/09/2026), pero
cuantos sectores y cuantos sensores lleva una hectarea sale del diseño de riego de cada finca.
Dolar a Gs 8.235 (referencia del dueño: 1.700 USD = ~14 millones).

## El costo NO escala por hectarea

Escala por tres cosas distintas, y confundirlas hace que el precio no cierre:

| capa | de que depende | se paga |
|---|---|---|
| **Gateway y conectividad** | de la FINCA, no del tamaño | **una sola vez**, y cubre kilometros |
| **Control de valvula** | de la cantidad de **sectores de riego** | por sector |
| **Medicion de suelo** | de la cantidad de **puntos de medicion** | por punto |

Un gateway LoRa alcanza varios km. **Cubre 1 ha o 50 ha por el mismo precio**, y si dos clientes
son vecinos cubre a los dos. Esa es la unica economia de escala real del negocio.

Supuestos de planificacion para horticultura bajo goteo:
- **~2 sectores por hectarea** (un sector se dimensiona por el caudal de la bomba, tipico 0,5 ha).
- **~1 punto de medicion por hectarea** al principio. **Este numero es el que decide el negocio** y
  es lo que mide la prueba de los dos sensores a un metro. El efecto, calculado contra la tabla de
  abajo y no estimado: si **uno cubre 2 ha**, el costo por hectarea baja de 470 a **395 USD (-16%)**;
  si hacen falta **2 por ha**, sube a **622 USD (+32%)**. Es menos dramatico de lo que suena, porque
  el sensor es 151 de 470: **los sectores pesan mas que los sensores**.

## Cuanto cubre un capital de 14 millones

### Camino comprado (Dragino importado, se consigue hoy)

**Los precios de abajo son FOB (lista en EE.UU.). Puestos en Paraguay hay que sumarles el
+35/45% de flete, aduana e IVA** que declara PREGUNTAS.md; las dos columnas van juntas justamente
porque la version FOB, usada sola, sobreestima las hectareas que cubre el capital.

| concepto | USD FOB | **puesto en PY (+35/45%)** |
|---|---|---|
| **Fijo por finca**: gateway LPS8v2 278 + antena, caja, poste, instalacion ~80 | ~358 | **483 - 519** |
| **Por sector**: controlador SVC01-LS2 (169, maneja 2 valvulas) -> 85 + solenoide latching 40 | ~125 | 169 - 181 |
| **Por hectarea** (2 sectores = 250) + (1 sensor SE01-LB = 151) + (1 caudalimetro = 70) | ~470 | **634 - 682** |

El caudalimetro va **por sector medido**, no por finca. Con uno por hectarea alcanza para el
numero que se le muestra al cliente; uno por sector afina el diagnostico de fugas y se agrega
despues, cuando el delta esperado-vs-medido empiece a valer plata.

Con 1.700 USD:

- a precio **FOB**: `(1.700 - 358) / 470` = **~2,9 ha** -- lo que costaria si el hardware apareciera
  magicamente en el lote;
- **puesto en Paraguay**: `(1.700 - 483) / 634` = **~1,9 ha**, y con el 45% baja a **~1,7 ha**.

**El numero que vale es ~1,9 ha, no 2,9.** La version FOB estuvo escrita sola hasta el 25/09/2026 y
sobreestimaba la cobertura del capital en ~50%.

### Camino construido (CubeCell local, 902-928 MHz)

| concepto | USD |
|---|---|
| **Fijo por finca**: gateway Heltec 62 + antena, caja, poste, instalacion ~80 | **~145** |
| **Por hectarea**: 2 nodos de valvula armados (~120) + 1 nodo sensor armado (~45) | **~165** |

Con 1.700 USD: `(1.700 - 142) / 165` = **~9,4 ha** a precio local -- **estas piezas se compran en
Asuncion, asi que aca no hay que sumar importacion**. Es parte de por que el camino construido sale
tanto mejor.

**La diferencia -2 ha contra 9 con el mismo capital- no es gratis**: el Dragino viene IP68,
calibrado y con años de bateria; el armado hay que encajarlo, sellarlo, alimentarlo y hacerlo
aguantar la intemperie. Se cambia capital por trabajo de ingenieria y por riesgo de falla en campo.

## La cuota

### Lo primero: que la paga

El ahorro de agua **no paga la cuota**, y hay que saberlo antes de sentarse a vender. Bombear
3 ha de goteo cuesta del orden de cientos de miles de guaranies al mes; ahorrar 25% de eso son
decenas de miles. **Lo que paga la cuota es el rendimiento y la calidad**: en tomate, el exceso de
riego raja la fruta y pudre la raiz, y unos pocos puntos de rendimiento sobre 3 ha valen ordenes de
magnitud mas que todo el equipo. Es un argumento honesto y es el unico que cierra -pero **hay que
poder demostrarlo, y hoy no hay dato propio que lo respalde**. Para eso es el piloto.

### Dos modelos, y con 14 millones la eleccion es binaria

| | **A) Instalacion cobrada** | **B) Todo capital tuyo** |
|---|---|---|
| Paga el cliente al inicio | ~11 millones | ~2-3 millones (solo mano de obra) |
| Capital tuyo comprometido por cliente | ~4 millones | ~12-14 millones |
| **Clientes que financias con 14 millones** | **~3** | **1** (el piloto) |
| Barrera de entrada para el cliente | alta | baja |
| Tu escala | rapida | atada a tu caja |

**Recomendacion: A, con una excepcion decidida por el dueño el 25/09/2026.**

**El piloto va por B: el capital lo pone el dueño.** El razonamiento es correcto y hay que dejarlo
escrito porque cambia el orden de todo: **nadie paga 11 millones por adelantado sin evidencia**, y
evidencia es justamente lo que el piloto todavia no tiene. Cobrar la instalacion es un modelo que
solo funciona **despues** de poder mostrar un resultado medido.

Entonces la secuencia es: **piloto con capital propio -> dato de rendimiento medido -> recien ahi
modelo A para los clientes que siguen**. El piloto no es un cliente: es el activo comercial que
habilita cobrar la instalacion. Con 14 millones eso significa **un** sitio piloto, y esta bien que
asi sea.

Para los clientes posteriores sigue valiendo A: con el capital que hay, B te deja con un cliente y
sin margen para el segundo, y el hardware puesto en el campo de otro es capital inmovilizado con
riesgo fisico.

### El numero

Cuota en dos partes, que es como escala el costo:

> **Gs 150.000 base por finca + Gs 150.000 por hectarea monitoreada, al mes.**

Para 3 ha: **Gs 600.000/mes** (~73 USD). Para 10 ha: Gs 1.650.000/mes.

Por que ese numero:
- **Contra tu costo**: el VPS y los datos son del orden de 40 USD/mes **repartidos entre todos los
  clientes**. Con la instalacion ya cobrada, la cuota es casi toda margen y cubre soporte, reposicion
  de sensores y tu tiempo.
- **Contra el cliente**: 600.000 al mes sobre 3 ha de horticultura es ruido frente a lo que factura
  un ciclo. Si al productor le duele esa cifra, no es el cliente -o el cultivo no da para esto-.
- **Contra el capital residual**: quedan ~4 millones por cliente despues de la instalacion; a
  600.000/mes se recuperan en ~7 meses aun descontando costos.

### Como escala el ingreso recurrente

`Gs 150.000 base + (hectareas x Gs 150.000)` al mes por cliente. Para clientes de 3 ha:

| clientes | por mes | **por año** | que es |
|---|---|---|---|
| 1 | Gs 600.000 | Gs 7,2 M | el piloto |
| **3** | Gs 1,8 M | **Gs 21,6 M** | el piso: recupera el capital y valida el modelo |
| **10** | Gs 6 M | **Gs 72 M** | buen ingreso personal, **todavia no una empresa** |
| 20 | Gs 12 M | Gs 144 M | recien aca hay estructura |

Los dos numeros que aparecen en este documento -21,6 y 72 millones- **no se contradicen**: son
3 clientes y 10. Se aclara porque leidos sueltos parecen inconsistentes.

Con 3 clientes de 3 ha: **Gs 21,6 millones al año de ingreso recurrente**, con el capital ya
recuperado. Eso es lo que hace que el negocio sea un negocio y no una venta de equipos.

## Que agrega el fertirriego (25/09/2026)

El fertirriego es el unico de los tres caminos de crecimiento que **no necesita un cliente nuevo**:
le sube el ingreso al que ya tenes.

> **Sobre que techo se razona**: 3.500 ha es el mercado **horticola**; con frutales el direccionable
> sube a ~32.400 (ver MERCADO.md). Los dos numeros aparecen en este documento y **no se contradicen**:
> el fertirriego se decidio cuando el alcance era solo horticultura, y sigue valiendo por si mismo
> -mas ingreso sin cliente nuevo-, pero **el argumento de "los clientes son finitos" pesa mucho menos
> con frutales adentro**.

### Por que se puede cobrar mas

Lo que esta documentado en la literatura -no es estimacion mia-:

| efecto | magnitud | fuente |
|---|---|---|
| Ahorro de fertilizante | **> 30%**, hasta 50% en un ensayo | FAO/IFA; ensayo en tomate |
| Eficiencia de uso del agua | **> 90%** | INTAGRI |
| Aumento de rendimiento | hasta **40%** en un ensayo de goteo de alta frecuencia | ensayo citado por Agroproductividad |

**Advertencia de honestidad sobre esos numeros**: la mayoria compara *goteo con fertirriego* contra
*riego tradicional*. Si el cliente **ya tiene goteo y ya inyecta fertilizante a mano**, lo que
nosotros agregamos es **la precision y el control por EC**, no el salto entero. El delta real es
mas chico que el del paper, y hay que medirlo en el piloto antes de prometerlo.

**El fertilizante cuesta mas que el agua.** Por eso el fertirriego soporta una cuota mayor que el
riego: se cobra contra un gasto mas caro.

### El precio propuesto y a donde se llega

> **Fertirriego: +Gs 200.000 por hectarea y por mes**, sobre la cuota de riego.

Para un cliente de 3 ha: `Gs 150.000 base + 3 x (150.000 + 200.000)` = **Gs 1.200.000/mes**.
**La cuota por cliente se DUPLICA exacto.**

| clientes (3 ha c/u) | solo riego / año | **con fertirriego / año** | que es |
|---|---|---|---|
| 1 | Gs 7,2 M | Gs 14,4 M | el piloto |
| **3** | Gs 21,6 M | **Gs 43,2 M** | **el PISO** |
| 10 | Gs 72 M | **Gs 144 M** | se vive de esto |
| 20 | Gs 144 M | **Gs 288 M** | el TECHO de este escenario |

**El piso y el techo contestan preguntas distintas, y conviene no mezclarlos:**

- **El piso -3 clientes- decide si esto se hace.** No importa el monto sino cuantos clientes hacen
  falta para llegar. Sobre 120 direccionables, 3 es el **2,5%**: se puede fallar en vender al 97%
  de los prospectos y el negocio igual existe. Si el piso fueran 50, harian falta el 20-40% de todo
  el pais, y eso no es un negocio sino una apuesta. **Un piso bajo es lo que hace que el negocio
  tolere equivocarse** -que un cliente se caiga, que la primera instalacion salga mal, que tardes un
  año mas-.
- **Y es el criterio de corte**: si en un año no se llego a 3 clientes, no falta empujar; falla algo
  del modelo, y conviene saberlo ahi y no con 14 millones mas adentro.
- **El techo decide si esto es una empresa o un buen ingreso personal.** Es otra pregunta, y la
  contesta el tamaño del mercado (ver MERCADO.md), no el precio.

**La lectura que importa: con fertirriego, 10 clientes rinden lo que 20 sin el.** Y como el techo
del mercado -3.500 ha- es el riesgo real de este negocio, **duplicar el ingreso por cliente vale
mas que duplicar los clientes**, porque los clientes son finitos y el precio no.

### Lo que cuesta instalarlo

El hardware de fertirriego va casi todo en el **cabezal de riego**, no por hectarea -inyector
venturi o bomba dosificadora, sensor de EC en linea, tanque, filtracion-. Orden de **300 a 700 USD
por sitio**, no por hectarea. **Escala mucho mejor que los sensores**: una finca de 10 ha lleva
practicamente el mismo cabezal que una de 3.

### El numero que falta, y no se puede inventar

**Cuanto gasta en fertilizante por hectarea un tomatero paraguayo.** Se busco y **no esta publicado**
con ese desglose; lo que hay es de Colombia, Argentina y Bolivia. Sin ese dato, el ahorro de
fertilizante no se puede convertir en guaranies y la venta se apoya solo en el rendimiento.

**A quien preguntarle**: IPTA o Fenaprofhp. Es la misma clase de pregunta que "cuantas de las 3.500
ha ya tienen goteo": la sabe alguien del sector, no un buscador.

### Lo que puede tumbar toda esta cuenta

1. **Que haga falta mas de un sensor por hectarea.** Lo mide la prueba de los dos sensores.
2. **Que los sectores sean mas chicos que 0,5 ha.** Se resuelve mirando el diseño de riego real de
   la primera finca, no estimando.
3. **Que no se pueda demostrar el efecto en rendimiento.** Sin eso la venta se apoya solo en el agua,
   y el agua no alcanza.
4. **Que el cliente ya inyecte fertilizante a mano.** Entonces el fertirriego no vende el salto del
   paper sino solo la precision, y la cuota de Gs 200.000/ha hay que justificarla con el dato del
   piloto, no con la literatura.

## El caudalimetro, agregado el 25/09/2026

Entra a las dos listas de [PREGUNTAS.md](PREGUNTAS.md) y **no es un extra**: es la pieza que prueba el ahorro de agua, que era
justamente lo que el analisis de arriba marcaba como no demostrable. Sin el, la venta se apoya en
una promesa; con el, en un numero por parcela y por ciclo. Ademas habilita **litros por kilo
cosechado**, que es el KPI agronomico real, y el delta esperado-vs-medido que detecta fugas y
goteros tapados -o sea, la linea de mantenimiento-.

En el Nivel 0 va el YF-S201 local (Gs 95.000): valida el software. En el Nivel 1 va un medidor de
1 1/2 a 2" con salida de pulsos, porque el de 1/2" queda chico para el caudal de un sector real.

## Cuanto hace falta para ser MEDIANA EMPRESA (25/09/2026)

### El umbral legal

Ley 4457/2012, actualizada por la 7444/2025. Facturacion anual:

| categoria | facturacion anual | empleados |
|---|---|---|
| Microempresa | hasta **Gs 646.045.491** | |
| Pequeña empresa | hasta **Gs 3.230.227.453** | |
| **Mediana empresa** | **de Gs 3.230 millones hasta Gs 7.752.545.886** | hasta 50 |

> Los montos rigen hasta que salga el decreto reglamentario de la Ley 7444/2025, y el Ejecutivo
> puede actualizarlos por IPC. **Verificar antes de usarlos para algo formal.**

**El piso de mediana empresa es facturar ~Gs 3.230 millones al año.**

### Cuantas hectareas son

Con fertirriego -`Gs 150.000 base + Gs 350.000/ha` al mes-, cada hectarea bajo gestion rinde
**Gs 4,2 millones al año**, mas Gs 1,8 millones por cliente.

| tamaño del cliente | clientes para llegar | **hectareas bajo gestion** |
|---|---|---|
| 3 ha (horticultor) | **~224** | **~670 ha** |
| 10 ha (frutal) | **~74** | **~740 ha** |

**Alrededor de 700 hectareas bajo gestion.** Lo que cambia con el tamaño del cliente no son las
hectareas sino **la cantidad de instalaciones y visitas**: 224 clientes contra 74 es tres veces la
operacion para la misma facturacion. **Cliente mas grande no es solo mas plata: es menos trabajo
por guarani.**

### Y por eso los frutales no son opcionales

| escenario | mercado direccionable | 700 ha son... |
|---|---|---|
| **Solo horticultura** | 3.500 ha | **20% de todo el pais** -- practicamente imposible |
| **Horticultura + frutales** | **~32.400 ha** | **2,2%** -- la misma proporcion que hace facil el piso |

Los frutales **no son una linea mas: son lo que hace que "mediana empresa" deje de ser fantasia**.
Sin ellos el techo del negocio esta por debajo del umbral legal.
