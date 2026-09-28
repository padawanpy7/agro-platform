# El IoT de la hidroponia de la casa, y la estacion meteorologica en Paraguay

**28/09/2026.** Pedido del dueño: *"quiero todo el IoT posible para la hidroponia"*, y *"en Paraguay
hay esa estacion meteorologica para comprar?"*.

**Son dos cosas distintas y conviene no mezclarlas**: los sensores de la hidroponia son de **solucion
y ambiente cerrado**; la estacion meteorologica es de **campo abierto** y sirve para calcular ETo.
**La estacion no es de la hidroponia: es de La Colmena.**

## La regla que manda en todo este documento

> **En hidroponia un sensor que miente es PEOR que no tener sensor.**
>
> En tierra, un sensor mal calibrado hace regar mal y **el suelo amortigua** -- hay reserva de agua y de
> nutrientes que perdona el error. En hidroponia **la solucion es el unico sustento de la planta**:
> actuar sobre un pH o una EC falsos **mata el cultivo, y rapido**.
>
> Por eso [AGENTS.md](../../../AGENTS.md) regla 7 exige **comentario obligatorio en la calibracion de
> un sensor, con su procedencia** -- fabricante, ensayo propio, fecha. **Aca es donde esa regla se gana
> el sueldo**, y no es burocracia: un numero de calibracion sin procedencia no es un numero, es una
> supersticion.

## Nivel 1 -- comprar ya. Son centavos y deciden si hay lechuga

| sensor | que mide | por que primero | disponible en PY |
|---|---|---|---|
| **DS18B20 sumergible** | **temperatura de la solucion** | **el mas importante de todos**: arriba de **24 °C la lechuga se espiga**. Es el numero que decide la cosecha | **si**, [Electromer](https://electromer.com.py/product/temperatura-del-agua/) |
| **AHT20 / SHT31 / DHT22** | temperatura y humedad del aire | con esos dos sale el **VPD**, que es lo que gobierna la transpiracion | si, generico |
| **HC-SR04 o flotador** | **nivel de la solucion** | el nivel baja por consumo y evaporacion, y **al bajar la EC se concentra**. Sin nivel, la EC se interpreta mal | si, generico |
| **ESP32** | el que decide | ya estaba en el Nivel 0 de [PREGUNTAS.md](../PREGUNTAS.md): Gs 140.000-180.000 | **si**, con stock |

**Y el primero de todos no necesita ni ESP32**: un termometro en un balde de agua al sol del patio, a
las tres de la tarde. **Eso se hace hoy y define si hace falta media sombra antes de gastar un
guarani.**

## Nivel 2 -- vale la pena, con una advertencia cada uno

| sensor | que mide | la advertencia | disponible en PY |
|---|---|---|---|
| **Gravity TDS analogico** | **conductividad de la solucion** | **trabajar en EC (mS/cm), NO en ppm.** El sensor mide conductividad y la convierte a ppm con un **factor que varia entre fabricantes**, mientras que las recetas de hidroponia estan en EC. Y **necesita compensacion por temperatura**, que sale del DS18B20 que ya tenes | **si**, [Electronica Plett](https://www.electronica.com.py/producto/gravity-sensor-analogico-tds-medidor-de-solidos-disueltos-totales-sensor-de-calidad-del-agua-compatible-con-arduino/) y [Electromer](https://electromer.com.py/product/sensor-tds-analogico-de-conductividad-del-agua/) |
| **BH1750** | luz en lux | **lux no es PAR** y no sirve para calcular fotosintesis. **Si** sirve para lo que hace falta ahora: cuantas **horas de sol directo** recibe el patio y cuanto sombrea la media sombra | si, generico |
| **Rele + aireador** | el actuador | en raiz flotante el aireador es lo que oxigena. **Y el rele es la pieza que hay que probar que falla en seguro**: si se traba, que se traba **encendido** | si |

> **Dato util: la propia tienda local publica un proyecto de monitoreo de calidad de agua por IoT con
> TDS + DS18B20 + ESP32.** Es exactamente esta lista, documentada y con las piezas en el mismo
> catalogo. No hay que importar nada del Nivel 1 ni del 2.

## Nivel 3 -- NO al principio, y el motivo de cada uno

| | por que no todavia |
|---|---|
| **pH automatizado** | la sonda **se degrada en 1-2 años**, **no se puede dejar secar** y necesita calibracion periodica con buffers de **pH 4,0 y 7,0**. Es el sensor mas problematico de la lista. **Medi el pH a mano con un portatil** hasta que todo lo demas sea confiable -- el rango es **5,5 a 6,5** y fuera de ahi la planta no toma nutrientes aunque esten en el agua |
| **Oxigeno disuelto (DO)** | la sonda cuesta del orden de **USD 150+** y es delicada. **Se infiere de la temperatura**: agua caliente, menos oxigeno. El DS18B20 ya te lo esta diciendo indirectamente |
| **Dosificacion automatica** de nutrientes o pH down | una **peristaltica que se traba mata el cultivo en minutos**. Esto se agrega cuando el sistema tenga **meses** de funcionamiento confiable, no antes |

**El criterio para subir de nivel es uno: no automatices una decision que todavia no sabes tomar a
mano.** Primero medis y anotas; cuando entendes que hace el numero, recien ahi lo automatizas.

## La radio: en el patio NO uses LoRa

El [design.md](../design.md) define el camino LoRaWAN -> gateway -> ChirpStack -> MQTT. **Para un patio
a cinco metros del router eso es puro costo y complejidad**: ahorras el gateway (Gs 490.000), el
ChirpStack y el alta de claves. **ESP32 con WiFi directo a MQTT y listo.**

**Pero despues hay que hacer lo contrario a proposito**, y esta es la parte que importa:

> **Una vez que el sistema funcione por WiFi, pone UN nodo LoRa en el patio.** No porque haga falta
> ahi, sino **para depurar el camino de radio -- dedup, store-and-forward, hora de medicion contra hora
> de llegada -- donde lo ves todos los dias**, y no a 130 km un sabado a la tarde.
>
> **Ahi viven los bugs del design**, y el patio es el unico lugar donde se pueden cazar barato. El
> banco de pruebas de la casa sirve para **los dos caminos**.

## La estacion meteorologica: si, se compra en Paraguay

**Hay, y no hay que importar nada.**

| | que es | precio |
|---|---|---|
| **AcuRite 5 en 1** en [Multiofertas](https://multiofertas.com.py/-estaciones-meteorologicas/521-estacion-meteorologica-profesional-5-en-1-con-conexion-a-pc-acurite-temperatura-humedad-lluvia-y-datos-del-viento.html) | temperatura, humedad, lluvia, presion, **direccion y velocidad de viento**, con conexion a PC y app propia. Envio a todo el pais, **mismo dia en Asuncion** | **no publicado, hay que consultar** |
| Referencia de precio en Paraguay de una estacion con pluviometro y anemometro | -- | **Gs 1.181.500 (~USD 143)**, del [generador de precios CYPE](https://paraguay.generadordeprecios.info/rehabilitacion/Urbanizacion_interior_de_la_parcela/Riego/Automatizacion/Sensores_y_estaciones_meteorologicas_0_0_0_1_0_0_0_0_0_0_0_0_0.html) -- **es una referencia de costos de construccion, no una tienda** |

**Esto confirma la opcion barata que [ECONOMIA.md](../ECONOMIA.md) planteaba sin precio local**: la
comercial WiFi a 150-200 USD contra los **346 USD** de las tres piezas Dragino. **Se compra aca, y a
menos de la mitad.**

### El criterio de compra NO es el precio: es si podes leer el dato crudo

> **Antes de pagar, una sola pregunta: "puedo configurar un servidor propio al que la estacion mande
> los datos?"**

Muchas estaciones de consumo mandan todo a la nube del fabricante y te devuelven una app linda. **Eso
viola la regla 1 del contrato de este proyecto**: el dato se guarda **crudo y calibrado, con la hora de
medicion y la de llegada separadas, y con su punto geografico**. Un dato que vive en la nube de otro,
promediado a diez minutos y sin hora de medicion, **no es material de ML: es un widget**.

- Las estaciones basadas en **Fine Offset** (Ecowitt y compatibles) suelen tener **"custom server"** --
  se les configura una URL propia a la que hacen POST. **Eso es lo que hace falta.**
- **Si no tiene servidor propio ni API local, es un juguete para el telefono**, no un instrumento para
  la plataforma. **No verifique** si el modelo de AcuRite de Multiofertas lo tiene: es la pregunta a
  hacer antes de comprar.

### Y lo mas importante: NO la compres ahora

**La estacion no es de la hidroponia.** En un patio no importan el viento ni la presion barometrica;
importan temperatura de solucion, aire, luz y nivel -- que son **los sensores de Gs 20.000 del Nivel 1**,
no una estacion de Gs 1,18 millones.

**La estacion es de La Colmena, y no esta en el camino critico.** Sirve para calcular **ETo** y balance
hidrico, y el [proposal.md](../proposal.md) ya la ubica bien: en la hoja de ruta, como *"casi gratis:
software sobre el hardware que ya va a estar"*. **Primero tiene que estar el hardware, y hoy el
hardware es el riego.**

**La unica pieza que se adelantaria con criterio es el pluviometro solo**, porque *"llovio, no
riegues"* es la decision de riego mas barata que existe. Pero **eso no justifica Gs 1,18 millones de
los Gs 12 M disponibles** ([colmena/10-plan-con-12-millones.md](../colmena/10-plan-con-12-millones.md)).

## Lo que falta averiguar

- **Precio del AcuRite** en Multiofertas, y **si soporta servidor propio**. Las dos preguntas en la
  misma llamada.
- **Precio local** del DS18B20, del Gravity TDS, del BH1750 y del ESP32 con stock del dia. Hay
  catalogo y falta el numero.
- **Cuantos m2 y cuantas horas de sol** tiene el patio. Sigue siendo el hueco que bloquea el
  dimensionamiento ([economia/hidroponia.md](../economia/hidroponia.md)).
- **A que temperatura llega un balde de agua al sol** en ese patio a las 15:00. Es la medicion mas
  barata y la mas decisiva, y **no necesita comprar nada**.
- **Donde se compran los buffers de calibracion de pH 4,0 y 7,0** en Asuncion, y los nutrientes A+B.
