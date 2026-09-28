# Inventario de pantallas y principios de UI

**28/09/2026, tercera vuelta.** El producto es **agropecuaria de precisión** — no "riego de
precisión", que es el nombre de una línea
([preparado-para-ganaderia.md](preparado-para-ganaderia.md) §1). En esta fase sólo hay agricultura,
pero el mapa y el vocabulario tienen que aguantar ganadería: **potrero, corral, aguada, hacienda**.

Dos cosas cambiaron respecto de la vuelta anterior, y las dos son decisión del dueño:

1. **Hay UNA sola app.** Se eliminó la "vista capataz" como vista separada, y con ella el
   interruptor de rol. **Lo que cada persona ve lo decide su permiso y no se rotula en la
   pantalla.** No hay cartel que diga "estás en la vista de tal", no hay opciones apagadas: quien
   no tiene permiso para cambiar las reglas de riego simplemente no ve esa opción en el menú.
2. **El mapa tiene dos niveles**: el **campo** —el establecimiento entero— y los **potreros y
   lotes** de adentro.

**Lo que NO cambió, y es lo que sostiene todo:** las nueve reglas de
[quien-usa-esto.md](quien-usa-esto.md) siguen vigentes. El usuario sigue siendo alguien que nunca
vino a Asunción. Todo lo que se aprendió diseñando la vista del campo —la respuesta arriba y grande
antes que el gráfico, la acción escrita en cada renglón, el agua dicha en palabras, el gráfico
plegado, ícono más palabra, *"última lectura hace X"* arriba— **ahora es cómo se comporta la app
entera**. La app única no vuelve a la densidad del primer mockup.

Contra qué más se escribió: [`proposal.md`](../proposal.md), [`design.md`](../design.md) §1 y §4,
[`preparado-para-ganaderia.md`](preparado-para-ganaderia.md) §5 (los dos niveles del mapa),
[`usuarios-roles-permisos.md`](usuarios-roles-permisos.md) (los permisos),
[`iot-hidroponia.md`](iot-hidroponia.md), [`el-patio-de-casa.md`](el-patio-de-casa.md),
[`satelite-dron-y-cualquier-cultivo.md`](satelite-dron-y-cualquier-cultivo.md) y
[`como-aprender-de-cada-ciclo.md`](como-aprender-de-cada-ciclo.md).

El entregable clickeable es [`mockup/index.html`](mockup/index.html): un solo archivo, sin backend.

> **No hay app móvil nativa.** Es no-objetivo declarado del proposal. Es web responsive, y el caso
> de uso que manda el layout es **un teléfono barato, al sol, con una mano y las manos sucias**.

---

## 1. Los principios de UI

Los nueve primeros son las nueve reglas de [quien-usa-esto.md](quien-usa-esto.md). Los siguientes
salen del modelo de datos y del lazo de control. **Aplican a la app entera**, no a un modo.

### 1.1 La pantalla contesta una pregunta; no muestra datos

**La respuesta arriba y grande; el gráfico abajo, y plegado.** Cada pantalla abre con una frase que
se lee de un vistazo —*"Regá hoy temprano"*, *"Andá a mirar la manguera"*, *"148,0 hectáreas en
total, y solo 108,7 son potreros o lotes"*— más **qué hacer** y **cuándo**. Los gráficos del
potrero viven dentro de dos desplegables cerrados: están para quien los quiera, no delante de quien
no.

### 1.2 Icono + palabra, nunca icono solo

Cada estado, cada botón y cada ítem del menú llevan figura **y** palabra. Y la palabra es la del
campo: *lote*, *potrero*, *manguera*, *pila*, *tajamar*, *corral*, *hacienda*, *seco*, *mojado*,
*regar*, *bicho*, *cantero*.

### 1.3 El color nunca es el único canal

Cinco figuras distintas de estado —rombo (urgente), gota (regar), triángulo (mirar), círculo
(bien), círculo punteado (sin noticias)— además de color y palabra. Las barras de "seco" llevan
trama rayada. El monte del mapa lleva trama, no sólo color.

### 1.4 Se usa al sol, en un teléfono barato, con las manos sucias

**Esto es el default de la app, no un modo:** tipografía base de 18 px, blancos de toque de 56 px,
tinta de contraste alto. Más un botón **"Letra más grande"** que la lleva a 21 px. Es un ajuste del
usuario, igual que el tema oscuro — no es un rol.

### 1.5 La señal es mala y el dato llega viejo

**"Última lectura: hace 3 días" va arriba, en grande.** Está en cada renglón de la lista y en una
franja propia arriba del potrero.

### 1.6 Las unidades son las de ellos

**Litros, no metros cúbicos.** Hectáreas, minutos, milímetros, guaraníes con separador de miles.

### 1.7 Escribir en un teléfono en el campo es un castigo

*Anotar* es todo elección: de dónde, de una lista; el motivo, de cinco botones; la cantidad, de un
desplegable. Lo único que se teclea son los kilos. La foto de la trampa no pide escribir nada.

### 1.8 Ninguna acción peligrosa a un toque

Guardar pasa por una pantalla que muestra **exactamente lo que se va a guardar** antes de guardarlo.

### 1.9 Nada de IA visible

El sistema dice **"regá"** o **"no riegues"**. Nunca *"el modelo predice"*, ni *"probabilidad"*, ni
*"confianza"*.

### 1.10 No hay un botón para abrir la válvula, y no lo va a haber

Lo único que la nube manda es **la regla**. La pantalla lo dice arriba, en palabras, y muestra
**tres momentos distintos**: cuándo se escribió, cuándo el aparato avisó que la recibió, y desde
cuándo la está usando.

### 1.11 Todo número dice de dónde salió

*"El ajuste del aparato"*, con **quién lo comprobó** —nosotros o el fabricante—, cómo y cuándo.

### 1.12 Un hueco es un hueco, nunca un cero

La línea se corta y la franja dice *"no llegó nada"*.

### 1.13 Estar sin señal es normal, no es un error

*"Sin noticias hace 3 días — el riego sigue andando solo"* es **gris**. El rojo se guarda para lo
que obliga a subirse a la camioneta. **Si todo es rojo, nada es rojo.**

### 1.14 Nada se asigna a mano, y eso no se explica con el nombre de una función

En la pantalla dice *"el sistema sabe cuál está adentro de cuál"*. Si algo aparece donde no va, lo
que se corrige es **el dibujo**, y la pantalla muestra qué cambia **antes** de guardar.

### 1.15 El permiso decide la densidad, y no se rotula

**No hay modos ni vistas con nombre.** Alguien que sólo anota cosecha ve cuatro cosas en el menú;
quien escribe las reglas de riego ve catorce. Es la misma app. Nunca se le dice a nadie *"esto es
para otro rol"*: la opción no está, y listo. Ver §2.

### 1.16 El mapa tiene dos niveles, y sólo uno se toca

El **campo** es el fondo: contexto, límites, el dibujo general. Los **potreros y lotes** son lo que
se toca. Ver §3.

---

## 2. Qué habilita cada permiso

Reemplaza a la sección "qué ve cada rol" de la vuelta anterior. **La diferencia no es cosmética:**
antes había dos vistas con nombre; ahora hay una app cuyo menú se arma con los permisos de quien
entró.

### 2.1 Cómo funciona

El modelo de [usuarios-roles-permisos.md](usuarios-roles-permisos.md) da permisos como pares
*(sobre qué, qué acción)* y roles como bolsas de permisos, con alcance por campo. La app construye
el menú **a partir de los permisos**, no de un rol hardcodeado. **Los permisos no son sólo
seguridad: son la densidad de información.**

### 2.2 Qué permiso habilita qué

| permiso | qué aparece en el menú | por qué |
|---|---|---|
| *ver el campo* (lo tiene todo el mundo) | **Hoy**, **El campo entero**, **Un potrero o un lote**, **Avisos** | Son el estado y la acción del día. Sin esto no hay app. |
| *anotar resultado* | **Anotar algo** | Cosecha, foto de trampa, riego a mano, movimiento de hacienda. Es lo que mete al sistema lo que sólo sabe la persona. |
| *ver el riego* | **Qué regó y por qué** | Auditoría del lazo: qué decidió y con qué dato. |
| *escribir la regla de riego* | **Cuándo regar** | Es la única escritura con consecuencia física. |
| *ver el pasto* | **Cuánto pasto hay** | Comparar potreros y años. Decide a dónde va la hacienda. |
| *mantener aparatos* | **Los aparatos**, **Los números con detalle** | Pilas, sondas, ajustes y el dato crudo. |
| *dibujar* | **Dibujar el campo** | Los dos niveles del mapa. |
| *hidroponía* | **El agua de la hidroponía**, **Las pruebas** | Es otro módulo: quien no lo tiene, no lo ve nunca. |
| *administrar gente* | **Quién entra y qué puede hacer** | Dar y sacar permisos. |

### 2.3 La consecuencia práctica, con dos personas de ejemplo

- Alguien con *ver el campo* + *anotar resultado* ve **cuatro cosas** en el menú: Hoy, El campo,
  Un potrero, Anotar, más los Avisos. Nunca ve una regla de riego ni un número de serie.
- Alguien con todos los permisos ve **catorce**.

**Es la misma pantalla de inicio para los dos.** Lo que cambia es cuánto hay abajo. Y a nadie se le
dice que le falta algo: mostrar opciones apagadas es contarle a la persona lo que no puede hacer,
que no le sirve para nada.

### 2.4 Y un tercero que sólo mira

Un comprador o una cooperativa que audita tiene *ver el campo* + *ver el riego* con alcance a dos
lotes. Le alcanza para lo que le importa —cuánta agua se usó y cuándo— y no expone nada más.

### 2.5 Cómo se prueba, y es gratis

El plan sigue siendo el de [quien-usa-esto.md](quien-usa-esto.md): **dale el teléfono con el mockup
abierto y callate.** Lo que busque y no encuentre, y lo que toque esperando otra cosa, es el diseño.

---

## 3. El mapa en dos niveles

Sale de [preparado-para-ganaderia.md](preparado-para-ganaderia.md) §5, y **toca el modelo**: el
`campo` hoy figura como catálogo sin geometría. Le falta `campo.geom geometry(Polygon, 4326)` con
índice GiST, más la validación `ST_Contains(campo.geom, parcela.geom)` — que un potrero se salga del
campo es un error de carga y conviene que salte al dibujarlo. **Se agrega en la migración de la fase
1, que es cuando sale gratis.**

| nivel | qué es | en el mapa | contesta |
|---|---|---|---|
| **Campo** | El establecimiento entero | **El fondo.** Borde grueso, relleno neutro, **no se toca y no se apaga** | *"cuánta tierra tengo y dónde termina"* |
| **Potrero / lote** | La división de adentro | **Lo que se toca.** Pintado por cómo está, clickeable, con su código (`P1`…`P6`) | *"a cuál muevo la hacienda", "dónde riego"* |

### 3.1 La trampa: sumar los potreros no da el campo

Entre los potreros hay **monte, caminos, casco, corral y tajamar**. Es tierra real que no pertenece
a ningún potrero, y el mockup la dibuja: la franja de monte del arroyo con trama, el tajamar, el
casco, el corral y el camino.

**Y de ahí sale la consecuencia que hay que dejar clarísima en el diseño:**

> **Mirar cuánto verde hay en el campo entero no sirve para decidir nada.** Las 26 hectáreas de
> monte están verdes todo el año y no se las come ninguna vaca. **El número que decide es el del
> potrero.**

La pantalla **El campo entero** lo dice con esas palabras, al lado del reparto de hectáreas. No es
una nota al pie: es un recuadro de advertencia, porque es el error que un tablero mal hecho induce
solo.

### 3.2 La leyenda está afuera del dibujo, y es un panel de capas

**Adentro del dibujo escribir el nombre completo no entra: se solapa todo.** Por eso:

- **Adentro van códigos cortos.** `P1`…`P6` para potreros y lotes, `S1`…`S18` para aparatos, `A1` y
  `A2` para aguadas y tajamar. El código va en una chapita con borde, no suelto sobre el polígono.
- **El nombre largo vive afuera**, en el panel, al lado de su código. Y aparece entero **al tocar**:
  tocar el polígono o su renglón en el panel muestra una franja debajo del mapa con el código, el
  nombre completo, qué es y qué hay que hacer, más un botón para abrirlo. **El primer toque muestra;
  el segundo abre** — nada se ejecuta sin que se vea antes qué es (principio 1.8).
- **El panel va al costado cuando el mapa tiene lugar y abajo cuando no.** No depende del ancho de
  la ventana sino del ancho que le queda al mapa, que es lo que de verdad importa.

**El panel es un árbol de dos niveles con casilla de verdad en cada uno:**

```
[x] Potreros y lotes (6)     <- apaga los seis de una
    [x] P1 · Potrero Yvyra'i     potrero · 42,0 ha
    [x] P2 · Potrero Costa Guasu potrero · 58,4 ha
    ...
[x] Aparatos (18)
    [x] S1 · humedad · en P1
    ...
[x] Aguadas (2)
[x] Monte              26,0 ha
[x] Caminos             4,8 ha
[x] Casco y corral      1,5 ha
```

- El grupo se despliega con su flecha y se apaga de a uno adentro.
- **Si algunos hijos están apagados, el padre queda en estado intermedio** —la casilla con guión—,
  no apagado. Volver a tocar el padre enciende todo; tocarlo con todo encendido apaga todo.
- **Casilla de verdad, no un color que hay que adivinar** (principio 1.3). Cada renglón es un blanco
  de toque de 56 px arriba y 46 px adentro del grupo, y la casilla y el nombre son **dos blancos
  separados**: uno apaga, el otro muestra el nombre.
- **El campo —el borde de afuera— no está en la lista**: no se apaga nunca, porque es el marco.

### 3.3 Apagar esconde, no borra — y la cuenta no cambia

Apagar una capa **la saca del dibujo y nada más**. La tabla de hectáreas de la derecha **no se
mueve**, porque esa es la tierra que hay, no lo que se está mirando. El panel lo dice en su pie, con
esas palabras.

> **Una duda honesta para el dueño:** que el mapa cambie y la cuenta no puede leerse como un error.
> La alternativa sería que la tabla siguiera a las capas, y eso sería peor: convertiría un número de
> superficie —que es un hecho del campo— en una consecuencia de qué casillas quedaron tocadas.
> Se eligió que la cuenta sea el hecho. **Si al probarlo con alguien esto confunde, se cambia** —
> pero conviene probarlo antes de decidir.

### 3.4 Los dos niveles no se dibujan a mano

El archivo que el dueño arma con Google Earth trae los dos: el perímetro es el campo y cada división
es un potrero. La pantalla de dibujo los trata por separado —el borde se carga una vez y casi no se
toca; las divisiones se corrigen seguido— y muestra qué se recalcula antes de guardar.

---

## 4. El inventario

Catorce pantallas. La columna **de dónde sale** dice contra qué objeto de
[`design.md`](../design.md) §1 lee o escribe. **Esos nombres son para nosotros y no aparecen nunca
en la interfaz** (principio 1.14).

### 1. Hoy — `#/hoy`

| | |
|---|---|
| **Para qué sirve** | Es la primera pantalla del día, y muchas veces la única. |
| **Qué muestra** | Arriba, cuántos lugares necesitan algo. Después, un renglón grande por potrero o lote con el nombre, **la acción escrita** (*"Andá a mirar la manguera"*), qué es y de qué, el tamaño y **hace cuánto llegó la última lectura** — ordenados por urgencia. Debajo, **el mapa de los dos niveles con su panel de capas**. |
| **De dónde sale** | `campo.geom`, `parcela`, última `medicion` por parcela, `riego_evento` del día, `dispositivo`, `captura_trampa`. |
| **Qué decisión permite** | **Por dónde empezar el día**, y qué se puede dejar tranquilo. |

Lleva un recuadro que dice que **si lo que se ve con los ojos no coincide con la pantalla, gana lo
que se ve**: que lo anoten y avisen. Un aparato se ensucia o queda mal enterrado, y una app que no
admite eso pierde al usuario el primer día que se equivoca.

### 2. El campo entero — `#/campo`

| | |
|---|---|
| **Para qué sirve** | El contexto: cuánta tierra hay y dónde termina. |
| **Qué muestra** | El mapa a todo el ancho con su **panel de capas** al costado, y debajo **el reparto de hectáreas**: potreros y lotes, monte, caminos, bajos, tajamar, casco. Más la advertencia de §3.1 y de dónde salió el borde. |
| **De dónde sale** | `campo` + `campo.geom` (nuevo), `parcela.geom`. |
| **Qué decisión permite** | Cuánta tierra hay de verdad en producción, y **no confundir el verdor del campo con el del potrero**. |

### 3. Un potrero o un lote — `#/lote`

| | |
|---|---|
| **Para qué sirve** | Todo lo que hace falta saber de una división, en el orden en que se pregunta. |
| **Qué muestra** | Un desplegable para cambiar de potrero. **La respuesta arriba y grande**, con cuándo hacerlo. Una franja con la última lectura. **El agua en la tierra a tres hondos, en palabras** — arriba (10 cm), en la raíz (30 cm), abajo (60 cm), con barra y la palabra *seco* / *bien* / *mojado*. Qué pasó estos días. Y **dos desplegables cerrados**: el dibujo del agua en la tierra, y la lluvia, el riego y el pasto. Después, los aparatos, el análisis de tierra y cuatro números. |
| **De dónde sale** | `parcela`, `medicion`, `riego_evento`, `politica_riego`, `indice_espacial`, `analisis_suelo`, `campania`, `dispositivo`. |
| **Qué decisión permite** | **Si riega y cuántos minutos.** Los tres hondos evitan el error caro: si abajo todavía hay agua, veinte minutos alcanzan; regar de más manda el agua abajo de la raíz y se pierde. |

> **El gráfico de la humedad se dibuja hacia abajo porque la profundidad es hacia abajo.** Tres
> paneles apilados que comparten el tiempo, con una rampa de un solo tono donde más oscuro es más
> hondo: la profundidad es un **orden**, no cuatro identidades. Es la apuesta visual del producto —
> y **va plegado**, porque la respuesta ya está arriba en una frase.

### 4. Anotar algo — `#/anotar`

Cinco botones grandes: **anotar lo que se cosechó**, **sacar foto de la trampa**, **avisar que
revisó la manguera**, **avisar que regó a mano**, **avisar que movió la hacienda de potrero**. Todo
de elección, con pantalla de confirmación antes de guardar.
**De dónde sale:** `campania` (rendimiento), `captura_trampa`, `riego_evento`, notas de mantenimiento, y el movimiento de hacienda que el modelo de ganadería va a necesitar.
**Decide:** nada, y es a propósito — **es la pantalla que alimenta a todas las demás.**

### 5. Qué regó y por qué — `#/riegos`

Una fila por riego con **por qué**, **qué hizo**, **con qué regla** y **cuánta agua esperaba contra
cuánta salió**. La diferencia es el diagnóstico: de más es pérdida, de menos es gotero tapado o
filtro sucio. Incluye las veces que decidió **no** regar y los tramos en modo cuidadoso.
**De dónde sale:** `riego_evento`, `politica_riego`, `dispositivo`, `medicion`.
**Decide:** mandar a alguien a caminar la línea, o cambiar la regla.

### 6. Cuándo regar — `#/cuando`

La regla en palabras, **cuándo le llegó al potrero** (tres momentos) y una comparación *"con este
número habría regado 9 veces en vez de 14"*. Abajo, las reglas anteriores, que no se corrigen: se
cierran y se escribe otra.
**De dónde sale:** `politica_riego`, `parcela`, `riego_evento`.
**Decide:** regar antes o después, más o menos. **Y no hay botón de válvula** (principio 1.10).

### 7. Cuánto pasto hay — `#/verde`

Los potreros ordenados **de más a menos pasto** hoy; uno contra **lo peor y lo mejor de sus nueve
años**; y **si es parejo o disparejo**, que decide cuántos aparatos lleva. Cada dato dice si vino
del satélite o de un vuelo de dron, y **dónde no sirve**.
**De dónde sale:** `indice_espacial`, `parcela`.
**Decide:** a qué potrero mover la hacienda, cuál se está gastando, dónde enterrar el próximo aparato.

### 8. Los aparatos — `#/aparatos`

Cada aparato con qué hace, dónde está, **pila**, **hace cuánto mandó algo**, las últimas lecturas en
miniatura y **el ajuste que usa, con quién lo comprobó**. Debajo, todos los ajustes anteriores, que
no se borran nunca.
**De dónde sale:** `dispositivo`, `calibracion`, última `medicion`.
**Decide:** a qué aparato hay que ir a cambiarle la pila o comprobarle la sonda.

### 9. Dibujar el campo — `#/dibujar`

**Los dos niveles, separados y explicados**: el borde de afuera se carga una vez y casi no se toca;
las divisiones de adentro se corrigen seguido. Muestra el límite viejo y el nuevo superpuestos y
**qué cambia si se guarda** antes de guardar.
**De dónde sale:** `campo.geom` (nuevo), `parcela.geom`, `dispositivo.punto`.
**Decide:** cuál es la unidad de análisis. Todo lo demás cuelga de acá.

### 10. Los números con detalle — `#/numeros`

El explorador crudo. Cualquier aparato, cualquier medición, cualquier rango, con un interruptor
**sin tocar / con el ajuste / los dos**, el hueco dibujado como hueco, y el ajuste vigente a la
vista con su procedencia.
**De dónde sale:** `medicion`, `calibracion`, `dispositivo`, catálogo de magnitudes.
**Decide:** si el aparato está diciendo la verdad — y si hay que recalcular el histórico.

### 11. El agua de la hidroponía — `#/hidro`

El segundo caso de uso, y la única pantalla donde sobreviven las unidades técnicas (mS/cm), porque
quien no tiene ese módulo no la abre nunca. **Calor del agua** (con la raya de los 24 °C), **cuánta
agua queda**, **sales** y **acidez**. Las sales y el nivel van juntos a propósito.
**De dónde sale:** `medicion`, `solucion_nutritiva` (nueva), `riego_evento`, `calibracion`.
**Decide:** cambiar el agua, agregarle, corregir la acidez o poner media sombra.

### 12. Las pruebas — `#/pruebas`

El método de bloques, en palabras: **canteros** y **testigo**. Cada uno con qué se cambió y cómo
salió. Arriba, **qué se buscaba en el ciclo, escrito antes de plantar** — uno solo. Y una
advertencia cuando entre dos canteros cambió más de una cosa.
**De dónde sale:** `bloque_experimental` (nueva), `campania`, `medicion`, `riego_evento`.
**Decide:** qué se cambia en el ciclo siguiente, sabiendo qué lo causó.

### 13. Avisos — `#/avisos`

**Qué pasó**, **qué se vio**, **desde cuándo** y **qué hacer**. Tres niveles. Se pueden callar,
pidiendo motivo y hasta cuándo.
**De dónde sale:** `medicion`, `riego_evento`, `dispositivo`, `captura_trampa`, `indice_espacial`, `politica_riego`.
**Decide:** qué se atiende primero.

### 14. Quién entra y qué puede hacer — `#/gente`

Las personas con su rol, su alcance y **cuántas cosas le aparecen en el menú**. Debajo, la tabla de
**qué habilita cada permiso**. Y un recuadro que dice, en palabras, que **sacarle un permiso a
alguien no es lo que esconde los datos de otro cliente**: eso lo hace la base de datos.
**De dónde sale:** `usuario`, `membresia`, `rol`, `permiso`, `campo`, `cliente`.
**Decide:** a quién se le da la llave de cuándo riega.

---

## 5. Qué NO es pantalla, a propósito

- **El análisis de tierra** es un panel dentro del potrero. Es un evento raro, no un espacio.
- **Las capturas de trampa** son un renglón en Hoy y un aviso.
- **Los gráficos del potrero** no son una pantalla ni están a la vista: viven en dos desplegables
  cerrados, debajo de la respuesta.

---

## 6. La traducción, aplicada

Salida de la tabla de [quien-usa-esto.md](quien-usa-esto.md). **Nada de la columna izquierda aparece
en el mockup**, verificado contando.

| en vez de | en la pantalla dice |
|---|---|
| `ST_Contains`, `campo.geom` | *"el sistema sabe cuál está adentro de cuál"*, *"el borde de afuera"* |
| tenant / inquilino | no se nombra. El selector dice *"Estás viendo"* |
| NDVI | **"cuánto pasto hay"** / *"cuánto verde hay"*, de 0 a 100 |
| p10 / p90 | *"entre lo peor y lo mejor de los últimos 9 años"* |
| coeficiente de variación | **"¿el potrero es parejo o disparejo?"** |
| calibración, `calibracion_id` | *"el ajuste del aparato"* y *"quién lo comprobó"* |
| política de riego | **"la regla"** / *"cuándo regar"* |
| programa conservador | *"se pone solo en modo cuidadoso"* |
| dispositivo | **"aparato"** |
| parcela | **"potrero"** o **"lote"**, según lo que sea |
| campo / establecimiento | **"el campo"**, *"el borde de afuera"* |
| bloque experimental | **"cantero"**, y el control es **"el testigo"** |
| umbral | *"cuando la tierra baja de"* |
| litros estimados / medidos | **"agua esperada" / "agua que salió"** |
| m³ | **litros** |
| EC, mS/cm | sólo en la pantalla de hidroponía |
| rol, vista, perfil | **no se nombran.** El menú simplemente tiene menos cosas |
| leyenda | **"qué se ve en el mapa"** |
| capa | no se nombra: cada renglón es *"potreros y lotes"*, *"monte"*, *"caminos"* |

---

## 7. Qué del mockup es diseño y qué es andamio

[`mockup/index.html`](mockup/index.html) es **un mockup**: un archivo, sin backend, sin API, sin
estado que sobreviva a un refresh.

**Es andamio y no va a estar en el producto:** el cartel amarillo y el selector de cliente del
encabezado. **No son andamio** el botón de *Letra más grande* ni el tema oscuro: son ajustes del
usuario y tienen que quedar.

**Los datos son de ejemplo y están marcados en la propia pantalla.** Los nombres, cultivos,
unidades y guaraníes son verosímiles a propósito para que el layout se vea con texto real;
**ninguna cifra salió de una medición**.

**Lo que sí es diseño y hay que aprobar o rechazar:** el orden respuesta-primero, el mapa de dos
niveles con el campo como fondo, **el panel de capas afuera del dibujo y los códigos cortos
adentro**, el agua en la tierra dicha en palabras, los gráficos plegados, el menú que se arma con
permisos y sin rótulos de rol, los tamaños de toque, y el vocabulario entero.

**Y una pregunta abierta, en §3.3:** apagar una capa cambia el dibujo pero **no** cambia la tabla de
hectáreas. Es a propósito, y está argumentado — pero es lo primero que conviene mirarle a alguien
cuando lo pruebe.
