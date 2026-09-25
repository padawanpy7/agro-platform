# PREGUNTAS - riego-de-precision

Lo que no se decide solo. Una pregunta abierta que BLOQUEA no deja cerrar la vuelta.

## Abiertas

Tres. Ninguna es tecnica: las tres dependen de plata, de un campo real o del negocio.

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

## 2. Hay un lote real donde instalar, o se arranca en banco

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
