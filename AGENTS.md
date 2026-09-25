# AGENTS.md

> Contrato de trabajo para agentes de IA. Mantenlo **lean (~200, máx 500 líneas)**: contexto
> corto = menos ruido = mejores decisiones. El README es para humanos; esto es para agentes.
> Lo específico del proyecto va en `project.yml`. **Proyecto grande -> dividí por feature**:
> un `AGENTS.md` por área, para no cargar todo de una.

## 1. Proyecto

- **Nombre**: agro-platform
- **Qué es**: el producto de agricultura de precisión multi-cliente. Riego por goteo autónomo
  (el caballo de batalla), estación meteorológica, trampa de plagas e imagen satelital.
- **Stack**: Python 3.12 / FastAPI en el backend, Next.js en el front,
  PostgreSQL + TimescaleDB (series) + PostGIS (geometría).
- **Dónde corre**: sobre el k3s de `../infra-platform` (Argo CD + admisión). **Este repo no
  despliega solo**: arma lo que hay que desplegar y se lo pasa. El contrato de la plataforma
  -qué existe, cómo desplegar, las 6 reglas de admisión- está en `desarrollo/`.
- **La ficha del producto** (objetivo, modelo de datos, economía, mercado) vive **acá**, en
  `cambios/riego-de-precision/`. Se mudó desde `infra-platform` el 25/09/2026; allá quedó un
  README como puntero.
- **Detalle largo**: ver `project.yml` (no lo dupliques acá).

### Reglas propias de este proyecto (no negociables)

1. **El dato no se promedia en la ingesta.** Se guarda **crudo y calibrado**, con la hora de
   **medición** y la de **llegada** separadas, y con el punto geográfico. Todo el histórico es
   material de ML: **un dato mal guardado no se arregla después**. Si hay que elegir entre
   ahorrar disco y conservar precisión, gana la precisión y se discute la retención aparte.
2. **El aislamiento entre clientes lo hace cumplir el motor.** `tenant_id` + Row-Level Security
   de Postgres: una query sin tenant **no devuelve filas**. Nunca un filtro en el front ni en la
   capa de servicio como única defensa.
3. **El lazo de control vive en el campo.** El controlador decide con lo que mide aunque lleve
   días sin señal. La nube manda la **política** (umbrales, ventanas), **nunca** el abrir y
   cerrar de una válvula. Sin política nueva en N días, el controlador cae a un programa
   conservador; no se queda esperando.
4. **El gateway es independiente del controlador.** Si el gateway muere, el riego sigue. El
   gateway hace store-and-forward y el backend **deduplica** por (dispositivo, hora de medición).
5. **Un cambio = una ficha**, en `cambios/<nombre>/`. Nunca un loop por tarea: la memoria y los
   playbooks tienen que acumularse entre cambios.
6. **Todo archivo nuevo va en la carpeta de su cambio.** La raíz no acumula sueltos. Algo sube a
   la raíz solo si sirve para *todos* los cambios.
7. **Nada destructivo sin autorización explícita**, y el VPS se mira en **solo lectura** desde
   acá (`node agro.js ssh-ro`). Escribir en la plataforma es trabajo de `infra-platform`.
8. **Credenciales solo en `.env`** (gitignored) o variables de entorno. Nunca en el repo.

## 2. Reglas de oro

1. **El contexto es caro, los tokens también.** No leas archivos enteros si te alcanza un
   fragmento. **Output cavernícola** (ahorra 25-50%): ejecuta primero y explica mínimo, sin
   preámbulo ni cierre, sin narrar tools; conclusión primero, oraciones cortas.
2. **Escribe resultados en archivos, no en el contexto.** Planes, hallazgos, decisiones ->
   `work/<tarea>.md`. Lo que debe sobrevivir entre sesiones -> `memory/MEMORY.md`.
3. **Verifica antes de declarar "listo".** Corre build + test + lint. Si algo falla,
   dilo con la salida. No afirmes que funciona si no lo viste funcionar.
4. **Haz lo que se pidió, ni más ni menos.** Ante una decisión del dueño, pregunta; ante
   un default razonable, elegí y sigue.
5. **Busca antes de escribir.** Entiende el código antes de tocarlo. El grafo de relaciones REAL
   del esquema sale de `information_schema`/`pg_catalog`, nunca de grepear texto de migraciones.
   Para el resto (Python, TS, scripts del loop), `Grep`/`Read` alcanza: no hay MCP de código
   instalado ni configurado para este proyecto.
6. **Pocas herramientas, afiladas.** Un agente con 30 tools elige peor que uno con 8
   (lección de Vercel con su agente: la superficie de tools degrada el razonamiento). Cada
   rol carga **solo lo que necesita** (mira su frontmatter). Las herramientas nicho van
   **diferidas** o en un subagente dedicado, no en el contexto de todos.
7. **Sin comentarios** - *con una excepción explícita en este proyecto.* En código de
   aplicación: los comentarios son ruido que se desactualiza y miente; nombres claros >
   comentarios; solo se comenta un *por qué* no obvio, nunca el *qué*.
   **Excepción de este proyecto:** en una **migración de esquema** y en la **calibración de un
   sensor**, el comentario **es obligatorio**: la migración tiene que decir qué dato queda y qué
   se pierde -y una pérdida de precisión es irreversible-, y la calibración tiene que decir de
   dónde salió la fórmula (fabricante, ensayo propio, fecha). **No los borres.** Un número de
   calibración sin procedencia no es un número, es una superstición.
8. **Versiones: solo última estable, sin deprecados ni vulnerabilidades.** Antes de agregar
   un paquete, corre `node agro.js check-dep <eco> <pkg>`. Fija versiones (lockfile), no rangos
   abiertos: lo gatea `check` (guard de regresión). Al terminar una tarea, corre
   `scripts/calidad/check.js`.
9. **Loop controlado, no "goal mode".** No "anda y haz todo" en una cadena larga: la IA es
   probabilística y deriva. Trabaja en fases con compuertas (SDD) y revisión humana entre
   ellas. Spec primero, TDD al implementar. Ver skills `sdd` y `tdd`.
10. **Desmonta andamiaje viejo, no sumes de más.** Cada componente del loop codifica un
    supuesto de lo que el modelo NO podía solo; esos supuestos caducan al mejorar los modelos.
    Conviene probarlo: saca un componente, observa si el resultado empeora y conserva solo lo
    que carga peso. Al salir un modelo nuevo, revisa el loop apuntando a MENOS scaffolding.

## 3. Roles de agente (dividir para conquistar)

Como un equipo real: especialistas por disciplina. Fullstack-por-una-persona tiene más
riesgo de fallos - un experto de BD normaliza e indexa mejor que un front, un backend sabe
servir y validar datos. Cada rol vive en `.claude/agents/`. Inspirado en el patrón
orquestador-trabajador de Anthropic y el loop auto-verificante (Ralph Wiggum).

Cada especialista trabaja desde su **playbook** (`memory/playbooks/<disciplina>.md`): lo lee antes
de empezar y lo actualiza con lo aprobado, así el próximo ticket arranca con las mejores prácticas
ya acumuladas, no de cero. La lista viva de roles (nombre, para qué sirve y herramientas) y de
playbooks que existen sale de **`node agro.js roles`**: se genera del disco, no se mantiene a mano.

**Regla:** ningún cambio se da por bueno sin pasar por **verifier**. Si el verifier
rechaza, vuelve al implementer. Loop hasta verde (máx. N rondas, después escala al humano).

**El verifier prueba en serio, no solo parsea**: el gate real es la BD, no el parser (detalle
completo en §7).

## 4. Flujo de trabajo

```
1. lead        -> SDD (skill sdd): proposal -> design -> tasks en cambios/<id>/
2. >>> humano  -> revisa el plan ANTES de codear (compuerta) <<<
3. lead        -> manda cada sub-tarea al **especialista** que corresponde
                 (UI->ui-designer, esquema->database, API->backend, glue->implementer)
4. especialista-> lee su playbook, implementa con TDD (skill tdd), corre check
4b. GATE DE BD -> el objeto TIENE que compilar contra la BD real antes de darlo por bueno
                 (que exige y por que, en detalle: §7).
5. verifier    -> estaticos + el sistema corriendo + prueba funcional con datos de prueba
                 veredicto (OK/volver)
6. lead        -> integra, archiva la spec, actualiza MEMORY.md y el playbook, reporta
7. cierre      -> el HECHO_CUANDO.md del ticket da verde (node agro.js aceptacion); si no, no cierra
```

- Sub-tareas independientes: lanzá especialistas **en paralelo**.
- Cada agente devuelve **datos/conclusión**, no relata el proceso.
- Toda vuelta tiene cinco piezas -trigger, goal, verification, **stopping rule** y memory-; sin
  alguna, no es un loop controlado (Regla 9).
- Lo que se decide y por qué -> `memory/MEMORY.md` (una línea por hecho, ver §6).

### Cierre de tanda (formato obligatorio del reporte)

Todo cierre de tanda va en tres bloques, sin mezclarlos: **Decisiones** (qué se resolvió y por
qué), **Preguntas** (qué quedó abierto) y **Próximas tareas**. El **lead** los completa siempre
antes de reportar; los patrones que funcionen se destilan a `memory/playbooks/lead.md` (hoy
vacío, crece con lo aprobado).

### Modos: escala la ceremonia a la tarea
La disciplina cuesta; aplicala según el riesgo/tamaño. El **lead elige el modo** al empezar.
- **quick** (fix trivial, 1 archivo, sin riesgo): sin SDD ni compuerta. El especialista lo
  hace (TDD si hay lógica), corre `check`, el verifier mira. Reporte corto.
- **standard** (feature): SDD (proposal->design->tasks) + compuerta humana rápida + TDD +
  verifier en navegador. **Default.**
- **critical** (plata, datos, seguridad, decisiones con opciones): standard + **más evidencia**
  (el camino real ejercitado y medido contra la base, no solo compilado) + revisión humana firme.

Ante la duda, subí un escalón, no bajes. Así lo trivial no paga ceremonia y lo riesgoso no
queda corto: la sobre-ingeniería y el overhead dejan de ser un problema.

Para builds largos multi-sesión, el lead arranca y cierra con los gates como baseline (`check`
en verde antes de tocar nada) y cierra por feature contra el `FEATURES.json` de ese ticket (§5).
Los patrones de sesión que se aprueben se destilan a `memory/playbooks/lead.md`, hoy vacío.

Por qué este protocolo no es burocracia sino un **AI loop** (Objetivo -> Contexto -> Acción ->
Verificación -> Memoria) y qué pieza del loop cubre cada paso: `docs/el-loop-del-harness.md`.
Léelo para entender el fundamento, no para ejecutar una tarea puntual.

## 5. Dónde vive cada cosa

| Carpeta | Qué |
|---|---|
| `AGENTS.md` | este contrato (cómo trabajamos). |
| `project.yml` | datos del proyecto (qué es, stack, comandos, convenciones, links). |
| `.claude/agents/` | definición de los roles (lead/implementer/verifier). |
| `work/` | salida de cada tarea: plan, hallazgos, veredictos. **Efímero y NO versionado** (`.gitignore`), sin excepciones desde el 18/08: el puente del loop se mudó a su propio change (fila de abajo). |
| `cambios/<id>/PROGRESO.md` | **la bitácora de ESE ticket**: el puente entre sesiones de la tarea. Vive con el ticket, no en un archivo compartido. |
| `cambios/META/` | **el loop tratado como un ticket** (18/08): el cliente somos nosotros. Su `PROGRESO.md` es el puente entre sesiones de lo que se hace en `main` y sirve a todos los tickets -solo las **dos entradas más nuevas**; el resto se archiva en `progreso/<AAAA-MM>.md`-. Si suma un ledger, es un `FEATURES.json` con el mismo formato que el de cualquier otro ticket (fila de abajo); `features` y `cierre` lo deducen solos parados en `main`. |
| `memory/MEMORY.md` | memoria persistente entre sesiones. Índice de hechos durables. |
| `memory/playbooks/` | best practices por disciplina (ui-designer/backend/database/lead). Crecen con el uso. |
| `skills/` | skills cargadas por necesidad + `REGISTRY.md` (sdd, tdd). |
| `cambios/` | cambios (`cambios/<id>/`) del flujo SDD, uno por ticket. |
| `cambios/<id>/scripts/` | utilitarios de esa tarea (setup/corrida/verificación contra la BD). Van **versionados**: el scratchpad de la sesión es efímero y se pierde. |
| `cambios/<id>/tests/` | **los tests de ese cambio** (unidad, integración y e2e de pantalla). No hay carpeta de tests del loop: cada prueba vive con la tarea que la pidió. Los del loop son `scripts/lib/*.test.js` y los corre `test-js`. |
| `cambios/<id>/entrega/` | **lo que se le da a quien recibe la tarea**, y nada más: `manual-entrega.md` (qué se hizo, qué instalar y en qué orden, cómo probarlo), `evidencia-pruebas.md` (una captura por caso de uso) y sus dos PDF. **No existe hasta que hace falta**: la crea `md-a-pdf` (`mkdir -p`), no el scaffold. La evidencia de pruebas con capturas se arma cuando exista el helper e2e del front (ver `desarrollo/revision-bf-db-workspace.md`). Se versionan los `.md`; los `.pdf` y `capturas/` van al `.gitignore` porque se regeneran con un comando. Es carpeta aparte de `docs/` a propósito: ahí adentro está **solo** el paquete de entrega, sin el ER ni las specs de trabajo. |
| `scripts/lib/` | **librerías**: lógica pura que se importa, sin `argv` ni prints (por eso se testea con `node --test` al lado, en `*.test.js`). Cada `*.js` tiene su `*.test.js` al lado. |
| `docs/` | documentos **durables**: docs externas convertidas con markitdown, y decisiones de fondo que sobreviven a la tarea que las produjo (ej. `el-loop-del-harness.md`). |

**Estructura de un change** (la arranca `node agro.js cambio-nuevo` y se completa a medida que
la tarea avanza). Cada archivo nuevo entra por su carpeta; en la raíz del change vive solo lo
que crea `cambio-nuevo`.

| Dentro de `cambios/<id>/` | Qué |
|---|---|
| `proposal.md` `design.md` `tasks.md` `HECHO_CUANDO.md` `FEATURES.json` | el SDD del cambio y su ledger, los crea `cambio-nuevo`. Nada más va en la raíz. |
| `sql/` | **lo que se despliega**: las migraciones de Postgres (up/down) y scripts de datos/DDL que van a la base. |
| `data/` | evidencia de escritura de datos (qué cambió y por qué) y seeds. |
| `docs/` | material del cambio: el modelo de datos, notas de campo, papers y manuales de sensores convertidos a md con `markitdown`. |
| `scripts/` | utilitarios **de esta tarea**. Lo genérico va a `scripts/` de la raíz: cuando una tool genérica lo cubre, el script por-cambio se borra en vez de quedar como copia vieja. |

**Por qué `work/` no se versiona**: si dudás si algo va a `work/` o a un lugar durable, la regla
corta manda: **si mañana puede ser falso, no va a git.**

## 6. Memoria (`memory/`)

**Vive en el REPO, no en la carpeta de una herramienta**: se versiona, la respalda git y la lee
cualquier agente, a diferencia de la memoria de una tool que se pierde entre maquinas.

| Que | Donde |
|---|---|
| **Indice** (una linea por hecho) | `memory/MEMORY.md` |
| **El hecho** | `memory/hechos/<nombre>.md`, con frontmatter (`name`, `description`, `metadata.type`) |
| **Practica de una disciplina** | `memory/playbooks/<disciplina>.md` |
| **Lo de UN ticket** | `cambios/<nombre>/aprendizajes.md` |
| **Entorno / toolchain** | `docs/setup.md` |

El `description` del frontmatter es lo que decide si ese hecho es relevante para la tarea: se
escribe pensando en eso, no como titulo decorativo.

**Antes de guardar**, revisa si ya existe algo parecido y actualizalo en vez de duplicar.

Un hecho tiene **ciclo de vida** y una decision no se reescribe encima: se actualiza el archivo
existente o se agrega uno nuevo que lo supera, nunca se edita por debajo la decision vieja. Lo
verifica `node agro.js hechos` dentro de `check`.

**Lo que sirve a UN solo ticket NO va aca**: el indice se lee en **toda** tarea, asi que cada linea
de mas la pagan todos los demas tickets (paso con ICC-13: 420 lineas del motor de ofertas que no le
servian a nadie mas). La prueba: *si maniana empiezo otro ticket, .esto me ahorra un error?* Si no,
es del ticket. El tamanio lo vigila `node agro.js presupuesto`, que **rompe `check`**.

## 7. Herramientas (segun el rol, no todas para todos)

**Base (siempre):** leer, editar, correr comandos (build/test/lint). Con eso se hace el 90% del
trabajo. No agregues mas sin necesidad real (regla 2.6: un agente con 30 tools elige peor que uno
con 8).

| Que necesitas saber | Donde esta |
|---|---|
| **Que tools hay** | `node agro.js` las lista todas, agrupadas por area. Sale del disco: no puede mentir sobre que existe. |
| **Como se usa una** | `node agro.js <tool> --help` |
| **Por que existe y que gotcha tiene** | el encabezado del script (`scripts/<area>/<tool>.js`) y `node agro.js <tool> --help`. |

Aca queda solo lo que **no** es de una tool en particular:

**El gate real es el sistema corriendo, no el linter.** `ruff`/`mypy`/`tsc` validan forma; NO saben
si la tabla o la columna existe, si la migracion se aplico de verdad, ni si la policy de RLS
bloquea. El verifier **aplica la migracion contra una Postgres real y compara el esquema contra el
catalogo** (`information_schema`/`pg_catalog`), no contra el archivo: que una migracion figure
aplicada no prueba que el esquema sea el declarado. Y cuando hay logica en juego, **la ejercita con
datos de prueba** y mira el resultado real (filas, conteos, el log): ahi viven las carreras, las
deduplicaciones mal y los bugs que ningun linter ve. Es escritura: solo con
autorizacion del dueño.

**Nunca vuelques miles de filas al contexto**: un `COUNT(*) GROUP BY estado` dice mas que el dump.

**Antes de escribir contra una libreria**, mira su doc al dia con Context7 (`npx ctx7`) en vez de
la que el modelo recuerda, que esta vieja.

**El presupuesto de los documentos de arranque es un gate.** `node agro.js presupuesto` mide
`AGENTS.md`, `memory/MEMORY.md`, el PROGRESO del loop y los cuatro playbooks contra su tope, y
**rompe `check`**. Existe porque este archivo declaraba "max 500 lineas" desde el dia uno y,
ANTES de que este gate existiera, habia llegado a 892: un techo que nadie mide no es un techo.
Cuando salte, ver que sacar en el orden que imprime.
**Y mide el CRECIMIENTO de tu diff: +3 lineas por documento, no mas.** Un aprendizaje nuevo entra
como UNA fila de indice en `memory/MEMORY.md` y el detalle nace en `memory/hechos/<nombre>.md`.
Sacar nunca falla; para mover secciones, `--reorg`.

## 8. Convenciones del proyecto

Las convenciones del esquema (nombres, tipos, precisión, particionado por tiempo, políticas RLS)
viven en `memory/playbooks/database.md`; hoy arranca vacío y crece con lo que se apruebe en cada
cambio (no se rellena con folklore del repo de origen). Leelo **antes de escribir o tocar un
objeto**, sea nuevo o existente. Lo hace cumplir `check` vía `project.yml` -> `commands.lint`
(hoy sin comando declarado: se llena cuando exista código que lintear).

Mira `project.yml` -> `conventions` para la lista completa.

## 9. Seguridad (guardrails, no opcional)

- **Secretos:** nunca en código ni en git. Van en `.env` (fuera de git). `check` escanea
  con gitleaks; si salta, parás.
- **Infra mínima:** least privilege. Nada publica puertos al host salvo el proxy/gateway;
  los servicios hablan por red interna. Sin credenciales por defecto. Rotá si se filtró.
- **Dependencias:** solo las que necesitás, en su última estable, sin deprecados ni vulns
  (Regla 8 + `check-dep`). Auditá el árbol cada tanto (`check` lo hace).
- **Entradas no confiables:** valida/sanitizá. No ejecutes ni interpoles input crudo.

## 10. Antes de cerrar una tarea

El checklist completo (build, lint en 0, tests en verde, el esquema aplicado == el declarado
IDENTICO, datos de prueba restaurados, `MEMORY.md`) vive en `.claude/agents/verifier.md`: es el
que corre el **verifier** antes de dar el OK. Leelo ahí al cerrar cualquier tarea, no lo dupliques
acá.

La división de gates: **estáticos en `check`** (corre en cualquier máquina, sin credenciales) y
**los tests contra base real en el verifier** (necesitan `.env` y una Postgres levantada).
