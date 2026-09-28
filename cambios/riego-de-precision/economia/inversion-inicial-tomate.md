# Que hace falta para plantar 1 ha de tomate, partiendo de cero

Armado el **28/09/2026**, a pedido del dueño: *que maquinaria e inversion inicial se necesita para
plantar 1 ha de tomate? yo no tengo nada.*

> **Aviso de honestidad sobre este archivo.** Hay **dos numeros verificados** y el resto son huecos
> marcados como huecos. No se inventa un presupuesto: se dice que hay que pedir presupuesto, y de
> que. Un costeo con cifras de relleno se usa igual para decidir, y eso es peor que no tenerlo.

## La respuesta corta, en tres lineas

1. **Maquinaria: no compres nada.** Para 1 ha el tractor se **alquila**. El IPTA cobra
   **Gs 250.000 por hectarea** de rastra, y un tractor propio son decenas de miles de dolares.
2. **Lo que si se compra es el agua**: equipo de goteo, bomba y **filtracion** -- el tajamar trae
   barro y algas, y sin filtro de arena el goteo se tapa en una temporada.
3. **El limite real no es la plata ni la maquina: es la mano de obra.** 18.000 plantas tutoradas no
   las maneja una persona.

## Los dos numeros verificados

| | valor | fuente |
|---|---|---|
| **Plantas por hectarea** | **18.000** de tomate | [ABC Color](https://www.abc.com.py/articulos/hortalizas-dejan-buenas-ganancias-a-productores-210178.html) |
| **Inversion por planta** | **Gs 6.000** en temporada pico; **menos de Gs 2.500** en los otros meses | idem |
| **Rastra, servicio del IPTA** | **Gs 250.000/ha** (tarifario oficial 2025) | [IPTA, Resol. 189/2025](https://www.ipta.gov.py/wp-content/uploads/2025/04/Resol.-No189-2.025-SE-ESTABLECEN-PRECIOS-ACTUALIZADOS-DE-BIENES-Y-SERV.-DEL-IPTA-2025.pdf) |

**De ahi sale el costo de la zafra:**

```
18.000 plantas x Gs 6.000  =  Gs 108 millones/ha   (temporada pico)
18.000 plantas x Gs 2.500  =  Gs  45 millones/ha   (resto del anio)
```

> **Lo que NO esta claro, y hay que preguntarlo antes de usar este numero:** si esos Gs 6.000 por
> planta **incluyen el equipo de riego y el tutorado** o son solo gasto corriente -- plantines,
> fertilizante, agroquimicos y jornales-. La fuente no lo desagrega. **Yo lo leo como gasto
> corriente**, porque varia con la temporada y un equipo de goteo no varia con la temporada, pero
> **es una lectura, no un dato.**

Contra el bruto de **Gs 231 M/ha** de [tomate.md](tomate.md), el margen bruto queda en el orden de
**Gs 123 a 186 millones por hectarea y por zafra** -- antes del capital de la primera vez.

## La maquinaria: lo que se alquila y lo que se compra

**Se alquila** (y por eso no es inversion inicial):

| | precio |
|---|---|
| Rastra, por hectarea (IPTA, oficial) | **Gs 250.000** |
| Arada y otros laboreos | **no verificado** -- hay servicios privados en Clasipar y Construex, sin tarifa publicada |

**Para 1 ha, comprar tractor no cierra ni de casualidad.** Un tractor son decenas de miles de
dolares para usar unas horas al anio. El servicio existe, esta tarifado por el Estado y es de las
pocas cosas de esta lista con precio publico.

**Se compra** -- y aca estan los huecos, todos marcados:

| item | por que hace falta | precio |
|---|---|---|
| **Equipo de goteo, 1 ha**: cintas, mangueras, conexiones, filtro de malla, valvulas | es el producto y es lo que el tajamar habilita | **ESTIMADO USD 1.500-2.500** = Gs 12-21 M. Sin precio paraguayo verificado. Referencias: Colombia ~COP 6-8 M/ha, Argentina USD 5.474/ha en una configuracion **enterrada y con solar**, que es mas cara que lo que hace falta aca |
| **Bomba** desde el tajamar | sin bomba el tajamar no riega | **no verificado** |
| **Filtro de arena** + filtro de malla | **el item que mas se olvida.** El agua de tajamar trae barro, algas y materia organica. **Un goteo sin filtro de arena se tapa**, y un gotero tapado no se destapa: se cambia la cinta | **no verificado** |
| **Tutorado** para 18.000 plantas: postes, alambre, hilo | el tomate de mesa va tutorado o no rinde | **no verificado**. Es uno de los rubros grandes y no lo tengo |
| Mochila pulverizadora | sanidad, y en tomate no es opcional | **no verificado** |
| Herramientas de mano, cajas de cosecha | -- | **no verificado** |
| Media sombra para almacigo | o se compran los plantines hechos | **no verificado** |

## El limite que no es plata: la mano de obra

**18.000 plantas tutoradas en una hectarea no las maneja una persona sola.** El tomate de mesa pide
gente en transplante, en el tutorado, en el atado -que se repite mientras la planta crece-, en la
poda de brotes y en la cosecha. Y la cosecha son **30 toneladas** que salen a mano, en cajas
([tomate.md](tomate.md) mide 30.475 kg/ha).

> **Y ahi hay una advertencia sobre el rendimiento**: la misma fuente de las 18.000 plantas dice que
> una planta **puede** dar 6 kg, o sea 108.000 kg/ha. El promedio nacional del MAG es **39.550
> kg/ha** y lo que usa esta carpeta son **30.475 kg/ha**. Los 108.000 son un **techo teorico**, no
> una expectativa. **No planifiques con ese numero.**

**Recomendacion concreta: arranca con 0,25 a 0,5 ha, no con 1.** Razones, en orden:

1. **La mano de obra escala lineal y la experiencia no.** El primer ciclo se aprende; conviene
   aprenderlo sobre un cuarto de hectarea.
2. **El tajamar puede no dar para 1 ha.** Horticultura pide **4.000 a 6.000 m3/ha/anio**, y la
   evaporacion de verano se lleva una parte grande del tajamar antes de que la planta tome nada
   (las cuentas estan en [misiones-tajamar.md](misiones-tajamar.md)).
3. **Media hectarea de tomate sigue siendo un bruto del orden de Gs 115 millones.** No es un
   experimento de juguete.
4. **El software se prueba igual.** El banco valida el lazo de control, y el lazo no sabe si la
   parcela tiene una hectarea o un cuarto.

## Y si no hubiera tajamar?

Preguntado el 28/09/2026. **La respuesta da vuelta algo**: el tajamar es lo que ya esta y sale cero,
pero **como fuente de riego es la menos confiable justo cuando mas la necesitas.**

| fuente | costo inicial | en una seca fuerte | filtracion | evaporacion |
|---|---|---|---|---|
| **Tajamar** | **cero, ya esta** | **puede secarse** -- y si se seca no es fuente de riego, es bebedero | **filtro de arena obligatorio**: barro, algas, materia organica | **9,6 mm/dia en verano** |
| **Pozo** | **desde Gs 120.000/m** en suelo blando, **desde Gs 230.000/m** en piedra, mas bomba, caneria y tablero ([Formighieri](https://formighieri.com/cuanto-cuesta-pozo-artesiano/), [Hidrogeom](https://hidrogeom.com/pozos-artesianos-paraguay/)) | **sigue dando** | poca o ninguna | **cero** |
| **Arroyo o naciente** | bomba y caneria | baja el caudal, pero rara vez se corta en Misiones | si, pero agua mas limpia que el tajamar | cero |
| **Secano, sin nada** | cero | **es apostar a que no haya veranico** | -- | -- |

**La profundidad es lo que decide, y varia por diez.** Un pozo de 30 m en suelo blando son del orden
de **Gs 3,6 millones** de perforacion; uno de 200 m con tanque y motor costaba **Gs 74 millones** en
2020 ([La Nacion](https://www.lanacion.com.py/politica/2020/08/04/pozos-artesianos-cuestan-g-74-millones-pero-friedmann-pago-cinco-veces-mas-del-precio-real/)).
**No se puede presupuestar sin saber a que profundidad esta el agua ahi.**

> **Y eso es informacion gratis: preguntale a los vecinos a cuantos metros sacaron agua.** Decide un
> presupuesto entre 3 y 74 millones, y no hay que pagarle a nadie para averiguarlo.

### El error que hay que no cometer: confundir volumen con caudal

Un pozo puede tener **agua de sobra y no servir para goteo**, porque el goteo necesita **caudal**, no
solo volumen:

```
1 ha con 5 mm/dia            =  50 m3/dia
Aplicados en 4 horas de riego =  ~12,5 m3/hora de caudal
```

**Un pozo domestico de 2 a 3 m3/hora no alcanza para eso** -- aunque en 24 horas junte los 50 m3.

> **Y de ahi sale la respuesta que no es "uno o el otro": el pozo y el tajamar juntos.** El pozo
> aporta **confiabilidad** llenando de a poco; el tajamar aporta el **caudal** de la hora de riego, y
> ademas queda como bebedero. El tajamar deja de ser la fuente y pasa a ser el **pulmon**, que es el
> papel donde no tiene competencia. **El pozo tapa el agujero del tajamar -- la seca -- y el tajamar
> tapa el del pozo -- el caudal.**

### El permiso, que no tenia en cuenta

El uso del agua lo rige la **Ley 3239/2007**, reglamentada por el **Decreto 7017/2022**, con
**MADES** como autoridad de aplicacion ([MADES](https://www.mades.gov.py/reglamentacion-de-la-ley-3239-07-de-los-recursos-hidricos-del-paraguay-y-decreto-reglamentario-7017-22/),
[Ley 3239](https://www.bacn.gov.py/leyes-paraguayas/2724/de-los-recursos-hidricos-del-paraguay)).

La ley declara de **libre disponibilidad, sin autorizacion**, el agua para **uso domestico y
produccion familiar basica** usada directamente por el usuario. **Si una hectarea comercial de tomate
entra en "produccion familiar basica" NO lo se, y no lo voy a suponer**: es consulta a MADES y es
gratis preguntarla. Aplica igual al pozo y al arroyo.

## Lo que hay que cotizar, en este orden

Es la lista para llevar a un proveedor, y esta ordenada por cuanto mueve el presupuesto:

1. **A cuantos metros sacaron agua los vecinos.** No se cotiza, se pregunta, y decide un presupuesto
   entre Gs 3,6 y 74 millones.
2. **Equipo de goteo para 1 ha**, con **filtro de arena dimensionado para agua de tajamar** y bomba.
   Pedir el conjunto, no las piezas sueltas, y decir explicitamente que la fuente es un tajamar.
   **Preguntar el caudal en m3/hora que necesita el equipo**, que es el numero que define la bomba.
3. **Tutorado para 18.000 plantas**: postes, alambre, hilo.
4. **Plantines de tomate**: precio por unidad o por bandeja. No se encontro publicado.
5. **Arada** con servicio privado, para comparar contra los Gs 250.000/ha de rastra del IPTA.
6. **Analisis de suelo** en el IPTA, antes de comprar fertilizante.
7. **A MADES**: si 1 ha comercial necesita permiso de uso de agua o entra en produccion familiar.

## Y esto toca la pregunta 0

El dueño dijo que *"a lo mejor"* hace su propio piloto de plantacion en el terreno. Si eso pasa,
**el primer productor es el dueño**, y eso es un escenario que
[PREGUNTAS.md](../PREGUNTAS.md) no tenia: los cuatro eran productor ajeno, cooperativa, junta de
agua u organismo.

**No cierra la pregunta 0 -- agrega una opcion, y de las buenas**: un piloto propio prueba el
producto entero sin tener que convencer a nadie, y genera el historico que el ML necesita. Lo que
**no** prueba es que alguien pague por el. Ver [banco-de-pruebas.md](../banco-de-pruebas.md), que
hasta hoy decia "sin cliente, sin presion".
