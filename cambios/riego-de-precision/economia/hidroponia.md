# Hidroponia -- lechuga y frutilla, evaluacion de mercado

Investigado el **28/09/2026**, a pedido del dueño. Como [ganaderia.md](ganaderia.md): **no es riego de
precision, es otro producto** -- y a diferencia de la ganaderia, aca el dueño lo evalua **como
productor**, no como vendedor de tecnologia.

## El mercado de la lechuga hidroponica en Paraguay: hay hueco, y esta documentado

El caso con nombre es **Ing. Agr. Mateo Cantero**, en Juan Emiliano O'Leary, **Alto Parana**
([Campo Agropecuario](https://www.campoagropecuario.com.py/notas/hidroponia-alternativa-valida-para-un-mercado-insatisfecho)):

| | |
|---|---|
| Por que arranco | *"habia necesidad de lechugas, porque faltaba la oferta"* |
| Mercado | **asegurado**, abastece **doce meses del año**, sobre todo a **cadenas de retail cerca de Asuncion** |
| Escala | de **5.000 plantas** a **30.000 mensuales**; meta de 100.000 a 120.000/mes |
| Ciclo | **40 a 45 dias**, en **tres fases de 15 dias** |
| Precio de referencia | **Gs 3.500 por mata** en el mercado local |
| Premium | el consumidor paga **20-30% mas** por hidroponico o libre de quimicos |
| Canales | cadenas de Asuncion y Ciudad del Este, tiendas de organicos, **venta directa a restaurantes** |

**Lo que esto tiene de distinto al resto de la carpeta**: en fruta no se encontro competencia y en
ganaderia hay competencia madura. En lechuga hidroponica hay **demanda declarada insatisfecha por
alguien que ya la esta abasteciendo y quiere cuadruplicar** -- que es la mejor señal de mercado de
todas, porque no es una proyeccion: es alguien vendiendo.

**El riesgo que el mismo productor nombra**: *"cuando hay muchas lluvias o nubosidad, la planta entra
en pausa"*, y hay que sostenerla con aplicaciones foliares. **No es un sistema inmune al clima; es un
sistema donde el clima pega distinto.**

> **Cifra que NO se usa**: una fuente da "USD 3.545 por m2" de costo del sistema completo. **Es
> implausible** -- serian millones de dolares para un invernadero chico- y probablemente sea un total
> mal atribuido a la unidad. **No se propaga.** El costo de instalacion queda como hueco.

## Por que la hidroponia encaja tan bien con ESTE caso

Tres problemas concretos que el dueño ya tiene, y que la hidroponia resuelve de raiz:

| problema | como lo resuelve |
|---|---|
| **El suelo de La Colmena no drena** -- gris, impermeable, lodazal ([colmena/09](../colmena/09-oferta-tierra-maquinaria.md)) | **no hay suelo.** El problema desaparece, no se maneja |
| **El exceso de lluvia** es el riesgo de la zona, no la sequia | va **bajo cubierta** |
| **El ciclo largo** de cualquier frutal o del tomate | lechuga en **40-45 dias**: plata rapida y aprendizaje rapido |

**Y el cuarto, que es el que mas importa para el proyecto:** la hidroponia es **el cultivo con mas
densidad de instrumentacion que existe**. EC, pH, temperatura de solucion, nivel, caudal, estado de
la bomba. En tierra el sensor es una mejora; **en hidroponia el sensor es el cultivo**. Si el dueño
construye una plataforma de sensores agricolas, este es el caso de uso que la exige al maximo.

## CORRECCION del 28/09/2026: EN LA CASA, las objeciones de abajo se caen

El dueño aclaro que **la hidroponia la quiere hacer en su casa, en la ciudad**, no en el campo. Eso
**invalida las tres objeciones** de la seccion siguiente, que estaban escritas suponiendo el campo:

| objecion de abajo | en la casa |
|---|---|
| **La bomba falla el lunes y el cultivo muere el martes** | **esta ahi todos los dias.** Es el unico lugar donde puede atender algo a diario |
| **No hay electricidad confirmada** | **una casa tiene luz.** Y con raiz flotante o Kratky casi no hace falta |
| Hay que viajar | **cero viaje.** Es el patio |

**Se da vuelta por completo**: la hidroponia pasa de ser *lo que no se puede hacer ahora* a ser **lo
unico que si se puede hacer entre semana**. Y **no compite con La Colmena por tiempo**, porque usa el
tiempo que hoy no se usa: los dias de ciudad.

### Y hay una consecuencia mas grande: el banco de pruebas se muda a la casa

`banco-de-pruebas.md` dice, textual, que el banco puede estar en **"cualquier lado; un patio sirve"**.
Un sistema hidroponico en el patio es **mejor banco que Misiones**, y por cuatro razones:

1. Esta **a cinco metros del escritorio** y corre **24/7**, no dos dias por mes.
2. **Exige mas instrumentacion que la tierra**: EC, pH, temperatura de solucion, nivel, caudal, estado
   de bomba. En tierra el sensor es una mejora; **aca es el cultivo**.
3. **Las fallas se ven el mismo dia**, que es lo que hace que el software mejore rapido.
4. **Cero viaje y cero permiso.**

> **Consecuencia practica: Misiones sale del plan, y no por el tajamar sino porque ya no hace falta.**
> El banco se hace en la casa, el piloto con cliente en La Colmena. De tres sitios a dos.

### Que sistema, y NO es NFT

**Raiz flotante o Kratky, no NFT.** La raiz vive sumergida en la solucion en vez de en una lamina
circulando, y eso cambia el modo de falla: **el sistema de raiz flotante mantiene la raiz en contacto
con la solucion sin riesgo de deshidratacion**, y esta recomendado justamente **para zonas de alta
temperatura**. El **Kratky** va mas lejos: **no circula, o sea que no tiene bomba** -- y lo que no
existe no se rompe.

**Y el manual correcto es gratis y es de la FAO**: *La Huerta Hidroponica Popular*
([FAO](https://www.fao.org/4/ah501s/ah501s.pdf)). La FAO impulsa esta capacitacion **desde 1992** para
familias en zonas urbanas y peri-urbanas; la tecnica usa materiales baratos, **funciona sin
electricidad o con muy poco consumo**, entra en espacios chicos -- patios, balcones, pasillos -- y sirve
para **lechuga, acelga, espinaca, repollo y cilantro**. Es exactamente el caso.

### El enemigo real en la casa no es la bomba: es el CALOR

| parametro | valor | por que importa |
|---|---|---|
| **Temperatura de la solucion** | **arriba de 24 °C acelera el espigado** y baja la calidad de hoja. El ideal del agua es **18-22 °C** | **es la variable que decide si hay lechuga o no** |
| **pH** | **5,5 a 6,5** (las fuentes coinciden) | fuera de rango la planta no toma nutrientes aunque esten ahi |
| **EC** | **1,2 a 1,8 mS/cm** (una fuente), **0,8 a 1,4** (otra) | **las fuentes no coinciden: hay que medir y ajustar, no copiar un numero** |

**Arrancar en octubre en Paraguay es arrancar en la peor estacion para lechuga.** Los productores
comerciales de clima tropical **enfrian la zona radicular** para poder cosechar hortalizas de estacion
fria con ambiente de 27 a 37 °C.

**Lo que se puede hacer sin enfriador:** media sombra, **mucho volumen de agua** -- la inercia termica
es gratis y es la mejor defensa --, el tanque a la sombra y aislado, y variedades de **hoja suelta o
crespa**, que aguantan mejor que las repolladas.

> **Y arrancar en la peor estacion tiene una ventaja que no es consuelo: es el mejor dataset.** Un
> sistema cuyo valor es avisar cuando las condiciones son malas **aprende mas en un verano que castiga
> que en un invierno facil.** La temperatura de solucion es un sensor de Gs 20.000 y es el primer dato
> que hay que loguear.

## Y la razon por la que NO se empieza por aca -- ESCRITO PARA EL CAMPO, ver la correccion de arriba

**La hidroponia es el peor cultivo posible para alguien que esta cinco dias por semana en la ciudad.**

En NFT la raiz vive en una lamina delgada de solucion **circulando**. Si la bomba se para -- corte de
luz, un tapon, una falla -- **la raiz se seca en horas, no en dias**. No hay suelo que amortigue. Una
falla el lunes es un cultivo muerto el martes, con el dueño en la ciudad hasta el sabado.

> **Y aca hay una honestidad tecnica que no hay que tapar con el discurso del producto: el monitoreo
> remoto NO salva esto.** Una alarma a 130 km avisa que el cultivo se esta muriendo; no lo salva.
> **Lo que lo salva es redundancia en el sitio** -- segunda bomba, respaldo de bateria, una caida por
> gravedad -- **o alguien que este ahi.** El sensor es necesario y no es suficiente.

**Tampoco hay electricidad confirmada** en el campo de La Colmena, y la hidroponia NFT **no funciona
sin energia continua**. Es pregunta bloqueante, no detalle.

## La frutilla: el calendario decide, y decide a favor

**No se puede plantar frutilla en octubre.** En Paraguay los plantines van en **febrero, abril y
mayo**; la cosecha arranca en **junio** y el pico es **julio-agosto**
([CAH](https://www.cah.gov.py/blog/noticias-1/comenzo-la-cosecha-de-la-frutilla-en-aregua-y-en-julio-sera-la-tradicional-feria-132),
[Agencia IP](https://www.ip.gov.py/ip/2024/07/19/temporada-de-frutillas-una-parada-dulce-en-estanzuela-y-aregua/)).
Variedades de Aregua: Dover, Francesa, Pepita doble, Festival, Sabrina, Sweet Charlie.

**Y eso, que suena como un obstaculo, es la mejor noticia del calendario:**

```
diciembre 2026  ->  el dueño renuncia y queda full time
febrero 2027    ->  se abre la ventana de plantacion de frutilla
junio 2027      ->  arranca la cosecha
julio-agosto    ->  el pico
```

**La ventana de la frutilla se abre justo despues de que se libera el tiempo.** No hay que forzar
nada: se planta cuando se puede atender.

**Y la frutilla es el caso mas fuerte del producto en toda la carpeta** ([frutilla.md](frutilla.md)):
el precio va de **Gs 20.000 a 120.000/kg** segun el momento -- **6x dentro de la misma temporada** --
y el pico es **al inicio de la cosecha**. Los grados-dia acumulados predicen exactamente eso.

> **Y hay un caso que valida la hipotesis que `frutilla.md` marcaba como no verificada**: ABC publico
> que un **productor de Paso Puente "rompe el calendario y logra una cosecha anticipada de frutilla"**
> ([ABC, 04/06/2026](https://www.abc.com.py/nacionales/2026/06/04/productor-de-paso-puente-rompe-el-calendario-y-logra-una-cosecha-anticipada-de-frutilla/)).
> **Se puede adelantar la cosecha, y alguien en Paraguay ya lo hizo.** Falta leer **como** lo hizo:
> es la nota mas importante para leer de toda esta carpeta.

**Contra de la frutilla, y es la misma que la de la hidroponia**: la cosecha es **cada uno a tres
dias durante meses**. Es incompatible con fines de semana, y compatible con dedicacion completa.

## Cuanto da un patio, con numeros

**Estimacion, con los supuestos a la vista.** La densidad de lechuga en raiz flotante ronda las
**20 plantas por m2** -- es un valor de referencia, **no verificado para Paraguay**.

```
10 m2 de patio           ->  ~200 plantas en el sistema
ciclo de 40-45 dias      ->  ~133 lechugas por mes
a Gs 3.500 / Gs 4.500    ->  Gs 470.000 a 600.000 por mes
```

**Dos comparaciones que ponen eso en escala:**

| | |
|---|---|
| La **cuota mensual** que [ECONOMIA.md](../ECONOMIA.md) le cobraria a un cliente de 3 ha | **Gs 600.000** |
| Un **restaurante** chico compra del orden de **20 a 50 lechugas por semana** | **10 m2 abastecen a uno** |

> **O sea: 10 m2 de patio dan aproximadamente lo mismo que un cliente de software, y empiezan a dar en
> 45 dias.** No es el negocio -- el negocio es la escala de Cantero, 30.000 plantas al mes, y eso es un
> galpon, no un patio-. **Pero es la unica cosa de toda la carpeta que genera plata antes de
> diciembre**, y para alguien que esta por renunciar, tener ingreso corriendo importa mas que su
> tamaño.

**Y es el canal donde el chico gana**: venta directa a restaurante. Sin intermediario, sin volumen
minimo de cadena, y con el premium del 20-30% que la fuente documenta.

**El capital: estimado en Gs 1 a 2,5 millones** para ~10 m2 -- recipientes, telgopor, vasos, esponja o
sustrato de germinacion, nutrientes A+B, media sombra, y **los dos medidores**. Sin precio paraguayo
verificado. **Los medidores de EC y pH no son opcionales**: sin ellos la hidroponia es adivinar, y las
dos fuentes ni siquiera coinciden en el rango de EC.

**Lo importante de ese numero es que NO compite con los Gs 12 M de La Colmena.** Es chico, usa otro
tiempo y otro espacio. **Los dos frentes caben.**

## Veredicto

**Si, hay negocio, y es el mejor encaje de los evaluados para DESPUES de diciembre.** No para antes.

| | cuando | donde | por que |
|---|---|---|---|
| **Lechuga, raiz flotante o Kratky** | **YA, esta semana** | **la casa** | demanda insatisfecha documentada, 40-45 dias, **es lo unico que da plata antes de diciembre** y de paso es el banco de pruebas |
| **Frutilla** | **plantacion febrero-mayo 2027** | a decidir | la ventana se abre justo cuando se libera el tiempo. Precio 6x y los grados-dia lo predicen |
| Lechuga en **NFT** | -- | -- | **NO para empezar**: la raiz se seca en horas si para la bomba. Raiz flotante o Kratky no tienen ese modo de falla |
| Cualquiera de las dos **en el campo, ahora** | **NO** | -- | cosecha cada 1-3 dias, sin electricidad confirmada y a 130 km |

**Revision del 28/09**: la fila de la lechuga decia *"desde diciembre"* cuando se suponia que era en el
campo. **En la casa es ya**, y la que se corre a diciembre o mas alla es la del campo.

## Lo que falta averiguar

- **Cuantos m2 de patio hay en la casa, y cuantas horas de sol directo recibe.** Es el dato que fija
  todo lo demas, y no lo sabemos.
- **A que temperatura llega la solucion en el patio en un dia de verano.** Sobre 24 °C se espiga: es la
  primera medicion a hacer, **antes de sembrar**, con un termometro en un balde de agua al sol.
- **Donde se compran los nutrientes A+B y los medidores de EC y pH en Asuncion**, y a cuanto.
- ~~Hay electricidad confiable en el campo~~ -- **ya no aplica**: la hidroponia va en la casa.
- **Cuanto cuesta instalar** un NFT chico en Paraguay, puesto -- **para mas adelante**, si se escala.
  El unico dato encontrado es implausible y se descarto. CMP Agro da soporte tecnico, materiales y
  **financiamiento** al caso de Alto Parana: es a quien preguntar.
- **Cuantas matas por m2** en raiz flotante, verificado para Paraguay. Se uso 20/m2 como referencia.
- **Si un restaurante de la zona compra**, cuantas por semana y a cuanto. Es la conversacion mas corta
  y mas barata de toda esta carpeta, y **se puede tener antes de sembrar**.
- **Como hizo el productor de Paso Puente para adelantar la cosecha** de frutilla. Es lo que
  convierte la hipotesis de los grados-dia en un producto vendible.
- **El rendimiento de frutilla en Paraguay**, que sigue faltando en [frutilla.md](frutilla.md).
- **Si las cadenas de Asuncion compran a un productor chico** o solo a volumen. Cantero abastece 12
  meses con 30.000 plantas/mes: **el piso de entrada puede ser alto**.
