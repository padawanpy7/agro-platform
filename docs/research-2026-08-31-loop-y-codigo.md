# Research 31/08/2026: que le falta a nuestro loop, y que cambia para escribir codigo

Cinco fuentes, dos preguntas distintas. Las dos primeras son sobre COMO SE TRABAJA con agentes; las
tres de Bun son sobre ESCRIBIR CODIGO. Lo que sigue es lo que se puede adoptar, no un resumen.

**Fuentes**

1. `github.com/deepseek-ai/deepseek-harness` - clonado y leido (AGENTS.md, `.agents/notes/`, `docs/`).
2. `deepseek.com/harness/en/` - la doc publica.
3. `bun.com/blog/bun-v1.4`
4. `fazt.dev/contenido/rust-esta-devorando-todo-bun-reescrito`
5. `bun.com/blog/bun-in-rust`

El repo del punto 1 se clono porque la lectura web devolvia solo el README. La diferencia entre lo
que se ve desde afuera y lo que tiene adentro fue grande: el README no menciona ni una de las
practicas de abajo.

---

## Parte 1 - Lo que le falta a nuestro loop

### 1.1 La nota de decision tiene CICLO DE VIDA, y lo archivado esta congelado

Lo mas fuerte que encontre, y lo que mas nos falta.

Cada decision vive en `.agents/notes/{lifecycle}/{clase}/AAAA-MM-DD-tema.md`, con:

- **Lifecycle** en la carpeta: `proposed/` (revisada antes de construir), `implemented/` (se envio),
  `rejected/` (se considero y se descarto), `archived/` (implementada y ya sin valor futuro).
- **Clase** tambien en la carpeta, de un conjunto CERRADO que un gate hace cumplir: `feature`,
  `bug-fix`, `simplification`, `architecture`, `process`, `testing`.
- **La fecha es la de cuando se propuso**, no la del ultimo toque.

Y tres reglas que valen mas que la estructura:

1. **Todo cambio no trivial lleva su nota en el mismo PR.** Solo se exime el cambio mecanico o
   local. "No trivial" esta definido: altera comportamiento, arquitectura, un contrato compartido,
   proceso, estrategia de test, o un formato en disco/wire/config.
2. **Una nota implementada se mantiene AL DIA con lo que se envio** -si el codigo mueve un archivo,
   renombra un paquete o cambia un default, la nota se actualiza en el mismo cambio- pero **solo los
   hechos: rutas, nombres, estructura. La decision no se reescribe.** Para cambiar la decision se
   escribe una nota nueva que supersede, y quedan cruzadas.
3. **Lo archivado esta CONGELADO**: no se edita, no se cambia de formato, y **no se cita como autoridad de
   lo que pasa hoy**. Los gates de documentacion saltean lo archivado.

**Por que nos importa, con evidencia de HOY**: nuestros `memory/hechos/` no tienen ni ciclo de vida
ni clase, y el `PROGRESO.md` mezcla lo vigente con lo historico sin marca. Las dos cosas nos
mordieron el mismo dia:

- El hecho `comentario-de-jira-corto-y-sin-markup` estaba escrito desde el 26/08 y **igual escribi
  el comentario largo**. Una nota "vigente" que nadie relee en el momento no gobierna nada.
- Al mover `memory/secretos.md` en el repo de infra quedaron **8 punteros rotos**, uno dentro de un
  script que corre. Esa es exactamente la regla 2 de arriba: los hechos de la nota se actualizan en
  el MISMO cambio que mueve el archivo.
- Y el gate de cierre reporto "al dia" sobre un `Pendiente` de anteayer que ya se habia hecho: una
  entrada historica tomada como autoridad actual.

**Adoptable ya**: la clase y el estado en el nombre del archivo (o en el frontmatter), la regla de
"lo archivado no es autoridad", y el gate que verifica que un cambio no trivial trae su nota.

### 1.2 El techo de un documento se PUEDE SUBIR, a proposito

Tienen `verify-doc-budgets`, igual que nuestro `presupuesto`. La diferencia esta en la salida:

> "Condense when clarity survives; **raise a `verify-doc-budgets` ceiling** when the required content
> genuinely needs more space."

Nosotros tratamos el techo como sagrado: hoy se rompio **tres veces** (`db.md` 519/500,
`apex.md` 523/520, `MEMORY.md` +34) y las tres veces saque contenido a las apuradas en medio de un
merge. Subir el techo cuando el contenido lo justifica es una decision valida y explicita, y hoy no
esta contemplada: el mensaje solo dice que saques cosas.

### 1.3 La evidencia se ajusta a la superficie; el barrido completo NO es el default

> "Match evidence to the surface... **Never default to the full suite** or repeat a passing check for
> commit or push. CI owns exhaustive coverage."

Nosotros corremos `node agro.js check` entero, muchas veces por tanda, y `test-js` corre los 800 tests
siempre. Ellos declaran cual gate corresponde a cada superficie (tests de comportamiento enfocados,
snapshots, `doc-sync` para docs, e2e real solo para proveedores) y no permiten repetir un chequeo que
ya paso. Es plata directa en tiempo de tanda.

### 1.4 "Model-visible ⟺ logged"

> "Anything that reaches a model request must be reconstructable from the session log; a new
> model-visible input requires a session event."

El registro de sesion es **append-only e inmutable**, y encima hay una *Trajectory View* que permite
resumir, bifurcar, buscar y **reproducir** desde el mismo flujo de eventos. Nosotros tenemos
`metrics/tool-runs.log` y `work/tiempos.jsonl` -que son medicion, no permiten reconstruir la sesion-, y
`node agro.js buscar`, que lee sesiones pasadas. Hay base; falta el invariante.

### 1.5 Modos de herramientas: la superficie cambia con el modo

Los modos (`Standard`, `Code`, `Minimal`, `Creator`) exponen conjuntos DISTINTOS de herramientas:
minimal es bash + editor de texto y nada mas.

Nuestra regla 2.6 dice que "un agente con 30 tools elige peor que uno con 8", pero **es una
declaracion sin mecanismo**: todas las tools estan siempre disponibles. Ellos lo hicieron
configuracion.

### 1.6 Reglas sueltas que son nuestras, mejor escritas

- **"No hardcoded tunables" (nada ajustable clavado en el codigo): un `DEFAULT_*` o un hook de test NO es configurabilidad.** Lo que varia
  por despliegue va en `Config` validada. Es LITERAL el defecto que encontre hoy dos veces: la lista
  de documentos clavada en `presupuesto` y `SCHEMA_PROPIO = 'OFERTAS.'` en el linter.
- **"Misconfiguration fails loud at load... never silently skip a missing referent."** Nuestra
  familia entera de "el gate que no encuentra nada da verde".
- **"An empty `catch` names what it swallows"**, y el `try` se mantiene en una sola sentencia.
  Nosotros tenemos `catch {}` mudos -yo escribi varios hoy-.
- **"Tests describe behavior, not correctness."** El test obsoleto se cambia CON su comportamiento y
  se explica por que.
- **Comentarios**: "state complete contracts and context, **not reasoning transcripts**". Y una regla
  de vocabulario: antes de escribir `contract`, `boundary` o `shape`, preguntarse si hay un termino
  mas exacto. Es la version general de la regla del comentario corto que pediste hoy.
- **`--force-with-lease`, nunca `--force` crudo**, y abortar si el remoto se movio.
- **Postmortems como tipo de documento** (`docs/postmortem/`), no como parrafo dentro de una bitacora.

---

## Parte 2 - Lo que cambia para escribir codigo

### 2.1 Bun 1.4 trae cosas que hoy resolvemos con dependencias

| Lo que trae | Que reemplaza aca |
|---|---|
| `Bun.cron()` - registra jobs **a nivel del SO** (crontab / launchd / Task Scheduler) | Es exactamente lo que necesita `HN-ARRANQUE-TRAMO`: hoy dependemos de `schtasks` + un `.cmd` envoltorio con tres trampas documentadas |
| `Bun.WebView` - navegador headless sin Puppeteer | Playwright, que arrastra ~11 s de arranque por corrida en nuestras tools de APEX/Kove |
| `Bun.Terminal` - pseudo-terminal para manejar bash o vim | El camino de SQLcl, que hoy pelea con JLine y `force.interactive` |
| `Bun.markdown.html()` | `marked`, que ya es dependencia nuestra |

**Cuidado**: son APIs de Bun, no de Node. Adoptarlas significa correr el loop en Bun, no
"instalar una libreria". Es una decision de plataforma, no una mejora incremental.

### 2.2 Lo que se puede copiar SIN cambiar de runtime

- **`bun test --changed=main`**: corre solo los tests afectados segun el diff contra una rama. Nuestro
  `check` ya acota los `.sql` cambiados, pero **`test-js` corre los 800 tests siempre**. La idea es
  portable a `node --test`: mapear archivo cambiado -> su `*.test.js`.
- **`--shard=M/N`** con balanceo por tiempo, y `--parallel` por workers.
- **`bun audit fix`** y **`bun dedupe`**: nuestro `check` ya corre `npm audit`, pero no arregla.

### 2.3 Como hicieron la reescritura (lo mas valioso de las tres fuentes)

Reescribieron ~535k lineas de Zig a Rust: **11 dias, 64 agentes en 4 worktrees, 6.502 commits,
+1M lineas**, pico de 1.300 lineas por minuto.

Lo que se puede copiar:

1. **Tres horas de preparacion antes de la primera linea**: un `PORTING.md` con el mapeo de patrones
   Zig->Rust y un analisis de lifetimes por cada campo de struct. El trabajo mecanico se hizo
   mecanico *antes* de empezar.
2. **El patron de revision: implementador -> DOS revisores adversariales -> aplicador de fixes.**
   Nosotros tenemos implementer -> UN verifier, y el que arregla es el mismo que implemento.
3. **Cero tests skipeados o eliminados**, y 100% de la suite pasando en 6 plataformas antes del
   merge. Regla dura, no aspiracion.
4. **Midieron antes y despues**: 6,7 GB -> 609 MB de leak en 2.000 builds, binario -20%, throughput
   +2,8/4,8%, 128 bugs corregidos contra la version anterior.
5. **El costo se comparo contra la alternativa**: ~$165k en tokens contra "3 ingenieros con contexto
   pleno, ~1 año". La decision no fue "usemos IA", fue una cuenta.

### 2.4 El matiz que agrega el articulo de fazt

La razon de cambiar de lenguaje **no fue solo tecnica**: Zig no llego a 1.0 -inestable para
produccion- y ademas **prohibio las contribuciones generadas por IA**, lo que es incompatible con
como trabaja el dueño de Bun. Vale tenerlo presente cuando se elige una dependencia: su politica
sobre IA es parte de la decision.

Y la conclusion sobre lenguajes, que comparto: "el lenguaje correcto para el problema correcto".
Rust para herramientas de sistema, editores y compiladores; no para todo, y no todos necesitan
aprenderlo.

---

## Lo que NO adoptaria

- **El kernel de plugins (Cordis) y "todo es un plugin".** Resuelve un problema que no tenemos: ellos
  arman un producto extensible por terceros; nosotros tenemos 60 tools en un repo privado. Seria
  andamiaje sin peso que cargar (regla 2.10 de nuestro AGENTS).
- **Los tres idiomas por documento** (`.md`, `.zh.md`, `.i18n.yaml`) y sus gates de traduccion.
- **La cobertura por archivo al 100%** como gate de CI. Es una politica de una libreria publica.
