# Ganaderia -- evaluacion de un mercado vecino

Investigado el **26/09/2026**. No es riego de precision: es **otro producto** que reusa la misma
infraestructura. Si avanza, se abre su propia ficha.

## El tamanio

| | valor | fuente |
|---|---|---|
| Hato bovino | **12,83 millones de cabezas** (2025) | [ABC](https://www.abc.com.py/economia/2025/10/11/ganaderia-recuperacion-productiva-y-nuevas-oportunidades-para-el-2026/) / [MarketData](https://marketdata.com.py/educacion/economia-facil/radiografia-del-hato-ganadero-por-que-paraguay-no-logra-expandir-su-stock-bovino-148877) |
| Explotaciones | **116.000** -- promedio de **110 cabezas** | idem |
| Distribucion | **89% region Oriental**, 11% Chaco | idem |
| Faena 2025 (ene-nov) | **2.078.230 cabezas**, record | [Economia.com.py](https://economia.com.py/paraguay-superara-los-usd-2-000-millones-en-exportacion-de-carne-bovina-en-2025-con-record-de-faena-de-mas-de-2-millones-de-cabezas/) |
| Exportacion 2025 | **420.030 t** por **USD 2.169 millones** (+18%) | [Valor Agro](https://www.valoragro.com.py/ganaderia/los-numeros-de-paraguay-en-2025-produccion-exportacion-y-valores-al-alza/) |
| Precio | **USD 5.125/t** (+16% interanual) | idem |
| Tendencia | el rodeo **cayo ~10%** en una decada y las explotaciones **23%** | [MarketData](https://marketdata.com.py/educacion/economia-facil/radiografia-del-hato-ganadero-por-que-paraguay-no-logra-expandir-su-stock-bovino-148877) |

## El hallazgo que define la oportunidad

> **"Paraguay produce hasta un 30% menos carne por animal que otros paises de la region"**
> ([Prensa Mercosur, 08/2026](https://prensamercosur.org/2026/08/05/paraguay-produce-hasta-un-30-menos-carne-por-animal-que-otros-paises-de-la-region/))

**No falta ganado: falta productividad por animal.** Y la productividad por animal se gana con
**agua, pasto y sanidad** -- las tres medibles. Es el mismo tipo de hueco que en fruta: el
productor no tiene el dato de lo que ya tiene.

## El numero que mata el modelo de precio actual

Ganaderia extensiva paraguaya, **estimado**: ~80 kg de carne por hectarea y por anio, a USD 5,125/kg.

```
ESTIMADO:  80 kg/ha  x  USD 5,125  =  ~USD 410/ha/anio  =  ~Gs 3,1 millones
```

| actividad | bruto por hectarea |
|---|---|
| Tomate | Gs 231 M por zafra |
| Uva (estimado) | ~Gs 198 M |
| Banana (estimado) | ~Gs 52 M |
| Arroz | ~Gs 20 M |
| Soja | ~Gs 9,9 M |
| **Ganaderia (estimado)** | **~Gs 3,1 M** |

**Es el valor por hectarea mas bajo de todo lo analizado: 75 veces menos que el tomate.** Cobrar
por hectarea es **imposible**, aun mas que en arroz.

**Pero por CABEZA el numero es otro**: 420.030 t sobre 2.078.230 cabezas faenadas dan **~202 kg
exportados por cabeza**, o sea **~USD 1.035 de valor bruto por animal**. Un collar comercial cuesta
**USD 50 al anio**, que es el **4,8%** de eso. Caro, pero no absurdo para una vaca de cria que vive
varios anios.

> **La unidad de cobro deja de ser la hectarea y pasa a ser la CABEZA, el PUNTO DE AGUA o el
> ESTABLECIMIENTO.** Es otro modelo de negocio, no una extension del actual.

## Que de lo construido sirve tal cual

| pieza | sirve? |
|---|---|
| Gateway LoRa, MQTT, ingesta, dedup | **si, identico** |
| Postgres + TimescaleDB + PostGIS | **si** |
| `tenant_id` + RLS | **si** |
| La parcela como poligono | **si**: un potrero ES una parcela |
| Estacion meteorologica | **si** |
| Medicion de agua (caudalimetro) | **si, y es lo que mas encaja** |
| **NDVI satelital** | **si, y funciona MEJOR que en horticultura** (ver abajo) |
| El lazo de control en el campo | parcialmente: no hay valvula que abrir, pero si bomba |

**Lo que falta**: el animal es un **objeto movil**. El modelo necesita una entidad nueva -`animal`,
con posicion en el tiempo- que es **una hypertable mas, no un rediseno**.

### Por que el satelite funciona MEJOR en ganaderia

Sentinel-2 da **10 metros por pixel**. En un lote de tomate de 1 ha eso son ~100 pixeles, y los
bordes contaminan la mitad. **En un potrero de 100 ha son ~10.000 pixeles**, y los bordes no
pesan. La misma herramienta que en horticultura es marginal, en ganaderia es precisa.

Y contesta la pregunta que todo ganadero se hace todas las semanas: **cuando muevo la hacienda de
potrero**.

## Las cuatro lineas posibles, ordenadas

### 1. Agua -- la mas fuerte, y la que ya sabemos hacer

En el Chaco el agua es **LA** restriccion. Los **tajamares** -reservorios de lluvia- abastecen
consumo humano y animal, y la sequia extrema es preocupacion constante; el Estado financia
limpieza e impermeabilizacion con geomembrana
([MADES](https://www.mades.gov.py/2026/02/18/mades-impulsa-captacion-de-agua-mediante-tajamares-en-alto-paraguay/),
[Ministerio de Defensa](https://mdn.gov.py/prosigue-construccion-de-tajamares-en-el-chaco-paraguayo/)).

**Lo que se puede medir con lo que ya tenemos:**
- **nivel del tajamar** (sensor ultrasonico + LoRa, barato)
- **evaporacion diaria** -- hay literatura sobre cuanta agua pierde un tajamar por dia
- **caudal en el bebedero** -- el mismo caudalimetro del goteo
- **bomba prendida o apagada**, y cuanto bombeo

**El dolor es concreto y caro**: un tajamar que se seca sin aviso, o una bomba que falla, mata
hacienda. **Avisar SI es resolver aca** -- al reves que con las heladas en fruta.

### 2. Trazabilidad -- hay obligacion regulatoria, que es mejor que un argumento de venta

| sistema | que es |
|---|---|
| **SIAP** | identificacion nacional. **+4 millones de bovinos identificados: ~30% del hato**. Obligatorio para los nacidos desde mediados de 2024 |
| **SITRAP** | trazabilidad individual para el **mercado europeo** |
| **RETSA PY** | trazabilidad **socioambiental**, para cumplir el reglamento UE 1115/2023 de productos **libres de deforestacion** (EUDR) |

Fuentes: [SENACSA](https://senacsa.gov.py/servicios/sanidad-animal-identidad-y-trazabilidad/campo/sitrap-sistema-de-trazabilidad-del-paraguay/),
[MIC](https://www.mic.gov.py/paraguay-presenta-retsa-py-un-sistema-de-trazabilidad-socioambiental-para-fortalecer-exportaciones-de-carne-y-cuero/).

**El punto clave: NO se compite con el Estado, se lo complementa.** SENACSA tiene los sistemas; el
productor tiene que **alimentarlos**, y hoy lo hace a mano. Y solo el 30% del hato esta
identificado: **el 70% restante es trabajo por hacer**.

**Es mas software que hardware** -- o sea, lo que mejor sabemos hacer.

### 3. Pasturas por satelite -- cero hardware

Igual que en fruta, **entra primero porque no cuesta equipos**. Biomasa por potrero, cuando entrar
y cuando salir, y que potrero se esta degradando. Sobre lotes grandes el dato es bueno de verdad.

### 4. Cercos virtuales -- probado, pero no es para nosotros todavia

Collares GPS solares con geocercas: **mas del 99% de los movimientos quedan dentro del area**, y el
ganado se adapta en pocos dias
([Mundo Agropecuario](https://mundoagropecuario.com/cercas-virtuales-cambian-la-ganaderia-extensiva/)).

**Pero los numeros**: **USD 50 por collar y por anio** de alquiler, o **~USD 16.000 anuales para
325 vacas**. Contra un cerco fisico de USD 15.000 por milla, cierra en establecimientos grandes.

**Por que no es para nosotros hoy**: es **hardware importado que no fabricamos ni integramos**, y
el establecimiento promedio paraguayo tiene **110 cabezas**. A USD 50 por collar son USD 5.500 al
anio para un productor promedio, sobre un hato cuyo valor bruto total ronda los USD 114.000. **Es
producto de estancia grande.**

## CORRECCION del 27/09/2026: en software de gestion SI hay competencia

Ayer se escribio que la trazabilidad era la tercera oportunidad. **Es mas debil de lo que se dijo**,
y hay que corregirlo antes de usarlo en una conversacion.

**Ya existen apps de gestion ganadera disponibles en Paraguay**, y una de ellas cubre justo lo que
se habia marcado como hueco:

| | que hace |
|---|---|
| **GanApp** | gestion + trazabilidad: potreros geocercados, movimientos fechados, sanidad, pesajes, lectura RFID, iOS y Android, prueba gratis de 30 dias. **Declara explicitamente cubrir lo que RETSA y el EUDR piden** |
| **Agribusiness Paraguay** | software agricola y ganadero con tableros, reportes financieros, control de hato y costos |
| **Control Ganadero, BovControl, VacAPP** | internacionales, usadas en Paraguay |
| **Huella, GanSoft** | argentinas, pensadas para chico, mediano y grande |

Fuentes: [InfoNegocios](https://infonegocios.com.py/infoganaderia/tres-apps-que-todo-ganadero-debe-conocer),
[GanApp](https://ganapp.net/), [Agribusiness PY](https://agribusiness.com.py/html/).

**Esto es lo contrario de lo que pasa en fruta.** Alla no se encontro ningun software de riego,
turnos o acopio operando. **Aca hay varios, maduros y con prueba gratis.** Entrar a competir con un
registro de rodeo es entrar tarde y por abajo.

**Lo que NO hacen** -y es donde queda el hueco-: **ninguna mide el pasto ni el agua.** Registran lo
que el productor carga a mano. Nadie le dice cuanta biomasa tiene el potrero 3 ni que el tajamar
bajo 40 cm esta semana.

## Los numeros del dolor, ahora con nombre

| indicador | Paraguay | la region | las unidades elite del pais |
|---|---|---|---|
| **Carcasa por animal y anio** | **37,6 kg** | Argentina 57,7 &middot; Brasil 54,6 | -- |
| **Tasa de extraccion** | **16,4%**, la mas baja | Brasil 16,7 &middot; Uruguay 20,4 &middot; Argentina **27** | -- |
| **Tasa de procreo** | **50 a 53 terneros** por cada 100 vientres | -- | -- |
| **Tasa de destete** | **~52%** | -- | **~75%** |
| Ganancia de peso | -- | -- | ~180 kg/cabeza/anio, venta a 24-30 meses |

Fuentes: [ABC Rural](https://www.abc.com.py/negocios/abc-campo/2026/08/04/paraguay-produce-menos-carne-por-animal-que-uruguay-brasil-y-argentina-que-explica-la-brecha/),
[La Prensa](https://www.laprensaparaguay.com/2026/09/16/la-eficiencia-reproductiva-puede-impulsar-el-crecimiento-de-la-ganaderia-paraguaya/),
[Ultima Hora](https://www.ultimahora.com/gremio-plantea-elevar-tasa-de-procreo-bovino-al-menos-5).

> **El numero que vende es este: de cada 100 vacas, el promedio paraguayo saca 52 terneros y las
> unidades elite del MISMO pais sacan 75.** No es una brecha contra Argentina: es contra el vecino.
> Veintitres terneros de diferencia, con el mismo clima y el mismo suelo.

Y la causa documentada no es misteriosa: **disponibilidad de forraje, sequias y estres termico**
afectan crecimiento, indices reproductivos y peso de faena. Mas **poca inversion en tecnologia** y
**baja produccion de terneros**.

**Las tres primeras se miden.** Forraje: satelite. Sequia: el agua. Estres termico: la estacion.

## Que sirve en un establecimiento de ~130 cabezas

Es el caso concreto que se planteo, y **esta apenas arriba del promedio nacional de 110**. A esa
escala **casi todo el hardware de ganaderia de precision queda afuera por precio**:

| | a 130 cabezas | veredicto |
|---|---|---|
| Collares GPS / cercos virtuales | USD 50/collar/anio x 130 = **USD 6.500/anio** | **NO** |
| Sensor por animal (rumia, celo) | peor todavia | **NO** |
| Balanza electronica con caravana | **una sola**, no por animal | tal vez, mas adelante |
| **Satelite de pasturas** | **cero hardware** | **SI, primero** |
| **Nivel de agua** | **1 a 3 sensores** para todo el establecimiento | **SI** |
| **Estacion meteorologica** | **una sola** | SI, barata |
| Registro del rodeo | ya hay apps con prueba gratis | **no competir** |

### La cuenta de lo que esta en juego

**Estimacion, con los supuestos a la vista:**

```
130 cabezas, ~75 vientres
Destete actual al promedio nacional (52%)  ->  39 terneros
Destete al 65% (ni siquiera el 75% elite)  ->  49 terneros
                                               ---------------
                                               +10 terneros/anio
```

Un ternero destetado vale, **estimado**, entre **USD 400 y 500** -del orden del 40-50% del valor
bruto de una cabeza faenada, que son ~USD 1.035 (ver arriba)-. Entonces:

**+10 terneros = USD 4.000 a 5.000 al anio = Gs 32 a 40 millones.**

> **El precio del ternero al destete NO esta verificado.** Es derivacion propia y es la primera
> cifra a confirmar con el productor: *que te pagan por un ternero destetado?*

## Veredicto

**Si, hay negocio, pero es OTRO producto** -- y eso es una ventaja, no un problema: reusa el 80% de
lo construido y no compite con el riego por el mismo cliente.

**El orden que yo seguiria, corregido el 27/09:**

1. **Pasturas por satelite** -- cero hardware, y **es lo unico del hueco que nadie cubre hoy**: las
   apps de gestion registran lo que el productor carga, ninguna le dice cuanto pasto tiene.
2. **Agua** -- 1 a 3 sensores por establecimiento. El dolor mas caro en el Chaco, y **avisar si
   resuelve** -al reves que con las heladas en fruta-.
3. **Trazabilidad** -- **BAJA de prioridad**: GanApp ya lo cubre, con prueba gratis. Solo tiene
   sentido si se llega por el frigorifico y no por el productor.
4. **Cercos virtuales** -- cuando haya clientes grandes, y revendiendo, no fabricando.

**Lo que NO hay que hacer**: llevar el modelo de cuota por hectarea. Con Gs 3,1 millones de bruto
por hectarea, la cuota actual seria **el 58% del bruto**. Absurdo. La unidad es la cabeza, el punto
de agua o el establecimiento.

## Lo que falta averiguar

- **Cuanta agua consume una cabeza por dia** en el Chaco, y cuanto dura un tajamar.
- **Cuanto cuesta hoy** un aviso tardio: cuantas cabezas se pierden por falta de agua en una seca.
- Si los grandes frigorificos -que exportan y dependen del EUDR- **pagarian por trazabilidad de sus
  proveedores**. Seria el mismo patron que la cooperativa: **un contrato en vez de N**.
- Cuanto cuesta un sensor de nivel ultrasonico puesto, y si se consigue local.
- **Que le pagan por un ternero destetado.** Es la cifra que convierte la brecha de destete en
  guaranies y hoy es derivacion propia.
- **Cual es SU tasa de destete.** Casi seguro no la tiene medida, y esa es la conversacion: no se
  puede mejorar lo que no se cuenta.
- Cuantos potreros tiene, de cuantas hectareas, y como rota.
- Cuantas aguadas tiene y si alguna vez se le seco una.
- **Si ya usa alguna app** y por que la dejo, si la dejo.

## La advertencia sobre el tamanio del ticket

**Un establecimiento de 130 cabezas no sostiene el negocio por si solo.** Si la mejora vale Gs 32 a
40 millones al anio, una cuota razonable seria del orden de Gs 300.000 a 500.000 al mes -el 10-15%
del valor creado-, contra los Gs 600.000 de un horticultor de 3 ha.

**Sirve como puerta y como aprendizaje, no como modelo.** El negocio en ganaderia esta en
establecimientos mas grandes, en una cooperativa o en un frigorifico que necesite el dato de sus
proveedores. **Igual que en fruta: el escenario que importa es quien firma, no quien usa.**
