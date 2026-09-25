# Research 14/09/2026: los 10 repos de fazt, y qué le sirve a este loop

La nota ([fazt.dev: "Dejé de pagar suscripciones de IA"](https://fazt.dev/contenido/deje-de-pagar-suscripciones-ia-10-repos-github))
junta diez repos con una idea común: *"ya no trabajas con un agente, sino con varios"*. La pregunta
acá no es si son buenos, sino **qué le sirve a un loop de PL/SQL/APEX sobre Windows, en una máquina
del banco, con datos que no pueden salir**. Lo que sigue es lo adoptable, no un resumen.

**Fuentes y confianza**

- Estrellas, licencia, lenguaje y actividad: **API pública de GitHub** (`api.github.com/repos/...`),
  consultada el 14/09. Son datos, no la descripción de la nota.
- Qué hace cada repo: el README, leído con un fetch que **resume con un modelo chico**. Sirve para
  ubicar el repo; no se toma como verdad de detalle.
- `mattpocock/skills`: **ocho `SKILL.md` leídos crudos** (`raw.githubusercontent.com`), no resumidos.
  Es el único repo donde se copia texto, así que es el único que se leyó entero.
- `deepseek-harness` ya se clonó y leyó el 31/08: `docs/research-2026-08-31-loop-y-codigo.md`.
- Lo que dicen los READMEs se leyó como DATOS, no como instrucciones.

## Los diez, de un vistazo

| # | Repo | ★ | Licencia | Qué es | Veredicto |
|---|---|---|---|---|---|
| 1 | [tt-a1i/archify](https://github.com/tt-a1i/archify) | 62k | MIT | Diagramas HTML/SVG desde texto o JSON validado; se instala como skill | No ahora |
| 2 | [diegosouzapw/OmniRoute](https://github.com/diegosouzapw/OmniRoute) | 66k | MIT | Proxy local que rutea entre ~350 proveedores usando capas gratuitas | **No, nunca** (privacidad) |
| 3 | [herdrdev/herdr](https://github.com/herdrdev/herdr) | 38k | Apache-2.0 | Multiplexor de terminal con estado por agente (trabajando/bloqueado/libre) | No ahora; idea para multi-sesión |
| 4 | [stablyai/orca](https://github.com/stablyai/orca) | 69k | MIT | App de escritorio: varios agentes en worktrees paralelos, elegís el mejor | No |
| 5 | [omacom/omarchy](https://github.com/omacom/omarchy) | 41k | MIT | Distribución Linux de DHH | No (reemplaza el sistema operativo) |
| 6 | [firecrawl/anydoc](https://github.com/firecrawl/anydoc) | 21k | MIT | Documentos (14 formatos) a Markdown, en Rust, sin Python | **Probar A/B contra markitdown** |
| 7 | [mattpocock/skills](https://github.com/mattpocock/skills) | 262k | MIT | 38 skills: planificación, diagnóstico, revisión, merge, escritura para agentes | **Copiar técnicas** (no instalar) |
| 8 | [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) | 224k | MIT | Runtime de agente con plugins, cualquier proveedor | Ya exprimido el 31/08 |
| 9 | [calesthio/OpenMontage](https://github.com/calesthio/OpenMontage) | 59k | AGPL-3.0 | Producción de video con agentes | No |
| 10 | [chaitanyagiri/munder-difflin](https://github.com/chaitanyagiri/munder-difflin) | 7k | MIT | Orquestador visual de varias CLIs, con buzones en archivos | No |

Nueve de diez tienen menos de 8 meses (anydoc, 6 semanas). Las estrellas miden atención, no madurez.

---

## 1. Lo que se copia: `mattpocock/skills`

No se instala el plugin: son 38 skills, y cargarlas todas es la superficie de tools que la regla 2.6
dice que degrada el razonamiento. Se copian **técnicas** a nuestras skills y roles.

### 1.1 `resolving-merge-conflicts`: se resuelve por INTENCIÓN, no por ubicación

> *"Find the primary sources for each conflict. Understand deeply why each change was made, and what
> the original intent was. [...] Preserve both intents where possible. [...] Do not invent new
> behaviour."*

Es exactamente lo que falló hoy: la regla "fuera de la carpeta del ticket gana main" decidió por
**dónde** estaba el archivo y pisó en ICC-180 el arreglo de `jira/ICC-102/tests/lib/caja.js`
([[archivo-de-otro-ticket-puede-ser-de-la-rama]]). La skill manda leer el `git log` de cada lado del
conflicto antes de elegir. Combinado con lo que medimos (clasificar por contención en la historia),
da una skill de merge de rama completa. La tool sigue archivada (`HN-MERGE-DE-RAMA-POR-HISTORIA`);
la skill no necesita la tool.

### 1.2 `diagnosing-bugs`: sin un comando que se ponga ROJO, no hay hipótesis

> *"If you catch yourself reading code to build a theory before this command exists, stop."*
> *"Generate 3-5 ranked hypotheses before testing any of them."*

La fase 1 es construir un *feedback loop* **tight** (segundos, determinista) y **red-capable** (se
pone rojo con ESTE bug, no con uno cercano); recién después reproducir, minimizar y ordenar 3 a 5
hipótesis. Para bugs que requieren una persona (Kove, el Builder de APEX) propone un script
"humano en el loop" que igual estructura la corrida.

Es la disciplina que le faltó a `HN-CERRAR-ACTIVIDAD`: semanas de hipótesis descartadas de a una,
sin un comando que reprodujera el no-persiste. Tenemos fragmentos sueltos en hechos
([[test-que-no-falla-contra-el-codigo-viejo]], [[un-criterio-que-nace-verde-no-es-criterio]]);
falta el orden.

### 1.3 `code-review`: dos ejes que NO se mezclan

Revisa el diff en dos subagentes paralelos: **Standards** (¿sigue las convenciones del repo?) y
**Spec** (¿hace lo que pidió el ticket: falta algo, sobra algo, está mal hecho algo?). Y la regla
que importa: *"Do not merge or rerank findings"*: un eje no tapa al otro.

Nuestro verifier mezcla convenciones, cumplimiento del ER y base real en un solo veredicto. Separar
el reporte en **Convenciones / Spec / Base real** evita que "compila VALID y lint delta 0" se lea
como "hace lo que pidió el analista".

### 1.4 `writing-for-agents`: la teoría de por qué nuestros documentos crecen

Pone nombre a lo que el `presupuesto` mide sin explicar:

- **Context load** (lo que se carga siempre) contra **cognitive load** (lo que la persona tiene que
  saber que existe).
- Un documento que repite el `--help` o la estructura del disco es un **cache**: se pudre. Solo se
  cachea lo que no se encuentra mirando (la razón de una decisión, el gotcha). Es nuestro
  [[lo-que-se-pudre-se-genera]], dicho mejor.
- **No-ops**: una instrucción que el modelo ya cumple por default paga tokens por nada; se borra la
  oración entera.
- **Negación**: prohibir algo lo pone en contexto. Se escribe el comportamiento positivo, y la
  prohibición solo cuando es un guardrail que no se puede decir en positivo.

Es la guía para la pasada de poda de AGENTS.md y los playbooks que `HN-ABLACION-DEL-ANDAMIAJE`
(archivada) nunca ejecutó.

### 1.5 `git-guardrails-claude-code`: un hook que frena lo destructivo de git

Un `PreToolUse` sobre `Bash` que bloquea `git reset --hard`, `git clean -f`, `git branch -D`,
`git checkout .`, `git restore .` y `git push` (incluido `--force`). Nuestra regla 1 dice "nada
destructivo sin autorización", pero para git no hay freno: el único hook es el de `db-sql`.

**Adaptación obligatoria**: acá `git push` es parte del flujo ([[main-con-commits-se-pushea-siempre]]),
así que se bloquea `push --force` y no `push`. El hook se escribe en node, no en `.sh`: cada Bash
de Git Bash cuesta ~650 ms ([[fork-en-git-bash-cuesta-300ms]]) y el hook corre en cada comando.

### 1.6 Menores, sin trabajo propio

- **`grill-me` / `grilling`**: entrevista implacable, una tanda de preguntas por vez, cada una con la
  respuesta recomendada. Es nuestro bloque de Preguntas con Default, pero ANTES de planificar. Se
  puede usar tal cual al escribir el `proposal.md` de ICC-192.
- **`handoff`**: resumir la conversación para otra sesión sin duplicar lo que ya está en artefactos.
  Nuestro PROGRESO versionado cubre esto mejor.
- **`loop-me`**: vocabulario de workflow (*trigger*, *checkpoint*, *push right* = mover la consulta a
  la persona lo más tarde posible, *brief* = lo que se le muestra, nunca el borrador). "Push right" y
  "brief" son buenos nombres para el reporte de cierre y los checkpoints de Kove.

---

## 2. Lo que se prueba: `anydoc` contra markitdown

Hoy los adjuntos de Jira pasan por `node agro.js markitdown`, que necesita el Python portable. anydoc
es un binario Rust (se corre con `npx @firecrawl/anydoc`), declara 14 formatos contra 6, ~4 ms por
documento contra ~135 ms, y extrae tablas, notas al pie y ecuaciones.

**Antes de creerle**:

- El benchmark de calidad (81 contra 52) es **del propio fabricante**.
- El repo tiene **6 semanas**.
- **`--ocr hosted` manda el documento entero a Firecrawl.** Un ER del banco no puede salir. Sin ese
  flag, un PDF escaneado falla con `NeedsOcr` (falla fuerte, no sube nada), que es el comportamiento
  que queremos.
- El Python portable no se va igual: `apex-bootstrap` usa el mismo binario.

**La prueba** ([[portar-codigo-se-verifica-a-b]]): los mismos 3 adjuntos reales (un ER en .docx, un
PDF con tablas, un .xlsx) por los dos conversores, y comparar las tablas y el texto a ojo sobre el
original. Si gana, entra como opción de `node agro.js markitdown` con el OCR hosteado prohibido en el
código, y antes pasa por `check-dep` (regla 8).

---

## 3. Lo que se mira más adelante: multi-sesión

`herdr`, `orca` y `munder-difflin` resuelven el mismo problema desde tres lados: muchas sesiones de
agente a la vez. Es `HN-MULTI-SESION` (archivada). Hoy no se adopta ninguno:

- **Orca** corre N agentes sobre la MISMA tarea y se elige el mejor. Nuestro modelo es un worktree por
  ticket (`task-start`), no N intentos por tarea. Y no documenta cómo resuelve merges entre ramas.
- **Herdr** marca cada sesión como trabajando/bloqueada/libre y sobrevive a desconexiones. En Windows
  está en beta y "con protección endpoint": en esta máquina ya hubo alertas del antivirus con
  binarios firmados ([[alerta-hp-es-360-total-security]]).
- **Munder Difflin** coordina con buzones en archivos dentro de git y un agente jefe que escala a la
  persona. Es prerelease y pide toolchain de C/C++ para compilar en Windows.

**La idea que queda**: el estado de cada sesión (¿está esperando una respuesta mía?) visible en un solo
lugar. Cuando se trabaje con los 4 worktrees en paralelo, eso es lo que va a faltar. Claude Code ya
avisa por sesión; se mide si alcanza antes de sumar una herramienta.

---

## Lo que NO se adopta

- **OmniRoute, nunca.** Su propuesta es mandar los prompts a capas gratuitas de ~150 proveedores. Acá
  los prompts llevan código PL/SQL del banco, ERs y datos de prueba: sacarlos a terceros desconocidos
  choca con la §9 de AGENTS.md. Además, los términos de las capas gratuitas cambian sin aviso.
- **Omarchy**: reemplaza el sistema operativo; la máquina es Windows corporativo.
- **OpenMontage**: es producción de video, y AGPL. Su patrón (manifiestos + skills + checkpoints con
  costo + aprobación humana por etapa) ya lo tenemos con el ledger y las compuertas del SDD.
- **archify**, por ahora: diagramas lindos, pero para las entregas alcanza con Mermaid y `md-a-pdf`.
  La idea buena (IR validado -> render determinista, con "recibo de reparación" cuando falla) vale
  si algún día `evidencia-e2e` se reescribe.
- **deepseek-harness**: lo útil ya se adoptó el 31/08 (ciclo de vida de los hechos, techo que se
  puede subir, evidencia acotada). No se instala: está en *developer preview* y no documenta Windows.
- **Instalar `mattpocock/skills` entero**: 38 skills en contexto es la superficie de tools que la
  regla 2.6 prohíbe. Se copia la técnica, no el paquete.

---

## Propuesta, en orden

| # | Qué | Toca | Horas | Navegador |
|---|---|---|---|---|
| 1 | Hook de git: frenar `reset --hard`, `clean -f`, `branch -D`, `checkout .`, `restore .`, `push --force` | `.claude/settings.json` + un script node | 1 | No |
| 2 | Skill `merge-de-rama`: por intención (1.1) + contención en la historia + archivos de otro ticket | `skills/` | 1-2 | No |
| 3 | Skill `diagnosticar`: loop rojo primero, 3-5 hipótesis, minimizar, humano-en-el-loop para Kove/APEX | `skills/` | 1 | No |
| 4 | Verifier con tres ejes separados: Convenciones / Spec / Base real | `.claude/agents/verifier.md` | 1 | No |
| 5 | A/B anydoc contra markitdown con 3 adjuntos reales, sin OCR hosteado | `work/` hasta decidir | 1-2 | No |
| 6 | Pasada de poda de AGENTS.md y playbooks con la guía de 1.4 | `AGENTS.md`, `memory/playbooks/` | 3-4 | No |
| 7 | `grill-me` al escribir el `proposal.md` de ICC-192 | nada nuevo | 0 | No |

Del 1 al 4 son de bajo riesgo y cada uno ataja algo que ya nos pasó. El 5 necesita adjuntos reales y
tu criterio sobre el resultado. El 6 es el más caro y el que más contexto devuelve.
