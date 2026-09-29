# PROGRESO - riego-de-precision

**La bitacora de ESTE ticket.** `AGENTS.md` pide una por cambio; el puente del producto estaba
metido en `cambios/META/PROGRESO.md`, que es para lo que se hace en `main` y tiene un techo de
**+8 lineas por sesion** -pensado para la bitacora del loop, no para un producto de quince
documentos-. Aca hay lugar. La mas nueva ARRIBA.

## 2026-09-29 (segunda vuelta) -- la base TERMINADA, el DER, y tres agujeros de acceso

**El dueño contesto las dos preguntas que quedaban**, y las dos eran suyas:

| | respuesta | que queda firme |
|---|---|---|
| **0. Quien es el cliente** (bloqueaba) | **el PRODUCTOR** | la cuota base por finca + hectarea, el piso de **3 clientes** y no 1 contrato, y el ciclo corto: el producto se vende mostrandolo andando. **No cambia una linea de lo construido** -- que es lo que la propia pregunta afirmaba |
| **1. En que VPS corre** | **este, para el desarrollo local**; el despliegue a staging lo hace INFRA | el disparador para mudar sigue siendo el **primer cliente que paga**, no una fecha |

Los escenarios B, C y D quedan **despriorizados, no prohibidos**: si maniana financia la
cooperativa, lo unico que se reescribe sigue siendo `ECONOMIA.md`.

### La base paso de 27 tablas a 62, y el motivo no es que faltaban tablas

**La mitad del Minimum Data Set -la lista que la FAO y DSSAT ya escribieron- no la manda ningun
sensor**: el perfil del suelo, la densidad de siembra, la fecha de floracion, los kilos cosechados.
Sin eso, el historico de sensores no alimenta ningun modelo agronomico, por prolijo que sea.

| migracion | que entro |
|---|---|
| **003** | los tres agujeros de acceso (abajo) |
| **004** | `campaign`, `harvest`, `experiment_block`, el suelo, el satelite, la trampa, la foto y el trio `observation`/`diagnosis`/`treatment` |
| **005** | ganaderia: `animal`, `animal_location`, `animal_group`, `ration` |
| **006** | una calibracion se **cierra** y no se edita, y lo hace cumplir el permiso |

**Lo que NO se convirtio en tabla, que es donde se ve si el diseño aguantaba:**

- **El peso del animal es una `measurement`** con `animal_id`, porque `quantity` es catalogo. Esa
  era la promesa de la tabla angosta y se cumplio.
- **La vacuna es un `treatment`** con producto de tipo vacuna: la misma tabla que usa el tomate.
- **La enfermedad es una `observation` mas un `diagnosis`**, el mismo par que la planta.
- Lo unico verdaderamente nuevo de ganaderia es que **el animal se mueve**: `animal_location`.

### Lo que se vio NO es lo que se cree

`observation` guarda **hechos** -sintoma, lugar, CUANTO, la foto- y no cambia nunca. `diagnosis`
guarda **creencias** y es **append-only**: el modelo sugiere, el tecnico confirma, y **quedan las
dos filas**. Solo lo confirmado entrena. Un modelo que se entrena con sus propias salidas refuerza
sus errores cada vuelta hasta estar seguro y equivocado.

### Tres agujeros de acceso, los tres de la misma forma

**Tablas que nadie penso como "datos de cliente" porque no llevan `tenant_id`:**

1. **`role_permission` y `membership_role` sin RLS.** El bucle de la 002 se apoya en `tenant_id` y
   una tabla de union no tiene. Con un token de A se podian leer -y ESCRIBIR- los permisos de los
   roles de B. La tenencia sale del padre, no de una columna nueva.
2. **`app_user` sin permiso para el producto.** Toda pantalla que muestra "quien" iba a fallar. Y
   darlo pelado era peor: `app_user` es global a proposito. Lleva RLS por membresia.
3. **`credential` sin nadie que la lea.** La autenticacion pasa ANTES de que haya cliente -eso ES
   autenticar-, asi que no la puede hacer `agro_app`. Rol nuevo `agro_auth`, que ve identidades y
   hashes y **ni un dato de cliente**.

### Y una que el comentario prohibia y el permiso permitia

La 002 escribia que una calibracion **se cierra, no se edita** -- y otorgaba `UPDATE` sobre la
tabla entera, o sea que se podia reescribir la formula de una calibracion que las mediciones ya
apuntan. La 006 lo arregla **por columna**: `grant update (valid_to)`. Cerrar se puede; reescribir
no llega a la base.

### El DER

- **[docs/der.md](docs/der.md)** -- las 62 tablas con todas sus columnas, mas las 130 claves
  foraneas en Mermaid. **Lo genera un script leyendo el catalogo de la base que corre**, no los
  archivos .sql. No se edita a mano.
- **Dos diagramas de archify** en `desarrollo/diagramas/`: `modelo-de-datos` (la espina) y
  **`etiquetas-y-eventos`** (nuevo: la campania, la cosecha, y lo que se vio / se cree / se aplico).
  Los dos pasan los 9 checks de showcase y la verificacion de contencion.
- **Un DER completo de archify se intento y se descarto**: archify rechaza toda flecha que cruce a
  otra, y no hay acomodo de 62 cajas donde cien relaciones no se crucen. El intento quedo escrito
  en el encabezado del generador, no borrado.

### Lo que el generador encontro apenas existio

`modelo-de-datos.html` seguia diciendo **`parcela`, `campania` y `medicion` cuatro dias despues**
de que el esquema pasara a ingles. Nadie lo vio porque **nada podia verlo**. El generador ahora
falla si el diagrama nombra una tabla que no existe; **la primera corrida fallo**, con las once
tablas viejas en la salida.

### Verificacion

- **`verify-schema.sh`: 48 de 48**, contra la base corriendo. Eran 21.
- **Control negativo hecho**: borrando a proposito una policy, un trigger, una tabla de historia y
  un permiso, los pasos correspondientes se pusieron en rojo -- y uno se descubrio **vacuo**: el
  paso "B no ve los permisos de A" tambien pasa si la policy no deja ver a nadie. Va en par con su
  control positivo, y queda escrito.
- **Los dos pasos estructurales dejaron de ser cuentas.** "11 tablas con RLS" y "24 de historia" se
  pusieron en rojo al llegar a 62 tablas **sin que nada estuviera mal**. Ahora son diferencias de
  conjunto: cuantas tablas que DEBERIAN tenerlo no lo tienen. La respuesta correcta es 0 para
  siempre.
- **Las bajadas existen y se CORREN**: `apply-schema.sh --down` y despues una subida limpia deja
  48/48. Una bajada que nadie ejecuta es un archivo que dice ser un rollback.
- **`apply-schema.sh` no existia**, y eso era un hueco real: la base de este VPS se habia armado
  pegando archivos en psql a mano, asi que nada probaba que **los archivos** la reconstruyen.

### Desviaciones declaradas

- **`animal_location` es la tercera hypertable** y el plan decia "medicion y riego_evento, el resto
  no". Entra porque crece al ritmo de un aparato, que es el criterio real detras de esa frase.
- **`spatial_index` FUE hypertable durante una hora y se saco**: nueve anios de Sentinel-2 sobre
  veinte parcelas son trece mil filas. Particionar eso no compra nada y cuesta la regla de que todo
  indice unico lleve la columna de particion.

### Lo que sigue

Le pregunte a INFRA el contrato de despliegue a staging -- forma de los manifiestos, si la
plataforma corre la base o subo la mia, de donde salen los secretos de los cuatro roles, y como se
declara la salida a Copernicus. Con eso construyo hacia ahi en vez de descubrirlo el dia del
despliegue. **Despues: el front** -- Next + shadcn, con el modulo `@/ui` y el candado de hash para
que no se puedan editar los componentes copiados.

## 2026-09-29 -- la base, entera y en ingles

**Primera linea de codigo del producto y esquema completo.** Lo que quedo funcionando:

- **Postgres 17.11 + TimescaleDB 2.30.1 + PostGIS 3.6.4** corriendo en esta maquina, atada a
  `127.0.0.1` y sin exponer nada. Verificada creando una hypertable y guardando un `POINT` 4326:
  que la imagen diga que trae las dos extensiones no prueba que funcionen juntas.
- **51 tablas: 27 de datos y 24 de historia**, todas en ingles. Incluye las de ACCESO, que faltaban.
- **`verify-schema.sh`: 21 de 21 en verde** contra la base corriendo.
- **`check` paso de 6 a 9 gates reales**: lint (ruff + mypy estricto), tests y tipografia.

**Decisiones del dueño que bajaron a la base:**

| | |
|---|---|
| `medicion` **ANGOSTA** | cerro la pregunta 4 con cinco argumentos independientes |
| **Todo en ingles**, texto de pantalla en espaniol | se rehizo el esquema entero: eran 13 tablas sin un dato de valor |
| **Historia en cada tabla mutable** | un trigger generico, no quince copiados |
| **Nada hardcodeado** | lo que crece va a catalogo; lo que es maquina de estados se queda en CHECK |
| **Front: shadcn**, y prohibido crear componentes | ver `docs/reglas-del-front.md` |

**Lo que NO lleva historia, y es la parte que importa:** `measurement` e `irrigation_event` son
append-only y enormes. Auditarlas duplicaria la tabla mas grande del sistema para registrar cambios
que nunca deben pasar. **En vez de auditar el cambio, el cambio esta PROHIBIDO**: UPDATE y DELETE
revocados. Para append-only eso es estrictamente mas fuerte que auditar.

**Errores propios que el proceso encontro, y quedaron escritos donde se cometieron:**

1. La etiqueta de la imagen de Timescale estaba **inventada de memoria** y no existia.
2. `api/config.py` inventaba nombres de variables cuando el `.env.example` **ya declaraba los de
   libpq**.
3. **La contrasenia aparecia en el `repr()`** de la configuracion. No lo encontro una revision: lo
   encontro un test escrito para eso, y fallo a la primera.
4. El test grepeaba **el texto del error de psql**, que depende del locale: pasa aca y deja de
   chequear en silencio en otra maquina. Cambiado por el codigo de salida.
5. La tool `ascii`, al incluir `.js`, **se rompio a si misma**: su tabla de reemplazos contiene los
   caracteres que reemplaza.

**Y una correccion que vino de infra:** yo habia escrito que esta maquina corre k3s, aloja a
`primavera-nati` y que aca paso el `fsync` de 3 segundos. **Las tres falsas.** Son dos maquinas:
`vmi2900083` -- aca, nodo de control, con SIRA -- y `srv1943767`, el VPS de staging.

**Sin resolver, y es del dueño:** las dos preguntas abiertas de `PREGUNTAS.md` (quien es el cliente,
y en que VPS corre el producto), y la limpieza de los ~24 GB de imagenes de docker de contenedores
apagados, que no se toca desde una sesion.

## 2026-09-28 -- el producto se definio, y el mockup se rehizo tres veces

**Dia de definicion, no de codigo.** Lo que cambio de fondo:

- **El producto NO es riego de precision: es agropecuaria de precision**, y el riego es un modulo.
  El dueño lo encuadro como *"un ERP para estancias"* -- **hacia adentro**, aclaro despues: hacia
  afuera es **una sola app** y no se dice "esta app es de goteo".
- **El mockup se rehizo TRES veces**, y las tres por la misma causa: **el brief no tenia al
  usuario**. Son estancieros y capataces que nunca vinieron a Asuncion. De ahi salieron las nueve
  reglas de `docs/quien-usa-esto.md`, y la primera es que **la pantalla contesta una PREGUNTA, no
  muestra datos**.
- **El mapa lleva DOS NIVELES** -- el campo de fondo y los potreros clickeables -- con la trampa
  anotada: **la suma de los potreros NO es el campo**, y por eso mirar el verdor del campo entero no
  sirve para decidir nada.

**Hallazgos que valen mas que el codigo del dia:**

| | |
|---|---|
| **Por que se murio el arroz del contacto** | no fue agua: fue **riego por gravedad imposible de controlar**. Es la mejor validacion que tiene el proyecto y no la salimos a buscar |
| **El pesaje al paso existe** | `walk-over weighing`: balanza con RFID en el paso a la aguada. **Saca el dron, el corral y el GPS** del plan |
| **El Minimum Data Set** | la lista de que guardar ya esta escrita por la FAO y DSSAT. Y **la mitad NO viene de un sensor** |
| **Nueve anios de NDVI gratis** | el satelite lleva desde 2017 acumulando historico sobre esa tierra, retroactivo |

## 2026-09-27 -- localizar hacienda sin GPS, anotado como opcion futura

Pregunta del dueño: *hay otra forma de rastrear las vacas por radiofrecuencia, para no pagar GPS?*
Evaluado y anotado en [economia/ganaderia.md](economia/ganaderia.md), **como opcion a futuro, no
como tarea**: ganaderia sigue siendo otro producto sin ficha propia.

Lo que la evaluacion cambio:

- **El GPS no es lo que cuesta.** El modulo GNSS son 4-8 USD. Caro es el abono mensual -que LoRaWAN
  ya elimina- mas bateria, panel, caja y correa, que se pagan igual. Sacarle el GNSS al nodo ahorra
  ~5 USD de ~40 y te deja sin posicion.
- **Y por eso el "NO" a los collares se sostiene**: a precio local el nodo LoRa es Gs 290.000
  (~35 USD), o **~4.550 USD a 130 cabezas** -- el mismo orden que los collares GPS. **Cualquier
  dispositivo activo por animal queda afuera a esa escala, lleve GNSS o no.** El unico que cierra es
  el que no tiene bateria ni radio: la **caravana leida en un paso obligado**, que la trazabilidad ya
  obliga a poner.
- **TDoA de LoRa descartado**: necesita gateways con fine timestamping, que el Heltec local no hace,
  y entrega 100-250 m de error. Peor precision que clasificar por RSSI, y mas caro.
- **RSSI sirve para zona, no para coordenadas** (±6-10 dB de sombreado). "Potrero 3" es justo el dato
  que pide la rotacion, que es la misma pregunta que contesta el NDVI.
- **La advertencia que mas importa, y sale del contrato**: un punto derivado de RSSI **no se guarda
  como lat/lon**. Se guarda el RSSI crudo por ancla y la zona, con su incertidumbre. Si no, en dos
  anios es indistinguible de un punto de GPS en `medicion` -- regla 1, y para ML es peor que no
  tenerlo porque el modelo le cree.

**Correccion sobre la marcha**: la primera respuesta estimo ~10-15 USD por baliza y era optimista
contra la tabla de precios locales que el repo **ya tenia verificada** en `PREGUNTAS.md`. Con el
precio real la conclusion se da vuelta: la radiofrecuencia sola **no** reemplaza al collar a 130
cabezas.

## 2026-09-27 -- el SDD completo: regla de parada y plan por fases

Los dos archivos que faltaban desde el 25/09 dejaron de ser el placeholder de `cambio-nuevo`.

- **`HECHO_CUANDO.md`: nueve criterios**, siete con comando y dos a mano. Salen de los cuatro
  objetivos del `proposal.md`, no de mirar una implementacion: **no hay una sola linea de codigo
  todavia**, asi que ningun criterio pudo acomodarse al trabajo hecho -que es justo lo que el
  archivo existe para evitar-. Se escribio **fuera de orden** (el `design.md` ya estaba) y queda
  registrado asi en el propio archivo.
- **Los dos criterios a mano son a mano por una razon, no por comodidad**: ninguna tool nuestra ve
  una valvula fisica, y el mapa no se puede verificar hasta que exista el helper e2e del front.
- **`tasks.md`: las siete fases** del `design.md` §6 mas una Fase 0. La 0 existe porque
  `project.yml` tiene `lint`, `test` y `build` vacios: mientras lo esten, `check` saltea esos gates
  y no mide nada. Y porque `memory/playbooks/database.md` esta vacio y el contrato pide leerlo
  **antes** de tocar un objeto.
- **`FEATURES.json`: 16 fichas**, 0 en verde. Antes tenia `features: []`, que hacia que
  `features --gate` saliera **2 -"no hay ledger que medir"-, que no es lo mismo que estar al dia**.
- **Cada fase entrega su script de verificacion versionado** en `scripts/`, no una corrida en la
  terminal: el scratchpad de la sesion se pierde y el criterio lo nombra por nombre de archivo.
- **Modo del cambio: `critical`.** Hay plata, hay datos irreversibles y hay aislamiento entre
  clientes. Pide evidencia contra la base real y revision humana firme.

`aceptacion` da **rojo, y es lo correcto**: los cinco scripts que nombran los criterios no existen.
`check` no corre `aceptacion`, asi que el rojo no bloquea los commits; lo exige `cierre`.

**La pregunta 0 sigue abierta y NO bloquea ninguna fase**: los cuatro escenarios construyen el
mismo producto. Lo que bloquea es la compra de la Fase 4, que es plata del dueño.

**Los 8 commits que estaban sin subir se pushearon** (`53e04b0..c0df0fd`). Sin resolver, y es del
dueño: el hook de `db-sql` muerto en `.claude/settings.json`.

## 2026-09-27 -- correcciones del arranque en frio

Un agente sin contexto leyo el repo entero y reconstruyo **8 de 9** preguntas con archivo y linea.
Lo que encontro y se arreglo:

- **El `26x` de soja seguia en `proposal.md`** aunque `MERCADO.md` ya lo habia corregido a `23x` y
  documentaba que 26 era el viejo. El proposal es el que se lee primero.
- **La compuerta**: el proposal decia que `design.md` se escribe despues de aprobar, con 248 lineas
  de design ya escritas. Se registro lo que paso de verdad -el dueño dirigio el trabajo, nunca dijo
  "aprobado"- porque **inventar una aprobacion es peor que no tenerla**.
- **`ssh-ro` roto y tres documentos diciendo que anda** (`AGENTS.md`, `project.yml`, `docs/setup.md`,
  mas `.env.example`). Los cuatro lo marcan como pendiente ahora.
- **La pregunta 2 de `PREGUNTAS.md`** seguia abierta y ya se habia decidido el 27/09.
- **La bitacora de META estaba al reves** de lo que ella misma declara.
- Numeros que no cerraban: `~145` que eran 142, `19%/2,1%` contra `20%/2,2%`, y `63 USD` que al
  dolar declarado son 60. Y la tabla local tenia **dos items de Gs 140.000** sin decir cual suma.
- **`crudo/` estaba citada como si tuviera contenido** y esta vacia: nunca se corrio `capturar.py`.
- **`LIMPIEZA.md` se leia como pendiente** y estaba hecha.

Y un arreglo de gate: **`arranque-frio` afirmaba algo falso.** Decia *"dice que falta ssh-ro.js,
pero existe"* sobre un texto que decia *"sigue pensado para el server del origen"* -que no es lo
mismo-. El primer intento fue una lista negra de verbos de modificacion y **quedo corta a la
primera**: "sin adaptar" y "sigue pensado para" se escriben de diez formas. Se paso a **lista
blanca de verbos de AUSENCIA**: solo se contradice lo que afirma que algo no existe. Con test del
caso nuevo y control negativo del que tiene que seguir dando rojo.

**Sin resolver, y es del dueño**: los commits sin subir, y el hook de `db-sql` muerto en
`.claude/settings.json` -al que el commit `2fc5743` le sumo permisos de git por arrastre de un
`git add -A`-.

## 2026-09-26 -- ganaderia evaluada, y una correccion al dia siguiente

**Entrada escrita el 29/09**, al cerrar: el dia tenia commits y no tenia bitacora, y un dia que
falta no vuelve.

- **`economia/ganaderia.md`**: se evaluo el mercado vecino. Veredicto: **si hay negocio, pero es OTRO
  producto** -- reusa el 80% de lo construido y no compite por el mismo cliente. La unidad de cobro
  deja de ser la hectarea y pasa a ser la **cabeza, el punto de agua o el establecimiento**: con
  Gs 3,1 M de bruto por hectarea, la cuota actual seria el 58% del bruto.
- **Y al dia siguiente se corrigio solo**: se habia escrito que la trazabilidad era la tercera
  oportunidad, y **es mas debil de lo que se dijo**. En software de gestion ganadera **SI hay
  competencia madura** -- GanApp cubre sanidad, pesajes y RFID, con prueba gratis. Lo contrario de
  lo que pasa en fruta. **El hueco esta en medir pasto y agua, no en registrar el rodeo.**

## 2026-09-25 al 27 -- la ficha del producto

Escrita desde `infra-platform` y mudada aca. El detalle vive en los archivos, no en esta bitacora:
`proposal.md` (objetivo, cultivos, hoja de ruta, drones), `design.md` (doce tablas, las cinco
reglas de precision, el lazo de control), `ECONOMIA.md`, `MERCADO.md`, `PREGUNTAS.md`, `economia/`
(un archivo por cultivo), `colmena/` (relevamiento) y `banco-de-pruebas.md` (Misiones).

Presentacion de viabilidad, 17 laminas: https://claude.ai/artifact/Q9WktgJCQFoDwiEh3f5TpT

**Lo que falta**: `HECHO_CUANDO.md` y `tasks.md`, que siguen siendo el placeholder de
`cambio-nuevo`, y contestar la pregunta 0 -quien es el cliente-.
