# PREGUNTAS - riego-de-precision

Lo que no se decide solo. Una pregunta abierta que BLOQUEA no deja cerrar la vuelta.

## Abiertas

## 0. Quien es el cliente, y quien pone el capital -- ABIERTA (25/09/2026)

**Todo lo escrito hasta ahora asume que el cliente es UN PRODUCTOR.** La cuota
(`base por finca + por hectarea`), el modelo A/B de instalacion y el "piso de 3 clientes" de
[ECONOMIA.md](ECONOMIA.md) salen de ese supuesto.

**El relevamiento de La Colmena lo pone en duda** ([colmena/](colmena/)), y el dueño lo marco
explicitamente: *"no sabemos si ese es el cliente, a lo mejor conseguimos financiacion de la
cooperativa para hacer el proyecto para todos los socios"*.

**Los escenarios posibles, y son negocios distintos:**

| | quien decide | quien paga | que cambia |
|---|---|---|---|
| **A. Productor individual** | el productor | el productor | es lo que ya esta escrito. Ciclo corto, ticket chico, hay que convencer de a uno |
| **B. La cooperativa financia para sus socios** | el consejo de la cooperativa | **la cooperativa** | **una venta en vez de N.** El capital no sale de nuestro bolsillo ni del productor: sale de la cooperativa o de un programa. El piso de 3 clientes puede ser **1 contrato** |
| **C. Una junta de usuarios de agua** | la junta | la junta o sus miembros | el producto deja de ser agronomico y pasa a ser **medicion y reparto de turnos**. Otro pitch, otro precio |
| **D. Un organismo** (Fecoprod, Itaipu, Yacyreta, gobernacion) | el programa | plata publica o de binacional | ciclo largo, licitacion, pero **cubre varias fincas de una** |

**El D no es especulacion**: Fecoprod, Itaipu y Yacyreta **ya financian la Expo Frutas de La
Colmena**, y la DNCP publica lo que licitan la Municipalidad y la Gobernacion
([colmena/03-comercializacion.md](colmena/03-comercializacion.md)).

**Por que NO se decide ahora**: cada escenario cambia el precio, el ciclo de venta y **de quien
sale el capital**. Decidirlo desde el escritorio es elegir el que mas nos gusta. **Se contesta en
la primera reunion**, y las preguntas estan en [colmena/07-vacios.md](colmena/07-vacios.md).

**Lo que SI se puede afirmar sin decidirlo**: el producto es el mismo en los cuatro. Lo que cambia
es quien firma. **Nada de lo construido se tira si gana B en vez de A** -- lo unico que se reescribe
es `ECONOMIA.md`.

### Agregado el 28/09/2026: un quinto escenario, y NO cierra la pregunta

| | quien decide | quien paga | que cambia |
|---|---|---|---|
| **E. El dueño mismo, como productor** | el dueño | el dueño | **no hay venta que cerrar.** El producto se prueba entero sin convencer a nadie y **genera el historico propio** que el ML necesita y hoy no existe |

Salio de que el dueño planteo hacer **su propia plantacion piloto** en el terreno de Misiones
([banco-de-pruebas.md](banco-de-pruebas.md), y el costeo en
[economia/inversion-inicial-tomate.md](economia/inversion-inicial-tomate.md)).

**Por que es bueno**: es el unico escenario que no depende de que un tercero diga si. Arranca cuando
el dueño quiera.

**Por que NO cierra la pregunta 0**: la pregunta es *quien paga por esto*, y el escenario E la
**esquiva** en vez de contestarla. Un piloto propio prueba que la tecnologia funciona y **no prueba
que exista mercado** -- que es exactamente lo que la pregunta 0 busca. Sigue **ABIERTA**, y los
escenarios A a D siguen siendo los que la contestan.


**Una bloqueante -la 0- y dos abiertas.** La 2 se contesto el 27/09. Ninguna es tecnica: dependen
de plata, de un campo real o del negocio.

## 1. Donde corre el producto: este VPS o uno nuevo

El VPS de hoy es **staging** y ya tiene un inquilino de terceros (`primavera-nati`). El producto
trae una base de series temporales, que es la carga mas pesada que esta maquina va a ver, sobre el
disco que el 07/09 se fue a **3 segundos por `fsync`**.

- **A) El mismo VPS, namespace aparte.** Sale gratis y arranca hoy. Riesgo: el dato de un cliente
  que paga comparte disco con staging, y si el disco se degrada se degradan los dos.
- **B) Un VPS nuevo para produccion.** Es lo correcto y es lo que el repo ya sabe hacer -la Fase 3
  probo que la reconstruccion desde cero funciona-. Cuesta plata todos los meses desde ya, antes
  de tener el primer cliente.

**Recomendacion: A para construir y probar, B antes del primer cliente que paga.** El trabajo de
mover es chico porque todo esta declarado; lo que no se puede deshacer es perder el dato de un
cliente real en una maquina compartida.

**Si no se contesta**: el diseño asume A y deja escrito el disparador de la mudanza.

## 2. ~~Hay un lote real donde instalar, o se arranca en banco~~ CONTESTADA (27/09)

> **Respuesta: banco primero, en el terreno familiar de Misiones.** Decidido el 27/09/2026; el
> detalle y el por que de esa zona estan en [banco-de-pruebas.md](banco-de-pruebas.md). El lote
> real queda para cuando haya cliente. Lo de abajo es el analisis con el que se decidio.

El lazo de control no se puede dar por bueno en una simulacion: **un sensor enterrado miente de
formas que no se inventan** -contacto con el suelo, temperatura, deriva de calibracion-.

- **A) Banco de pruebas primero** (sensores en maceta o balde, valvula chica, todo sobre la mesa).
  Barato, se hace ya, prueba el software entero de punta a punta.
- **B) Directo a un lote real.** Prueba lo unico que el banco no prueba -la señal, el suelo de
  verdad, el agua de verdad-, pero cualquier error se paga en plantas.

**Recomendacion: A y despues B, sin saltear.** El banco valida el software; el lote valida la
fisica. Son dos cosas distintas y el banco cuesta una fraccion.

**Si no se contesta**: el diseño se escribe para el banco, que es lo que no requiere permiso de
nadie.

## 3. Cuanto se compra de hardware para la primera vuelta

La pregunta no es que marca -eso lo resuelve el diseño- sino **cuantos**. Con **uno** de cada cosa
se prueba que funciona; con **dos sensores en la misma parcela** se prueba algo distinto y mas
importante: **si dos sensores a un metro de distancia dicen lo mismo**. Esa respuesta decide si un
sensor por parcela alcanza o si hay que vender tres, y cambia el precio de la instalacion.

### La plata (precios de lista consultados el 25/09/2026)

**Nivel 0 - banco de pruebas, sin LoRa.** Valida el software entero: sensor -> ingesta -> base ->
decision -> valvula -> app. Es el 90% del trabajo y no necesita LoRaWAN.

| item | USD |
|---|---|
| 2x ESP32 + sensor capacitivo de humedad | ~25 |
| Valvula solenoide 12V 1/2" + rele + fuente | ~35 |
| Cableria, fuente, caja | ~20 |
| Caudalimetro YF-S201 1/2" (Gs 95.000, con stock) | ~12 |
| **Total** | **~95-135** |

**Nivel 1 - piloto en lote real, 1 parcela, LoRaWAN.** Precios de lista US, sin flete ni impuestos.

| item | unidad | cant | USD |
|---|---|---|---|
| Gateway LoRaWAN Dragino LPS8v2 (version 4G: 401) | 278 | 1 | 278 |
| Sensor de suelo humedad + EC + temp Dragino SE01-LB | 151 | 2 | 302 |
| Controlador de valvula Dragino SVC01-LS2 | 169 | 1 | 169 |
| Estacion meteo: unidad WSC1-L | 95 | 1 | 95 |
| Pluviometro WSS-21 | 138 | 1 | 138 |
| Viento velocidad + direccion WSS-22 | 113 | 1 | 113 |
| Solenoide latching 12V + accesorios de riego | ~40 | 1 | 40 |
| Medidor de riego 1 1/2-2" con salida de pulsos | ~70 | 1 | 70 |
| Solar + bateria para gateway y controlador | ~80 | 1 | 80 |
| Imagen satelital (Sentinel-2, Copernicus) | **0** | - | **0** |
| **Subtotal FOB** | | | **~1.285** |
| **Puesto en Paraguay** (flete + aduana + IVA, +35/45%) | | | **~1.740-1.860** |

**Recurrente: ~20 a 40 USD/mes** -VPS de produccion 8-25, chip de datos del gateway 10-15,
Sentinel-2 y Telegram cero-.

### Dos formas de gastar menos que valen la pena

1. **La trampa de plagas de la fase 1 es manual.** Una trampa con conteo automatico cuesta de 300 a
   varios miles. En la fase 1 la trampa es fisica y el conteo entra por **foto georreferenciada
   desde la app**: el dato llega igual a la base, con su punto y su fecha, y el modelo despues no
   distingue quien conto. Ahorro directo, sin perder dato.
2. **La estacion meteo Dragino sale 346 entre las tres piezas.** Una estacion comercial WiFi con API
   sale 150-200. Se pierde LoRa -hay que llevarle señal- y se gana la mitad del precio. Decision del
   diseño, no del proposal.

### La tension que hay que resolver antes de comprar el controlador

El proposal dice que **el lazo de control vive en el campo**: el controlador decide con lo que mide
aunque lleve dias sin señal. Un controlador LoRaWAN comercial como el SVC01-LS2 **no hace eso**: es
un nodo que obedece downlinks, o sea **la decision vive en el servidor**. Su autonomia es un
programa de respaldo cargado adentro, no un lazo que razona.

- **A) Controlador propio** (Raspberry Pi o ESP32 + reles, ~60-150 en partes). Decide de verdad en
  el campo, lee el sensor localmente, cumple el objetivo tal como esta escrito. Hay que construirlo
  y hay que hacerlo confiable a la intemperie.
- **B) SVC01-LS2 comercial** (169, IP68, años de bateria). Se compra y anda. Pero el objetivo del
  proposal baja a "la nube decide y el nodo tiene un plan B".

**Recomendacion: A**, porque el objetivo -regar bien sin señal- es el argumento de venta, y B lo
convierte en otra cosa. Pero es mas trabajo y hay que decirlo.

### Recomendacion final

**Gastar 100 dolares ahora (Nivel 0) y los 1.700 recien cuando el software ande.** El banco no
prueba la fisica, pero si el software no funciona el hardware caro no arregla nada. Y de la lista
del Nivel 1, el segundo sensor de humedad es el unico item que se agrega por una razon de metodo y
no de funcionalidad: es el que te dice cuantos sensores vender.

**Si no se contesta**: el diseño lo escribe para N sensores por parcela desde el principio -que es
gratis en software y caro de agregar despues-, y la compra queda pendiente.

### Proveedor local: que hay en electronica.com.py (consultado 25/09/2026)

El Nivel 0 se arma entero en Asuncion, sin importar nada. Precios en guaranies, stock del dia:

| pieza | producto | Gs | stock |
|---|---|---|---|
| Placa | MODULO ESP32 DEVKIT V1 30P | 180.000 | si |
| Placa (alt. barata) | ESP32-C3 SUPER MINI | 140.000 | si |
| Humedad de suelo | FC-28 higrometro | 35.000 | si |
| Humedad de suelo (la buena) | CAPACITIVO V1.2 | 60.000 | **no** |
| Valvula | SOLENOIDE 1/2 12VDC 0.8 MPA | 140.000 | si |
| Rele | MODULO RELE 5V 1 CANAL | 35.000 | si |
| Fuente | UNIVERSAL 12V 2.6A | 60.000 | si |
| Cables | DUPONT M-H PACK 10 | 12.000 | si |
| **Total con lo que hay hoy** (2 sensores) | | **~497.000** | **~63 USD** |

**Ojo con el FC-28**: es resistivo, se corroe en semanas y su lectura deriva. Sirve para escribir el
software contra un numero que cambia, **no para medir**. El capacitivo V1.2 es el correcto y esta
sin stock: hay que pedirlo por WhatsApp.

### El hallazgo que cambia la cuenta del Nivel 1

La tienda **vende LoRa en 902-928 MHz**, que es la banda correcta para Paraguay (el hardware cubre
AU915; la region LoRaWAN se configura por firmware). Y a otra escala de precio:

| pieza | local | equivalente importado |
|---|---|---|
| Gateway HELTEC IOT HUB LINUX 902-928 | Gs 490.000 (~62 USD) | Dragino LPS8v2 **278 USD** |
| Nodo CUBECELL HTCC-AB02 902-928 | Gs 290.000 (~37 USD) | Dragino SE01-LB **151 USD** |
| Antena GLUE ROD 902-928 SMA | Gs 30.000 (~4 USD) | incluida |

Los dos primeros estan **sin stock** hoy. Pero si se consiguen, el piloto LoRa baja de ~1.285 USD (el subtotal FOB de la tabla de arriba) a
un orden de **300 a 500 USD**. El costo no es plata: el Dragino viene IP68, con bateria de años y
calibracion de fabrica; el CubeCell es una placa a la que hay que ponerle caja, sensor, alimentacion
y aguante a la intemperie. **Se cambia dinero por trabajo de ingenieria y por riesgo de confiabilidad.**

Lo que la tienda **no** tiene: paneles solares (solo controladores de carga, sin stock), estacion
meteorologica LoRaWAN, ni solenoide latching con stock -los que hay son solenoides comunes, que
consumen mientras estan abiertos y por eso no sirven a bateria-.
