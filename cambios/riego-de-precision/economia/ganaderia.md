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

## Veredicto

**Si, hay negocio, pero es OTRO producto** -- y eso es una ventaja, no un problema: reusa el 80% de
lo construido y no compite con el riego por el mismo cliente.

**El orden que yo seguiria:**

1. **Agua en el Chaco** -- el dolor mas caro, la tecnologia que ya tenemos, y **avisar si resuelve**.
2. **Pasturas por satelite** -- cero hardware, entra gratis, y funciona mejor que en horticultura.
3. **Trazabilidad** -- obligacion regulatoria, 70% del hato sin identificar, y es software.
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
