# Lista de compras

**Armada el 28/09/2026.** Dos listas separadas porque son dos proyectos distintos y dos plazos
distintos: **la hidroponia de la casa arranca ya**; **La Colmena espera a que el sistema funcione**.

Dolar a **Gs 8.235** (el declarado en `ECONOMIA.md`).

## Como leer esta lista

| marca | que significa |
|---|---|
| **VERIFICADO** | precio y stock consultados en electronica.com.py el **25/09/2026**. El stock cambia: confirmalo antes de ir |
| **A COTIZAR** | se sabe que existe y **no tengo el precio**. No inventé ninguno |
| **ESTIMADO** | hay una referencia de otro pais o de otra escala, y esta dicho |

> **Nada de esta lista tiene un precio inventado.** Donde no hay numero, dice "a cotizar", y eso es
> informacion: son las llamadas que hay que hacer.

---

# LISTA A -- Hidroponia en la casa

**Sistema: raiz flotante o Kratky. NO NFT** -- la raiz vive sumergida y no se seca si para la bomba.
El manual es gratis: **FAO, *La Huerta Hidroponica Popular*** (fao.org/4/ah501s/ah501s.pdf).

## A1. Lo que mide -- comprar primero, es lo mas barato y lo que mas decide

| | cant | por que | precio |
|---|---|---|---|
| [ ] **Termometro de agua comun** | 1 | **antes que nada**: medir el balde al sol del patio a las 15:00. Define si hace falta sombra **antes de gastar** | A COTIZAR (es barato) |
| [ ] **DS18B20 sumergible** | **4** | temperatura de solucion. **Arriba de 24 °C la lechuga se espiga**: es el numero que decide la cosecha. 4 = uno por bloque | A COTIZAR (hay en Electromer) |
| [ ] **ESP32 DEVKIT V1 30P** | 2 | el que mide y decide | **Gs 180.000 c/u** -- VERIFICADO, con stock |
| [ ] **Sensor de temperatura y humedad de aire** (AHT20 o SHT31) | 1 | con eso y la temperatura sale el VPD | A COTIZAR |
| [ ] **Sensor de nivel** (HC-SR04 ultrasonico) | 1 | al bajar el nivel **la EC se concentra**: sin nivel, la EC se lee mal | A COTIZAR |
| [ ] **Sensor de luz BH1750** | 1 | cuantas horas de sol directo tiene el patio. **Contesta el hueco que hoy bloquea el dimensionamiento** | A COTIZAR |
| [ ] **Gravity TDS analogico** | 1 | conductividad de la solucion. **Usar en EC (mS/cm), NO en ppm** | A COTIZAR (hay en electronica.com.py y Electromer) |
| [ ] **Cables Dupont M-H pack 10** | 3 | | **Gs 12.000** -- VERIFICADO |
| [ ] **Fuente 12V** | 1 | | **Gs 60.000** -- VERIFICADO |

## A2. El sistema de cultivo

| | cant | por que | precio |
|---|---|---|---|
| [ ] **Tanque para la solucion** | 1, **el mas grande que entre** | **la inercia termica es el control de temperatura mas barato que existe.** Va A LA SOMBRA, bajo el arbol. **NO usar el tanque domestico** | A COTIZAR |
| [ ] **Recipientes de los bloques** | **4** | un bloque por variable a probar. Bateas, tanques bajos o cajones impermeabilizados | A COTIZAR |
| [ ] **Planchas de telgopor** | segun m2 | es la balsa que flota | A COTIZAR |
| [ ] **Vasos de red (net pots)** | ~200 | uno por planta | A COTIZAR |
| [ ] **Esponja o sustrato de germinacion** | ~250 | el almacigo | A COTIZAR |
| [ ] **Bomba de aire de acuario + piedras difusoras** | 4 | oxigena la solucion. **En raiz flotante es lo que reemplaza a la circulacion** | A COTIZAR |
| [ ] **Media sombra 50%** | segun m2 | **el enemigo es el calor**. Va sobre las plantas | A COTIZAR |
| [ ] **Modulo rele 5V** | 4 | uno por bloque, para que cada automatizacion sea atribuible | **Gs 35.000 c/u** -- VERIFICADO |

## A3. Los insumos y los instrumentos de control

| | cant | por que | precio |
|---|---|---|---|
| [ ] **Nutrientes hidroponicos A + B** | segun litros | | A COTIZAR |
| [ ] **Medidor de pH portatil** | 1 | **el pH se mide A MANO al principio.** La sonda automatica se degrada en 1-2 años y no se puede dejar secar | A COTIZAR |
| [ ] **Buffers de calibracion pH 4,0 y 7,0** | 1 de cada | **sin buffers el medidor de pH miente**, y un pH falso mata el cultivo | A COTIZAR |
| [ ] **Medidor de EC portatil** | 1 | para controlar al sensor. **Las fuentes no coinciden en el rango de EC (1,2-1,8 contra 0,8-1,4 mS/cm): hay que medir, no copiar** | A COTIZAR |
| [ ] **Semilla de lechuga de hoja suelta o crespa** | | **las crespas aguantan el calor mejor que las repolladas** | A COTIZAR |
| [ ] **Balanza de cocina** | 1 | **para pesar la cosecha.** Sin el resultado logueado, la serie de sensores no enseña nada | A COTIZAR |

---

# LISTA B -- La Colmena

**No se compra todavia.** Se compra **cuando el sistema de la casa funcione**. Va escrito ahora para
poder cotizar con tiempo.

## B1. Preparacion del terreno

| | por que | precio |
|---|---|---|
| [ ] **Rastra, servicio por hectarea** | el tractor es **prestado**: esto es la referencia para comparar | **Gs 250.000/ha** -- tarifario oficial IPTA 2025 |
| [ ] **Combustible del tractor** | los camellones. **El suelo no drena: camellones, nunca a nivel** | A COTIZAR |
| [ ] **Analisis de suelo (IPTA)** | antes de comprar un solo kilo de fertilizante | A COTIZAR |

## B2. Riego -- el corazon del producto

| | por que | precio |
|---|---|---|
| [ ] **Equipo de goteo 1.000-2.000 m2** | cintas, mangueras, conexiones, valvulas | **ESTIMADO USD 1.500-2.500 por hectarea** (referencias de Colombia y Argentina). Para 1.000 m2 es una fraccion. **Sin precio paraguayo** |
| [ ] **Bomba** | sin bomba no hay riego | A COTIZAR. **Preguntar el caudal en m3/hora que pide el equipo**: es el numero que define la bomba |
| [ ] **FILTRO DE ARENA + filtro de malla** | **el item que mas se olvida.** Si el agua viene de tajamar o arroyo trae barro y algas. **Un gotero tapado no se destapa: se cambia la cinta** | A COTIZAR |
| [ ] **Solenoide 1/2" 12VDC** | la valvula que abre | **Gs 140.000** -- VERIFICADO |
| [ ] **Caudalimetro YF-S201 1/2"** | litros medidos, no estimados | **Gs 95.000** -- VERIFICADO |

## B3. Sensores de campo

| | cant | por que | precio |
|---|---|---|---|
| [ ] **Sensor de humedad CAPACITIVO V1.2** | **2** | **DOS a un metro de distancia**, y ver si dicen lo mismo. No es funcionalidad, es metodo: decide si se vende uno por parcela o tres | **Gs 60.000 c/u** -- VERIFICADO pero **SIN STOCK**: hay que pedirlo por WhatsApp |
| [ ] **ESP32** | 1 | el controlador **decide en el campo** | **Gs 180.000** -- VERIFICADO |
| [ ] **Caja estanca, fuente, cableria** | | intemperie | A COTIZAR |

> ### NO COMPRAR EL FC-28
> Cuesta **Gs 35.000** y es la tentacion obvia. **Es resistivo: se corroe en semanas y su lectura
> deriva.** Sirve para escribir software contra un numero que cambia, **no para medir**. Un dato de
> humedad que derivo no se arregla despues -- y ese es el error irreversible que el proyecto entero
> trata de evitar.

## B4. Insumos del cultivo -- para 1.000 m2, NO para 1 ha

| | por que | precio |
|---|---|---|
| [ ] **Plantines de tomate** (~1.800 para 1.000 m2) | | A COTIZAR: precio por unidad o por bandeja |
| [ ] **Semilla de sandia** | siembra **directa**, sin almacigo y **sin tutorado** | A COTIZAR |
| [ ] **Tutorado**: postes, alambre, hilo | solo para el tomate. Es de los rubros grandes | A COTIZAR |
| [ ] **Fertilizante** | **despues del analisis de suelo**, no antes | A COTIZAR |
| [ ] **Mochila pulverizadora** | en tomate la sanidad no es opcional | A COTIZAR |
| [ ] **Cajas de cosecha** | | A COTIZAR |

---

# LO QUE NO HAY QUE COMPRAR TODAVIA, Y POR QUE

| | precio | por que no |
|---|---|---|
| **Dron con camara termica** | **~USD 2.000 = Gs 16,5 M** | **mas que TODO el capital.** Resuelve escala y acceso, y no hay ninguno de los dos: 120 ha las cubre el satelite gratis, 1.000 m2 se caminan. Y a ese precio probablemente no sea radiometrica, que es lo unico que serviria |
| **Estacion meteorologica** | **~Gs 1.181.500** (ESTIMADO, referencia CYPE) | **no es de la hidroponia**, es de La Colmena, y no esta en el camino critico. **Si se compra igual: que permita SERVIDOR PROPIO.** Ecowitt o Fine Offset lo trae de fabrica; la AcuRite necesita interceptar el trafico |
| **Gateway LoRa + nodo** | Gs 490.000 + Gs 290.000 (VERIFICADO, **sin stock**) | **en el patio no hace falta**: el router esta a cinco metros, va WiFi. Se compra **despues**, y a proposito, para depurar la radio en casa antes de llevarla al campo |
| **Sonda de pH automatica** | A COTIZAR | se degrada en 1-2 años y **un pH falso sobre el que el sistema actua mata el cultivo**. Primero a mano |
| **Sonda de oxigeno disuelto** | ~USD 150+ | **se infiere de la temperatura**: agua caliente, menos oxigeno |
| **Bomba dosificadora peristaltica** | A COTIZAR | **una peristaltica trabada mata el cultivo en minutos.** Se agrega cuando el sistema tenga meses de andar bien |

---

# LAS LLAMADAS QUE HAY QUE HACER

Esto es lo que convierte los "a cotizar" en numeros. Ninguna cuesta plata:

1. **electronica.com.py / Electromer**: precio y stock de DS18B20, Gravity TDS, BH1750, AHT20, HC-SR04.
2. **Al mismo lugar**: el **capacitivo V1.2** esta sin stock -- pedirlo por WhatsApp.
3. **Casa de hidroponia o agropecuaria**: nutrientes A+B, medidores de pH y EC, **buffers 4,0 y 7,0**,
   vasos de red, esponja.
4. **Proveedor de riego**: goteo para 1.000-2.000 m2 **con filtro de arena dimensionado para agua
   sucia**, y **el caudal en m3/hora** que necesita.
5. **IPTA**: precio del analisis de suelo.
6. **Vivero**: plantines de tomate, por unidad o bandeja.
7. **Multiofertas**: precio de la estacion AcuRite **y si permite servidor propio**. Las dos preguntas
   en la misma llamada.
8. **Cinco restaurantes**: cuantas lechugas compran por semana, a cuanto, a quien, y si pagarian mas
   por hidroponica. **Es la mas importante de las ocho y la unica que decide si el negocio existe.**

---

**Lo que este documento NO tiene**: un total. **No se puede sumar una lista donde la mayoria de los
precios son "a cotizar"**, y un total inventado se usa igual para decidir. El total sale despues de
las ocho llamadas.
