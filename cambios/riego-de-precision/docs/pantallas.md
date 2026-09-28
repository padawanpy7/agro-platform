# Inventario de pantallas y principios de UI

**28/09/2026.** El front de la fase 1, diseñado antes de escribir la primera línea de Next.js.
Hoy **no existe código de front**: esto es diseño, y su entregable clickeable es
[`mockup/index.html`](mockup/index.html) -- un solo archivo, sin backend, con datos de ejemplo.

Contra qué se escribió: [`proposal.md`](../proposal.md) (objetivo y no-objetivos),
[`design.md`](../design.md) §1 (las doce tablas) y §4 (el front),
[`iot-hidroponia.md`](iot-hidroponia.md), [`el-patio-de-casa.md`](el-patio-de-casa.md),
[`satelite-dron-y-cualquier-cultivo.md`](satelite-dron-y-cualquier-cultivo.md) y
[`como-aprender-de-cada-ciclo.md`](como-aprender-de-cada-ciclo.md).

> **No hay app móvil nativa.** Es no-objetivo declarado del proposal. Todo esto es **web
> responsive**, y el caso de uso que manda el layout es **un teléfono al sol, con una mano**.
> El escritorio es el caso fácil y se resuelve solo; el teléfono no.

---

## 1. Los principios de UI, que salen del producto y no del gusto

Cada uno sale de una regla del contrato o de una decisión ya tomada. Si una pantalla los
contradice, la pantalla está mal.

### 1.1 No hay un botón "abrir válvula". Nunca.

La regla 3 del contrato: **el lazo de control vive en el campo; la nube manda la política**.
Consecuencia directa en la UI, y no es negociable:

- La única escritura que la app hace sobre el riego es **una fila nueva de `politica_riego`**:
  umbral de humedad, ventana horaria, duración máxima, caudal.
- La pantalla de política muestra **tres tiempos distintos**: cuándo se guardó, cuándo el
  controlador la **acusó recibo**, y desde cuándo **rige**. Un control que parece inmediato y no
  lo es, miente -- y acá el atraso puede ser de días.
- Lo más parecido a un botón de acción que existe es **"Forzar programa conservador"**, que
  también es política, no una orden.

### 1.2 Todo número muestra de dónde salió

`medicion` guarda `valor_crudo`, `valor_calibrado` y `calibracion_id`. La UI **muestra el
calibrado y deja el crudo y la fórmula a un toque**, con su procedencia: fabricante, ensayo
propio, fecha. Es la regla 7 del contrato llevada a pantalla: *un número de calibración sin
procedencia no es un número, es una superstición*. En hidroponía esto se gana el sueldo -- un pH
falso mata el cultivo en horas.

### 1.3 Dos relojes, siempre

`medido_en` es el eje de todo gráfico. `recibido_en` **no se esconde**: cuando el atraso pasa de
un umbral, la serie lo dice ("llegó 3 d después"). El atraso no es un detalle técnico: es la
calidad del enlace, y es una variable del modelo.

### 1.4 `NULL` no es `0`

Un sensor que no reportó **no midió humedad cero**. Un hueco se dibuja como **hueco**: la línea
se corta y la franja se pinta como "sin dato". Rellenar con cero en un gráfico le enseña lo mismo
al ojo que a un modelo: que el suelo se seca de golpe.

### 1.5 El polígono es el índice, y no se asigna nada a mano

Los dispositivos caen adentro de la parcela por `ST_Contains`. La UI **no ofrece** "asignar
sensor a parcela". Si un sensor aparece en la parcela equivocada, lo que se corrige es **el
polígono** (pantalla 12), y todo lo demás se recalcula solo: qué NDVI le toca, qué mediciones
entran en su serie, qué eventos de riego le pertenecen.

### 1.6 Estar sin señal es un estado normal, no un error

El controlador riega días sin enlace, por diseño. "Sin señal 3 d -- regando con la última
política" es **informativo**. El rojo se reserva para lo que obliga a subirse a la camioneta:
batería agotada, humedad por debajo del punto de marchitez, delta de caudal que dice fuga. Si
todo es rojo, nada es rojo.

### 1.7 El resultado se anota donde se cosecha

Sin `campania.rendimiento` la serie es entrada sin salida y **no se puede aprender**. Y si
anotarlo cuesta media hora, se deja de anotar en dos semanas
([como-aprender-de-cada-ciclo.md](como-aprender-de-cada-ciclo.md)). Por eso la pantalla de
cosecha es **de teléfono, de un pulgar, con teclado numérico**, y vive a un toque desde la
parcela: peso, cuántas, cuántas se descartaron y por qué, y el síntoma.

### 1.8 Comparar es la operación primaria, no una vista secundaria

Bloques entre sí, potreros entre sí, un año contra los nueve anteriores. El layout por defecto de
esas pantallas es **lado a lado**, no uno-a-la-vez con un selector.

### 1.9 El tenant no es un filtro de la interfaz

RLS hace que una query sin tenant no devuelva filas. Por lo tanto **la UI nunca ofrece "ver todos
los clientes"**: esa consulta no existe. Quien opera varios clientes **cambia de contexto**, y el
cambio se ve en el encabezado, no en un combo de filtro perdido en una tabla.

### 1.10 Una pantalla, una decisión

Cada pantalla declara arriba qué decisión habilita. Si no se puede escribir esa frase, la
pantalla no debería existir.

### 1.11 Las unidades son parte del número, y la EC va en mS/cm

Nunca ppm: el factor de conversión varía entre fabricantes y las recetas de hidroponía están en
EC ([iot-hidroponia.md](iot-hidroponia.md)). Humedad en % v/v, tensión en kPa, lluvia y lámina en
mm, agua en litros, plata en guaraníes.

### 1.12 El color dice estado; la forma y el texto lo repiten

Nada se comunica solo por color. Cada estado lleva **etiqueta** además de color, y toda serie con
dos o más líneas lleva leyenda **y** rótulo directo. La profundidad se codifica con una rampa de
un solo tono (más oscuro = más profundo), no con cuatro colores distintos: la profundidad es un
orden, no una identidad.

---

## 2. El inventario

Doce pantallas. Las nueve que el pedido exigía, más tres que faltaban y se justifican en §3.
La columna **tabla** es contra qué objeto de [`design.md`](../design.md) §1 lee o escribe.

### 1. Mapa de parcelas -- `#/mapa`

| | |
|---|---|
| **Para qué sirve** | Es **LA** pantalla. La parcela es la unidad de análisis: todo se navega desde acá. |
| **Qué muestra** | Los polígonos del campo con su estado, los dispositivos como puntos adentro, y una lista lateral sincronizada con el mapa. Un tile por estado arriba: cuántas parcelas bien, en atención, críticas y sin señal. |
| **Tablas** | `parcela` (geom), `dispositivo` (punto, estado), última `medicion` por parcela, `riego_evento` del día, `campania` vigente. |
| **Quién la usa** | Todos. Es la home. El productor la abre al levantarse. |
| **Qué decisión permite** | **A qué lote hay que ir hoy, y a cuál no.** El mapa contesta "¿dónde está el problema?" y manda al detalle, que contesta "¿cuál es?". |

El polígono se pinta por estado, no por cultivo: el cultivo ya está escrito y el estado es lo que
cambia. Los dispositivos sin señal se dibujan huecos, no rojos (principio 1.6).

### 2. Detalle de parcela -- `#/parcela`

| | |
|---|---|
| **Para qué sirve** | Todo lo que se sabe de un polígono, en el orden en que se pregunta. |
| **Qué muestra** | Encabezado con cultivo, campaña, superficie y estado. Después, en este orden: humedad **por profundidad** (10 / 30 / 60 cm) con la política dibujada encima como banda; lluvia y riego en la misma barra de tiempo; NDVI de los últimos 12 meses contra la mediana de 9 años; los eventos de riego recientes; los dispositivos de adentro; el último análisis de suelo. |
| **Tablas** | `parcela`, `medicion`, `riego_evento`, `indice_espacial`, `analisis_suelo`, `campania`, `politica_riego`, `dispositivo`. |
| **Quién la usa** | Productor y técnico agrónomo. |
| **Qué decisión permite** | **Si el agua llegó a la raíz o pasó de largo** -- y eso decide si se sube o se baja la duración del riego, que es plata y es agua. La profundidad es la pantalla: si los 60 cm suben después de cada riego, el agua se está tirando abajo de la zona radicular. |

El gráfico de humedad se dibuja **hacia abajo**: la superficie arriba, los 60 cm al fondo. La
profundidad se dibuja como profundidad.

### 3. Series de mediciones -- `#/series`

| | |
|---|---|
| **Para qué sirve** | El explorador crudo, para cuando el detalle no alcanza. Cualquier magnitud, cualquier dispositivo, cualquier rango. |
| **Qué muestra** | Selector de parcela / dispositivo / magnitud / rango, y la serie. Con un interruptor **crudo vs calibrado** y el `calibracion_id` vigente a la vista. Huecos como huecos. Atraso de llegada marcado. Exporta CSV. |
| **Tablas** | `medicion` (la hypertable), `calibracion`, `dispositivo`, `magnitud` (el catálogo angosto). |
| **Quién la usa** | Técnico. No es una pantalla de productor. |
| **Qué decisión permite** | **Si el sensor está diciendo la verdad.** Comparar crudo contra calibrado es la forma de detectar que una fórmula quedó mal, y es lo que habilita recalcular el histórico en vez de tirarlo. |

### 4. Historial de riego -- `#/riego`

| | |
|---|---|
| **Para qué sirve** | La auditoría del lazo de control: qué decidió el controlador y **por qué**. |
| **Qué muestra** | Una fila por evento con las cuatro piezas juntas: **condición** (qué humedad leyó y de qué sensores), **decisión** (regar / no regar, cuánto), **política vigente** en ese momento (con su versión), y **resultado** (minutos efectivos, `litros_estimados` y `litros_medidos`). La columna que importa es el **delta** entre estimado y medido: de más es fuga, de menos es gotero tapado o filtro sucio. |
| **Tablas** | `riego_evento` (hypertable), `politica_riego`, `dispositivo` (caudalímetro), `medicion`. |
| **Quién la usa** | Técnico y productor. Y es la pantalla que se le muestra al cliente para **probar el ahorro**. |
| **Qué decisión permite** | Dos: **mandar a alguien a revisar la línea** cuando el delta se abre, y **cambiar la política** cuando el controlador está decidiendo bien pero con el umbral equivocado. |

Incluye las decisiones de **no regar**: un evento que dijo "no" con su condición vale tanto como
uno que regó. Y muestra en su propia franja los tramos en que el controlador cayó al **programa
conservador** por falta de política nueva.

### 5. Política de riego -- `#/politica`

| | |
|---|---|
| **Para qué sirve** | Lo único que la nube manda al campo. |
| **Qué muestra** | La política vigente (umbral de humedad de arranque y de corte, profundidad de referencia, ventana horaria, duración máxima por evento, litros máximos por día, días de gracia antes de caer al programa conservador) y **el historial de versiones**, que nunca se edita: se cierra una y se abre otra. Y el estado de propagación: guardada / acusada por el controlador / rigiendo. |
| **Tablas** | `politica_riego` (catálogo versionado), `parcela`, `riego_evento` para el "qué habría pasado". |
| **Quién la usa** | Técnico agrónomo, con permiso de escritura. El productor la ve. |
| **Qué decisión permite** | **Regar antes o después, más o menos.** Con una simulación al lado: "con este umbral, en los últimos 30 días se habría regado 9 veces en vez de 14". |

**No hay acción sobre la válvula.** Esta pantalla es el techo de lo que la UI puede hacer sobre el
riego, y está dicho en la propia pantalla para que nadie lo busque.

### 6. Dispositivos y calibración -- `#/dispositivos`

| | |
|---|---|
| **Para qué sirve** | El estado de la flota, y la procedencia de cada número. |
| **Qué muestra** | Tabla por dispositivo: tipo (sensor de humedad, estación, trampa, controlador, caudalímetro, nodo de hidroponía), parcela en la que cae, **batería**, **última vez que reportó**, atraso medio de llegada, firmware, y la **calibración vigente** con su fórmula y su procedencia (fabricante / ensayo propio / fecha). Un panel aparte lista el historial de calibraciones, que no se borra. |
| **Tablas** | `dispositivo`, `calibracion`, última `medicion` por dispositivo. |
| **Quién la usa** | Técnico de mantenimiento. |
| **Qué decisión permite** | **A qué dispositivo hay que ir a cambiarle la pila o recalibrarle la sonda**, y si un dato viejo hay que **recalcularlo** con una fórmula corregida. |

Una sonda de pH lleva además **cuándo se calibró con buffers 4,0 y 7,0** y cuánto falta: se
degrada en uno o dos años y no se puede dejar secar.

### 7. Índice espacial -- satélite y dron -- `#/satelite`

| | |
|---|---|
| **Para qué sirve** | NDVI por parcela, de Sentinel-2 y de dron, en la misma serie. |
| **Qué muestra** | Tres vistas: **hoy, los potreros ordenados por NDVI** (a cuál mover la hacienda); **la serie de un potrero contra la banda p10-p90 de 9 años** (si es un año malo o un pedazo malo); y el **coeficiente de variación** dentro de la parcela, que es lo que dice cuántos sensores lleva. Cada punto muestra `fuente` y `resolucion_m`. |
| **Tablas** | `indice_espacial` (media, p10, p90, CV, `fuente`, `resolucion_m`), `parcela`. |
| **Quién la usa** | Productor ganadero y técnico. |
| **Qué decisión permite** | **A qué potrero mover la hacienda esta semana**, **cuál se está degradando año contra año**, y **dónde enterrar el próximo sensor**. |

Dice **dónde y cuándo, nunca por qué**: la pantalla lo declara y manda a caminar al lugar
correcto. Y avisa cuando el polígono es demasiado chico: 1.000 m² son 10 píxeles, y ahí el
satélite no sirve -- el patio de casa no tiene NDVI, y la pantalla lo dice en vez de mostrar un
número inservible.

### 8. Hidroponía: tablero de solución -- `#/solucion`

| | |
|---|---|
| **Para qué sirve** | El segundo caso de uso. La solución es el único sustento de la planta: acá un número falso mata el cultivo, y rápido. |
| **Qué muestra** | Cuatro lecturas en vivo con su rango objetivo: **EC (mS/cm)**, **pH**, **temperatura de solución (°C)** y **nivel (cm)**. La temperatura lleva la línea de **24 °C** marcada, que es donde la lechuga se espiga. El nivel va al lado de la EC a propósito: al bajar el nivel la EC se concentra, y sin nivel la EC se interpreta mal. Debajo, la **receta vigente** (`solucion_nutritiva`) con la fecha de la última renovación, y el registro de dosificaciones y recirculaciones. |
| **Tablas** | `medicion` (magnitudes `ec`, `ph`, `temp_solucion`, `nivel`), `solucion_nutritiva` (tabla nueva), `riego_evento` con tipo `recirculacion` / `dosificacion`, `calibracion`. |
| **Quién la usa** | El dueño, todos los días, desde el teléfono, parado al lado del tanque. |
| **Qué decisión permite** | **Si hay que renovar la solución, agregar agua, corregir pH o poner media sombra.** Y con el nivel al lado de la EC, si la EC subió porque falta agua o porque falta nutriente -- que son respuestas opuestas. |

El pH figura como **lectura manual con portátil** hasta que la sonda automática sea confiable:
la pantalla tiene su campo de carga a mano y lo marca como tal. Automatizar una decisión que
todavía no se sabe tomar a mano es el error que este producto evita a propósito.

### 9. Bloques experimentales -- `#/bloques`

| | |
|---|---|
| **Para qué sirve** | El método de [como-aprender-de-cada-ciclo.md](como-aprender-de-cada-ciclo.md) hecho pantalla. Sin esto, un experimento que no se puede consultar **no existe**. |
| **Qué muestra** | Los bloques del ciclo lado a lado, cada uno con **la variable que se varió**, cuál es el **control**, y el **resultado**: peso cosechado, cuántas, cuántas se descartaron y por qué, días hasta cosecha, síntomas. Arriba, el **objetivo declarado del ciclo** -- uno solo, escrito antes de arrancar. |
| **Tablas** | `bloque_experimental` (tabla nueva), `campania`, `medicion`, `riego_evento`. |
| **Quién la usa** | El dueño. Y es el prototipo de lo que después se le vende a un cliente. |
| **Qué decisión permite** | **Qué se cambia en el ciclo siguiente**, con atribución limpia: la planta que se murió dice por qué se murió. |

Muestra siempre la **comparación contra el control**, no los cuatro valores sueltos, y advierte
cuando hay más de una variable distinta entre dos bloques -- porque ahí la comparación no prueba
nada y es mejor que la pantalla lo diga que descubrirlo en 45 días.

### 10. Alertas -- `#/alertas`

| | |
|---|---|
| **Para qué sirve** | La cola de lo que exige una acción, ordenada por lo que cuesta no atenderla. |
| **Qué muestra** | Una fila por alerta con **qué pasó**, **el dato que la disparó** (con enlace a la serie en ese instante), **desde cuándo**, y **qué hacer**. Tres niveles y nada más: crítico (ir al lote), atención (mirar hoy) e informativo (sin señal, atraso de llegada, cuota de satélite). |
| **Tablas** | `medicion`, `riego_evento`, `dispositivo`, `captura_trampa`, `indice_espacial`, `politica_riego`. |
| **Quién la usa** | Quien está de guardia. Es la pantalla que se abre desde una notificación. |
| **Qué decisión permite** | **Qué se atiende primero.** Una alerta sin "qué hacer" no es una alerta: son malas noticias más temprano. |

Cada alerta se puede **silenciar con motivo y con vencimiento**, y el motivo queda. Silenciar sin
motivo convierte la cola en ruido en dos semanas.

### 11. Usuarios, roles y permisos -- `#/usuarios`

| | |
|---|---|
| **Para qué sirve** | Quién puede ver qué y quién puede escribir política. |
| **Qué muestra** | Usuarios del cliente actual con su rol, sus campos alcanzados y su último acceso. Cuatro roles: **dueño** (todo, incluye usuarios), **técnico** (escribe política y calibración), **operario** (carga cosecha y lecturas manuales, no toca política) y **lectura** (mira y exporta). Una matriz rol x acción, explícita. |
| **Tablas** | `usuario`, `rol`, `cliente`, `campo`. El `tenant_id` sale del token, nunca del formulario. |
| **Quién la usa** | El dueño del cliente, y nosotros como operadores de la plataforma. |
| **Qué decisión permite** | **A quién se le da la llave de la política de riego**, que es la única escritura con consecuencia física. |

La pantalla dice en texto plano que el aislamiento **lo hace cumplir la base** y no esta pantalla:
quitar un permiso acá no es lo que impide ver los datos de otro cliente -- eso lo impide RLS.

### 12. Alta y mensura de parcela -- `#/parcelas-alta`

| | |
|---|---|
| **Para qué sirve** | Dibujar o importar el polígono, que es de donde cuelga todo lo demás. |
| **Qué muestra** | Importar KML / GeoJSON / shapefile, o dibujar sobre el mapa; superficie calculada proyectada (nunca guardada proyectada); validación de geometría; qué dispositivos quedan adentro con el polígono nuevo **antes** de guardar; y el historial de versiones del límite. |
| **Tablas** | `parcela.geom` (Polygon, 4326), `dispositivo.punto`, `campo`, `cliente`. |
| **Quién la usa** | El técnico, en la instalación. Una vez por parcela, y después cuando el límite se corrige. |
| **Qué decisión permite** | **Cuál es la unidad de análisis**, literalmente. Y muestra el efecto antes de confirmarlo: corregir un límite recalcula qué dispositivos, qué NDVI y qué mediciones le pertenecen. |

---

## 3. Las tres pantallas que faltaban en el pedido, y por qué entran

| pantalla | por qué no podía no estar |
|---|---|
| **7. Índice espacial (satélite/dron)** | El pedido la daba por dentro del detalle de parcela, pero las dos preguntas que el NDVI contesta de verdad son **entre parcelas** ("a cuál potrero mover la hacienda") y **entre años** ("¿es un año malo o un pedazo malo?"). Un detalle de parcela es de una sola parcela y de un solo año: la comparación no cabe ahí. Y la serie de **9 años** que habilita la API de Copernicus no se lee en un panel de tarjeta. |
| **9b. Campañas y cosecha** (dentro de `#/bloques` y accesible desde la parcela) | **Todo el mundo loguea los sensores y nadie loguea el resultado.** `campania.rendimiento` es *la etiqueta de ML* del diseño, y sin ella el histórico describe pero no predice. Además tiene un requisito de forma propio: tiene que entrar **en el momento de cosechar, en un teléfono**, o no se va a cargar. |
| **12. Alta y mensura de parcela** | Sin polígono no hay nada: ni `ST_Contains`, ni NDVI, ni serie. Era el único objeto del modelo que ninguna pantalla del pedido creaba, y es el que calibra a todos los demás. |

Dos que **no** son pantalla, a propósito: **análisis de suelo** es un panel del detalle de parcela
(es un evento raro, no un espacio) y **capturas de trampa** es una franja más en la barra de
tiempo de la parcela más una fila en alertas. Darles pantalla propia sería inventarles tráfico.

---

## 4. Qué del mockup es diseño y qué es relleno

[`mockup/index.html`](mockup/index.html) es **un mockup**: un archivo, sin backend, sin API, sin
estado que sobreviva a un refresh. Sirve para discutir jerarquía, densidad, orden de lectura y
comportamiento en teléfono -- no para probar datos.

**Los datos son de ejemplo y están marcados como tal en la propia pantalla.** Los nombres de
parcela, los cultivos (tomate, sandía, lechuga hidropónica), las unidades y los guaraníes son
verosímiles a propósito para que el layout se vea con texto real; **ninguna cifra salió de una
medición**. El cartel superior lo dice y no se puede cerrar.
