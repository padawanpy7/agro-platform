# Inventario de pantallas y principios de UI

**28/09/2026, segunda vuelta.** La primera versión de este documento se escribió **sin saber quién
usa el producto**, y se notaba: `ST_Contains` en la pantalla principal, `tenant` diez veces, NDVI
treinta y cuatro. El perfil real está en [quien-usa-esto.md](quien-usa-esto.md) y es la restricción
más dura que tiene este producto:

> *"Esto lo van a usar estancieros o capataces que jamás vinieron a Asunción y no saben de lo que es
> capaz la IA ni la informática."*

Esta versión está reescrita contra eso. **Leé ese documento antes que este.**

Contra qué más se escribió: [`proposal.md`](../proposal.md) (objetivo y no-objetivos),
[`design.md`](../design.md) §1 y §4, [`usuarios-roles-permisos.md`](usuarios-roles-permisos.md)
(el modelo de permisos, que es lo que hace posible §3), [`iot-hidroponia.md`](iot-hidroponia.md),
[`el-patio-de-casa.md`](el-patio-de-casa.md),
[`satelite-dron-y-cualquier-cultivo.md`](satelite-dron-y-cualquier-cultivo.md) y
[`como-aprender-de-cada-ciclo.md`](como-aprender-de-cada-ciclo.md).

El entregable clickeable es [`mockup/index.html`](mockup/index.html): un solo archivo, sin backend,
con un interruptor arriba para mirarlo **como capataz** o **como dueño**.

> **No hay app móvil nativa.** Es no-objetivo declarado del proposal. Es web responsive, y el caso
> de uso que manda el layout es **un teléfono barato, al sol, con una mano y las manos sucias**. El
> escritorio se resuelve solo; el teléfono no.

---

## 1. Los principios de UI

Los nueve primeros son las nueve reglas de [quien-usa-esto.md](quien-usa-esto.md) llevadas a
pantalla. Los cinco últimos salen del modelo de datos y del lazo de control. Si una pantalla
contradice alguno, la pantalla está mal.

### 1.1 La pantalla contesta una pregunta; no muestra datos

**La respuesta arriba y grande; el gráfico abajo, como justificación.** Cada pantalla abre con una
frase que se puede leer de un vistazo —*"Regá hoy temprano"*, *"Andá a mirar la manguera"*, *"No
hace falta nada"*— más **qué hacer** y **cuándo**. El gráfico, cuando existe, va después, y en la
vista del capataz va **plegado**: se abre si alguien lo quiere.

Era exactamente al revés en la primera versión: el gráfico arriba y la conclusión en ninguna parte.

### 1.2 Icono + palabra, nunca icono solo

Un icono solo es una adivinanza. Cada estado, cada botón y cada ítem del menú llevan figura **y**
palabra. Y la palabra es la del campo: *lote*, *potrero*, *manguera*, *pila*, *seco*, *mojado*,
*regar*, *bicho*, *cantero*.

### 1.3 El color nunca es el único canal

Al sol un verde y un naranja se parecen, y un daltónico no los distingue nunca. Cada estado lleva
**figura distinta** (círculo / triángulo / rombo / gota / círculo punteado) **y** palabra, además
del color. Las barras de "seco" llevan trama rayada además del color.

### 1.4 Se usa al sol, en un teléfono barato, con las manos sucias

La vista del capataz sube la tipografía base a 18 px, los blancos de toque a 56 px, y sube el
contraste de la tinta. Tiene además un botón **"Letra más grande"** que la lleva a 21 px. Nada
depende del hover ni de apuntar fino.

### 1.5 La señal es mala y el dato llega viejo

**"Última lectura: hace 3 días" va arriba, en grande, no en letra chica.** Está en cada fila de la
lista de lotes y en una franja propia arriba del lote. Un dato viejo presentado como fresco es la
peor mentira que puede decir esta app.

### 1.6 Las unidades son las de ellos

**Litros, no metros cúbicos.** Hectáreas. Guaraníes con separador de miles. Minutos. Milímetros de
lluvia. Nada de notación científica y nada de decimales que no se puedan leer de un vistazo.

### 1.7 Escribir en un teléfono en el campo es un castigo

La pantalla de anotar es **toda de elección**: lote de una lista, motivo de descarte de cinco
botones, cantidad de un desplegable. Lo único que se teclea son los kilos, con teclado numérico. La
foto de la trampa **no pide escribir nada**: el lugar y la hora los pone el teléfono.

### 1.8 Ninguna acción peligrosa a un toque

Guardar una cosecha pasa por una pantalla de confirmación que muestra **exactamente lo que se va a
guardar** antes de guardarlo. Nada se ejecuta con el resultado invisible.

### 1.9 Nada de IA visible

El sistema dice **"regá"** o **"no riegues"**. Nunca *"el modelo predice con 87 % de confianza"*, ni
*"probabilidad"*, ni *"algoritmo"*, ni *"predicción"*. La persona no sabe qué puede hacer un modelo
y no tiene por qué saberlo: tiene que saber qué hacer hoy.

### 1.10 No hay un botón para abrir la válvula, y no lo va a haber

El lazo de control vive en el campo (regla 3 del contrato). Lo único que la nube manda es **la
regla**: con qué tierra arranca, a qué hora, cuántos minutos. La pantalla lo dice en un cartel
arriba, en palabras, para que nadie lo busque. Y muestra **tres momentos distintos**: cuándo se
escribió, cuándo el aparato del lote avisó que la recibió, y desde cuándo la está usando.

### 1.11 Todo número dice de dónde salió

El ajuste de un aparato se muestra con **quién lo comprobó** —nosotros o el fabricante—, cómo y
cuándo. En la pantalla no dice "calibración": dice *"ajuste del aparato"*. Un ajuste sin decir de
dónde salió no es un número, es una creencia.

### 1.12 Un hueco es un hueco, nunca un cero

Un aparato que no reportó **no midió tierra seca**. La línea se corta y la franja dice *"no llegó
nada"*. Rellenar con cero le enseña lo mismo al ojo que a una cuenta: que la tierra se seca de
golpe.

### 1.13 Estar sin señal es normal, no es un error

El aparato del lote riega días sin enlace, por diseño. *"Sin noticias hace 3 días — el riego sigue
andando solo"* es **gris**, no rojo. El rojo se guarda para lo que obliga a subirse a la camioneta:
pila agotada, tierra tan seca que la planta sufre, agua que se está perdiendo. **Si todo es rojo,
nada es rojo.**

### 1.14 Nada se asigna a mano, y eso no se explica con el nombre de una función

Los aparatos caen adentro del lote por su posición. En la pantalla dice *"el sistema sabe cuál está
adentro de cuál"*; **no dice `ST_Contains`**. Si un aparato aparece en el lote equivocado, lo que se
corrige es **el dibujo del lote**, y todo lo demás se acomoda solo — y la pantalla de dibujo muestra
qué cambia **antes** de guardar.

### 1.15 Quién ve qué no se decide en la interfaz

Los datos de un cliente no se le muestran a otro, y eso lo hace cumplir la base de datos, no una
pantalla. La app **nunca ofrece "ver todos los clientes"**: esa pregunta no se puede hacer. La
pantalla de permisos decide qué puede **hacer** cada uno, y lo dice con esas palabras.

---

## 2. Qué ve el capataz, qué ve el dueño, y por qué

Esta es la sección que la primera versión no tenía, y es la que más cambia el producto.

### 2.1 No son dos aplicaciones: es una, de dos tamaños

Lo que hace posible esto ya está diseñado: el modelo de
[usuarios-roles-permisos.md](usuarios-roles-permisos.md) da permisos como pares
*(sobre qué, qué acción)* y roles como bolsas de permisos, con alcance por campo. **Los permisos no
son solo seguridad: son la densidad de información.** La misma app, con el rol `capataz`, muestra
tres pantallas; con el rol de dueño o técnica, muestra doce.

**No se construye una app aparte para el capataz.** Dos aplicaciones se desincronizan, cuestan el
doble y la del campo siempre queda vieja.

### 2.2 El capataz ve TRES pantallas

| | pantalla | qué es | qué decide |
|---|---|---|---|
| 1 | **Hoy** | La lista de lotes ordenada **por urgencia**, con la acción escrita en cada fila. Arriba, cuántos necesitan algo. | **Por dónde empiezo el día.** |
| 2 | **El lote** | La respuesta para ese lote, cuándo llegó la última lectura, el agua en la tierra **en palabras** (seco / bien / mojado a tres hondos), qué pasó estos días, y el gráfico **plegado**. | **Qué hago en este lote, y cuánto.** |
| 3 | **Anotar** | Cuatro botones grandes: anotar cosecha, sacar foto de la trampa, avisar que revisó la línea, avisar que regó a mano. | **Que lo que él sabe entre al sistema.** |

**Y no ve nada más.** Nada de reglas de riego, nada de ajustes de aparatos, nada de permisos, nada
de hidroponía, nada de dibujar lotes, nada de la pantalla de números crudos.

**Por qué esas tres y no otras.** Porque son las tres cosas que él hace: *mirar qué pasa*, *ir a un
lote*, y *contar lo que vio*. Todo lo demás son decisiones que no le tocan y que, puestas en su
menú, no le agregan poder: le agregan doce lugares donde perderse. **Mostrarle doce es el fracaso.**

**Lo que sí ve, y es importante que vea:** el estado de todos los lotes, incluidos los que no
necesitan nada. Saber que cuatro están bien es información, no relleno.

### 2.3 El dueño y la técnica ven DOCE

Las tres del capataz —con más detalle— más nueve que son decisiones de gestión, de plata o de
configuración. La lista completa está en §3.

**El corte no es por confianza, es por trabajo.** El dueño mira litros por kilo, costo de bombeo y
si conviene mover la hacienda. La técnica escribe las reglas de riego y anota los ajustes de los
aparatos. Ninguna de esas decisiones se toma parado en el lote con el teléfono en la mano.

### 2.4 Lo que ve un tercero que solo mira

Un comprador o una cooperativa que audita ve **dos**: el estado de los lotes y el historial de
riego. Alcanza para lo que le importa —cuánta agua se usó y cuándo— y no expone nada más.

### 2.5 Cómo se prueba, y es gratis

**El capataz del señor existe, planta tomate y sandía, y ya se ofreció a ayudar.** El plan está en
[quien-usa-esto.md](quien-usa-esto.md): dale el teléfono con el mockup abierto **y callate**. Lo que
busque y no encuentre, y lo que toque esperando otra cosa, es el diseño. En el mockup el
interruptor de arriba arranca en **capataz** justamente para eso.

---

## 3. El inventario

La columna **de dónde sale** dice contra qué objeto de [`design.md`](../design.md) §1 lee o escribe
cada pantalla. **Esos nombres son para nosotros y no aparecen nunca en la interfaz** (principio
1.14): acá están porque este documento lo leemos nosotros, no el capataz.

### Las tres del capataz

#### C1. Hoy — `#/capataz/hoy`

| | |
|---|---|
| **Para qué sirve** | Es la primera pantalla del día, y muchas veces la única. |
| **Qué muestra** | Una frase arriba con cuántos lotes necesitan algo. Después, un renglón grande por lote con: el nombre, **la acción escrita** (*"Regá hoy temprano"*, *"Andá a mirar la manguera"*), lo sembrado, el tamaño y **hace cuánto llegó la última lectura**. Ordenados por urgencia, no por nombre ni por fecha. |
| **De dónde sale** | `parcela`, última `medicion` por parcela, `riego_evento` del día, `dispositivo`, `captura_trampa`. |
| **Qué decisión permite** | **Por dónde empezar.** Y también: qué lotes puede dejar tranquilos. |

Abajo lleva un recuadro corto que dice que **si lo que él ve con los ojos no coincide con la
pantalla, gana lo que él ve**: que lo anote y avise. Un aparato se ensucia o queda mal enterrado, y
una app que no admite eso pierde al usuario el primer día que se equivoca.

#### C2. El lote — `#/capataz/lote`

| | |
|---|---|
| **Para qué sirve** | Todo lo que hace falta saber de un lote, en el orden en que se pregunta. |
| **Qué muestra** | La respuesta arriba y grande, con **cuándo hacerlo**. Una franja con la última lectura. **El agua en la tierra a tres hondos, en palabras** — arriba (10 cm), en la raíz (30 cm), abajo (60 cm), cada una con una barra y la palabra *seco* / *bien* / *mojado*. Qué pasó estos días, en renglones. Y el gráfico de 21 días **plegado**, que se abre si lo quiere. |
| **De dónde sale** | `parcela`, `medicion`, `riego_evento`, `politica_riego`, `dispositivo`. |
| **Qué decisión permite** | **Si riega y cuántos minutos.** La lectura de los tres hondos es lo que evita el error caro: si abajo todavía hay agua, veinte minutos alcanzan; regar de más manda el agua abajo de la raíz y se pierde. |

Tiene un desplegable arriba para cambiar de lote sin volver a Hoy.

#### C3. Anotar — `#/capataz/anotar`

| | |
|---|---|
| **Para qué sirve** | Que lo que el capataz sabe —y los aparatos no— entre al sistema. |
| **Qué muestra** | Cuatro botones grandes: **anotar lo que se cosechó**, **sacar foto de la trampa**, **avisar que revisó la manguera**, **avisar que regó a mano**. La cosecha se carga eligiendo: lote de una lista, kilos con teclado numérico, cuántos cajones se tiraron de un desplegable, y por qué de cinco botones. Después, **una pantalla de confirmación** con todo escrito antes de guardar. |
| **De dónde sale** | `campania` (rendimiento), `captura_trampa`, `riego_evento` (riego manual), nota de mantenimiento. |
| **Qué decisión permite** | Ninguna, y es a propósito: **es la pantalla que alimenta a todas las demás.** Sin el resultado anotado, los números describen y no enseñan. |

Si no hay señal, lo anotado **se guarda y se manda solo** cuando vuelva. La pantalla lo dice.

### Las doce del dueño y la técnica

#### D1. Los lotes — `#/duenio/lotes`

Mapa con los polígonos pintados por **cómo está** cada lote, los aparatos adentro como puntos
—llenos si están mandando, punteados si no—, y al lado la misma lista ordenada por urgencia del
capataz. Arriba, la respuesta: qué lotes necesitan algo hoy. Cinco números de cabecera, entre ellos
**litros de agua usados hoy**.
**De dónde sale:** `parcela` (geometría), `dispositivo`, última `medicion`, `riego_evento`, `campania`.
**Decide:** a qué lote hay que ir hoy.

#### D2. Un lote por dentro — `#/duenio/lote`

La versión larga de C2. Además del agua a tres hondos con el gráfico **abierto**: la lluvia y el
riego en la misma barra de tiempo, **cuánto verde hay** este año contra los nueve anteriores, los
últimos riegos con el agua esperada y la que salió, los aparatos del lote, y el último análisis de
tierra —que es el que fija la franja verde del gráfico—.
**De dónde sale:** `parcela`, `medicion`, `riego_evento`, `indice_espacial`, `analisis_suelo`, `campania`, `politica_riego`, `dispositivo`.
**Decide:** si el agua llegó a la raíz o pasó de largo, y por lo tanto si suben o bajan los minutos.

> **El gráfico de la humedad se dibuja hacia abajo porque la profundidad es hacia abajo.** Tres
> paneles apilados que comparten el tiempo, con una rampa de un solo tono donde más oscuro es más
> hondo: la profundidad es un **orden**, no cuatro identidades. Es la apuesta visual del producto y
> es lo que hace visible el sobre-riego.

#### D3. Qué regó y por qué — `#/duenio/riegos`

Una fila por riego con las cuatro piezas juntas: **por qué** (qué tierra leyó y de qué aparatos),
**qué hizo** (regó tantos minutos, o no regó), **con qué regla**, y **cuánta agua esperaba contra
cuánta salió**. La columna que importa es la diferencia: de más es pérdida, de menos es gotero
tapado o filtro sucio. Incluye las veces que decidió **no** regar, y marca los tramos en que el
aparato se puso solo en modo cuidadoso.
**De dónde sale:** `riego_evento`, `politica_riego`, `dispositivo` (caudalímetro), `medicion`.
**Decide:** mandar a alguien a caminar la línea, o cambiar la regla.

#### D4. Cuándo regar — `#/duenio/cuando`

La regla que el lote está usando, en palabras: con qué tierra arranca y con cuál corta, a qué hora,
cuántos minutos como máximo, cuántos litros por día, qué pasa si llovió, y a los cuántos días sin
noticias se pone en modo cuidadoso. Al lado, **cuándo le llegó al lote** (tres momentos) y una
comparación: *"con este número habría regado 9 veces en vez de 14"*. Abajo, las reglas anteriores,
que no se corrigen: se cierran y se escribe otra.
**De dónde sale:** `politica_riego`, `parcela`, `riego_evento`.
**Decide:** regar antes o después, más o menos. **Y no hay botón de válvula** (principio 1.10).

#### D5. Cuánto pasto hay — `#/duenio/verde`

Lo que antes se llamaba NDVI. Tres vistas: los potreros ordenados **de más a menos pasto** hoy; un
potrero contra **lo peor y lo mejor de sus nueve años**; y **si el lote es parejo o disparejo**, que
es lo que decide cuántos aparatos lleva. Cada dato dice si vino del satélite o de un vuelo de dron.
**De dónde sale:** `indice_espacial` (media, p10, p90, coeficiente de variación, fuente, resolución), `parcela`.
**Decide:** a qué potrero mover la hacienda, cuál se está gastando, y dónde enterrar el próximo aparato.

Y dice **dónde no sirve**: 38 m² de patio son menos de un píxel del satélite. La pantalla lo escribe
en vez de mostrar un número que no significa nada.

#### D6. Los números con detalle — `#/duenio/numeros`

El explorador crudo, para la técnica. Cualquier aparato, cualquier medición, cualquier rango, con un
interruptor **sin tocar / con el ajuste / los dos**, el hueco dibujado como hueco, y el ajuste
vigente a la vista con su procedencia. Baja planilla.
**De dónde sale:** `medicion`, `calibracion`, `dispositivo`, el catálogo de magnitudes.
**Decide:** si el aparato está diciendo la verdad — y por lo tanto si hay que recalcular el histórico
en vez de tirarlo.

#### D7. Los aparatos — `#/duenio/aparatos`

Cada aparato con qué hace, dónde está, **pila**, **hace cuánto mandó algo**, cuánto tarda en llegar,
las últimas lecturas en miniatura y **el ajuste que usa, con quién lo comprobó**. Debajo, todos los
ajustes anteriores, que no se borran nunca. Y una ficha aparte para la sonda de acidez del patio,
que es la más delicada.
**De dónde sale:** `dispositivo`, `calibracion`, última `medicion`.
**Decide:** a qué aparato hay que ir a cambiarle la pila o comprobarle la sonda.

#### D8. Dibujar un lote — `#/duenio/dibujar`

Traer el archivo del GPS, dibujar sobre el mapa o cargar los mojones. Muestra el límite viejo y el
nuevo superpuestos, y **qué cambia si se guarda** —cuántos aparatos quedan adentro y cuál queda
afuera, cuántas lecturas se reasignan— **antes** de guardar.
**De dónde sale:** `parcela.geom`, `dispositivo.punto`, `campo`, `cliente`.
**Decide:** cuál es la unidad de análisis. Todo lo demás cuelga de acá.

#### D9. El agua de la hidroponía — `#/duenio/hidro`

El segundo caso de uso, y la única pantalla donde sobreviven las unidades técnicas (mS/cm), porque
**el capataz no la abre nunca**. Cuatro lecturas con su rango: **calor del agua** (con la raya de los
24 °C, que es donde la lechuga se va a semilla), **cuánta agua queda**, **sales** y **acidez**. Las
sales y el nivel se muestran juntos a propósito: si baja el agua, las sales se concentran solas — y
eso se arregla con agua, no con abono. Debajo, la receta vigente y lo que se hizo en la mesa.
**De dónde sale:** `medicion`, `solucion_nutritiva` (tabla nueva), `riego_evento` con tipo recirculación o dosificación, `calibracion`.
**Decide:** si hay que cambiar el agua, agregarle, corregir la acidez o poner media sombra.

La acidez entra **a mano**, con el aparatito, y la pantalla lo marca como tal. No se automatiza una
decisión que todavía no se sabe tomar a mano.

#### D10. Las pruebas — `#/duenio/pruebas`

El método de bloques de [como-aprender-de-cada-ciclo.md](como-aprender-de-cada-ciclo.md), en
palabras: **canteros**, no "bloques experimentales". Cada uno con **qué se cambió**, cuál es el
testigo, y cómo salió: peso por planta, cuántas se cosecharon, cuántas se tiraron y por qué, cuántos
días. Arriba, **qué se buscaba en este ciclo, escrito antes de plantar** — uno solo. Y una
advertencia cuando entre dos canteros cambió más de una cosa, porque ahí la comparación no prueba
nada.
**De dónde sale:** `bloque_experimental` (tabla nueva), `campania`, `medicion`, `riego_evento`.
**Decide:** qué se cambia en el ciclo siguiente, sabiendo qué lo causó.

#### D11. Avisos — `#/duenio/avisos`

Una fila por aviso con **qué pasó**, **qué se vio** (el dato que lo disparó), **desde cuándo** y
**qué hacer**. Tres niveles: urgente (ir al lote), para mirar (hoy) y para saber (sin noticias,
cuota del satélite). Se pueden callar, pero **pidiendo el motivo y hasta cuándo**.
**De dónde sale:** `medicion`, `riego_evento`, `dispositivo`, `captura_trampa`, `indice_espacial`, `politica_riego`.
**Decide:** qué se atiende primero.

#### D12. Quién entra y qué puede hacer — `#/duenio/gente`

Las personas del cliente con su rol, su alcance, su última entrada y —la columna que importa—
**cuántas pantallas ve cada una**. Debajo, una tabla explícita de qué puede hacer cada rol. Y un
recuadro que dice, en palabras, que **sacarle un permiso a alguien no es lo que esconde los datos de
otro cliente**: eso lo hace la base de datos.
**De dónde sale:** `usuario`, `membresia`, `rol`, `permiso`, `campo`, `cliente`.
**Decide:** a quién se le da la llave de cuándo riega, que es lo único que mueve agua de verdad.

---

## 4. Qué NO es pantalla, a propósito

- **El análisis de tierra** es un panel dentro del lote. Es un evento raro, no un espacio.
- **Las capturas de trampa** son un renglón en Hoy y un aviso. Darles pantalla propia sería
  inventarles tráfico.
- **La lista de aparatos** no existe para el capataz: si un aparato falla, lo que él ve es
  *"sin noticias de ese lote"*, que es lo que le sirve. Los números de serie son de la técnica.

---

## 5. La traducción, aplicada

Salida de la tabla de [quien-usa-esto.md](quien-usa-esto.md). **Nada de la columna izquierda aparece
en el mockup**, verificado contando.

| en vez de | en la pantalla dice |
|---|---|
| `ST_Contains` | *"el sistema sabe cuál está adentro de cuál"* |
| tenant / inquilino | no se nombra. El selector dice *"Estás viendo"* |
| NDVI | **"cuánto pasto hay"** / *"cuánto verde hay"*, y el número de 0 a 100 |
| p10 / p90 | *"entre lo peor y lo mejor de los últimos 9 años"* |
| coeficiente de variación | **"¿el lote es parejo o disparejo?"** |
| calibración, `calibracion_id` | *"el ajuste del aparato"* y *"quién lo comprobó"* |
| política de riego | **"la regla"** / *"cuándo regar"* |
| programa conservador | *"se pone solo en modo cuidadoso"* |
| dispositivo | **"aparato"** |
| parcela | **"lote"** / *"potrero"* |
| bloque experimental | **"cantero"**, y el control es **"el testigo"** |
| umbral | *"cuando la tierra baja de"* |
| litros estimados / medidos | **"agua esperada" / "agua que salió"** |
| m³ | **litros** |
| EC, mS/cm | se quedan **solo en la pantalla de hidroponía** |
| sin señal | *"sin noticias"* — ya estaba bien |

---

## 6. Qué del mockup es diseño y qué es andamio

[`mockup/index.html`](mockup/index.html) es **un mockup**: un archivo, sin backend, sin API, sin
estado que sobreviva a un refresh. Sirve para discutir jerarquía, orden de lectura, tamaño de toque
y comportamiento en teléfono — no para probar datos.

**Es andamio, y no va a estar en el producto:** el interruptor *Capataz / Dueño* de arriba (en la
app de verdad el rol sale del permiso de la persona, no de un botón), el rol en la dirección
(`#/capataz/hoy`), el cambiador de tema y el cartel amarillo.

**Los datos son de ejemplo y están marcados en la propia pantalla.** Los nombres de lote, los
cultivos, las unidades y los guaraníes son verosímiles a propósito para que el layout se vea con
texto real; **ninguna cifra salió de una medición**. El cartel de arriba lo dice y no se puede
cerrar.

**Lo que sí es diseño y hay que aprobar o rechazar:** el orden respuesta-primero, el corte de tres
pantallas contra doce, el agua en la tierra dicha en palabras, el gráfico plegado, los tamaños de
toque, y el vocabulario entero.
