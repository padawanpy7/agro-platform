# Research 31/08/2026: loop engineering, y que le falta a nuestro harness para llegar

Siete fuentes, una pregunta: **como se pasa de un harness a un LOOP**. Lo que sigue es lo adoptable,
no un resumen.

**Fuentes**

1. `mindstudio.ai/blog/loop-engineering-vs-harness-engineering` - la distinción, sus componentes.
2. `ibm.com/think/topics/loop-engineering` - definicion (403 al traerlo; se cita por el buscador).
3. arXiv 2607.00038 - *Stop Hand-Holding Your Coding Agent: Engineering the Loops that Replace
   Step-by-Step Prompting*.
4. arXiv 2604.25850 - *Agentic Harness Engineering: Observability-Driven Automatic Evolution of
   Coding-Agent Harnesses*.
5. `anthropic.com/engineering/effective-harnesses-for-long-running-agents`.
6. `developers.openai.com/blog/run-long-horizon-tasks-with-codex` (+ `openai.com/index/harness-engineering`, 403).
7. arXiv 2606.26300 - *The Verification Horizon: No Silver Bullet for Coding Agent Rewards*, y
   arXiv 2607.06906 - *The Harness Effect: token economics*. Sobre Kimi K2.6: la nota util es su
   definicion de harness -"el loop, las tools, los permisos, la memoria y las reglas"- y que separan
   modelo (K2.6) de harness (Kimi Code).

---

## 1. La distinción, y donde estamos parados

> **Harness engineering** es "todo lo que RODEA al agente": tools, credenciales, memoria, manejo de
> errores, observabilidad, seguridad.
> **Loop engineering** es "el CICLO ITERATIVO que el agente sigue hacia un objetivo": cadencia,
> evaluacion del progreso, y **condiciones de salida**.

La progresión que las fuentes describen es: prompt engineering -> context engineering -> harness
engineering -> **loop engineering**.

Y la frase que ordena todo (mediados de 2026): *"stop prompting your agent, start designing the loop
that prompts it"*. Un **loop spec** es un artefacto acotado y reutilizable hecho de cinco piezas:

| Pieza | Que es | Como estamos |
|---|---|---|
| **Trigger** | que arranca una vuelta | `task-start` a mano. Sin arranque automatico (ficha `HN-ARRANQUE-TRAMO`). |
| **Goal** | el objetivo, congelado | `jira/<T>/proposal.md` + `tasks.md`. **Lo tenemos.** |
| **Verification** | el paso que dice pasa/no pasa | `check` + el verifier. **Lo tenemos, y es lo mejor que tenemos.** |
| **Stopping rule** | cuando esta HECHO | **No existe por ticket.** Es el agujero grande. |
| **Memory** | que sobrevive a la vuelta | `MEMORY.md` + `hechos/` + `PROGRESO.md`. **Lo tenemos**, y desde hoy con ciclo de vida. |

O sea: **cuatro de cinco piezas ya estan construidas**. Nos falta la regla de parada, y falta que
las cinco estén declaradas juntas en algun lado en vez de repartidas por convencion.

## 2. Lo que mas nos falta: un "Done when" que sea un COMANDO

Anthropic lo dice en una linea:

> "Give Claude something that produces a **pass or fail**, and the loop closes on its own. Claude
> does the work, runs the check, reads the result, and iterates until the check passes."

Y OpenAI, para tareas largas, pide una seccion **"Done when"** con los chequeos y flujos concretos
que constituyen el fin, no un objetivo vago; ademas de *"freeze the target so the agent doesn't
build something impressive but wrong"*.

Nosotros tenemos `tasks.md` con casillas que **las marca el mismo que trabaja**. Eso no es una regla
de parada: es una declaracion. La diferencia se midio en este proyecto mas de una vez -el hecho
`decir-que-se-ficho-no-es-ficharlo` y el `un-e2e-verde-puede-no-haber-ejecutado-nada` son el mismo
animal-. El ledger `FEATURES.json` **si** tiene la forma correcta (`passes: true/false` por ficha),
pero solo cubre al harness, no a los tickets.

**Adoptable ya**: que cada ticket declare su `HECHO_CUANDO` como una lista de comandos que devuelven
0 o 1, y que `cierre` los corra. Sin eso, "terminado" es una opinion.

## 3. El loop que se arregla solo: observabilidad -> evolucion del harness

Esto es exactamente lo que se viene pidiendo aca: *"un cierre encuentra gaps y los corrige sin que
yo le diga nada"*. El paper 2604.25850 lo hace, y su receta tiene cuatro pasos:

1. **Observar la ejecucion real**: trazas de acciones y tools, resultado (exito/fallo), mensajes de
   error, latencia y tokens.
2. **Detectar el hueco**: agrupar las corridas fallidas por modo de falla (*failure clustering*) y
   rastrear la causa hasta la instruccion, la tool o el contexto que faltaba.
3. **Proponer el cambio** y **validarlo contra un conjunto de tareas apartado** antes de aplicarlo.
4. **Guardas**: versionar el harness para poder volver atras, y **exigir que lo que ya pasaba
   siga pasando**.

Nosotros ya tenemos el paso 1 a medias -`metrics/tool-runs.log` guarda fecha, tool, exit, ms y
argumentos-, y **no tenemos el paso 2**: nadie agrupa los fallos. El salto no es construir un
sistema nuevo: es leer el log que ya escribimos.

## 4. La verificacion no es un cheque en blanco

*The Verification Horizon* nombra tres modos de falla del verificador, y **los tres los sufrimos**:

- **False green**: el test pasa y la solucion esta mal (`test-que-no-falla-contra-el-codigo-viejo`,
  `un-e2e-verde-puede-no-haber-ejecutado-nada`, `observable-compartido-pasa-en-falso`).
- **Oráculo incompleto**: lo que el test no mira, no existe (`verificar-el-todo-no-un-subconjunto`).
- **Reward hacking**: optimizar la medicion en vez del objetivo. Version nuestra: podar un documento
  a las apuradas para que el gate pase, en vez de decidir que sobra.

Su recomendacion no es "mejores tests" sino **verificacion en capas con señales independientes**, y
humildad sobre el limite. Nuestra regla de "control negativo en las dos direcciones" ya es una capa;
la segunda capa que nos falta es que el criterio de aceptacion salga del **pedido**, no del que
implementa.

## 5. La plata: la forma del loop domina el costo

*The Harness Effect* dice que la orquestación mueve el costo en tokens **ordenes de magnitud** para
la misma logica de negocio, y nombra cuatro desperdicios. Los cuatro son nuestros:

| Desperdicio del paper | Como se llama aca |
|---|---|
| Ciclos de validacion redundantes | correr `check` entero varias veces por tanda |
| Re-correr la suite completa | `test-js` corre los 800 tests aunque cambie un archivo |
| Releer el mismo contexto | los documentos de arranque; por eso existe `presupuesto` |
| Sobre-instrumentacion | -por ahora no- |

Refuerza la ficha `HN-EVIDENCIA-ACOTADA-A-LA-SUPERFICIE`, y le agrega el orden correcto: **primero
medir**, despues acotar.

## 6. Los tres modos de falla del LOOP (los del harness ya los conocemos)

Del MindStudio, y valen como checklist:

1. **Loop infinito**: no para. Nuestra version: una tanda que sigue "mejorando" sin criterio.
2. **Para demasiado pronto**: se corta con trabajo sin hacer.
3. **Declara exito antes de tiempo**: el mas caro, y el que mas nos paso.

Los tres salen de **criterios de terminación mal definidos**. No se arreglan con mejor prompt: se
arreglan con una regla de parada que no la escriba el que trabaja.

---

## Lo que NO adoptaria

- **El swarm de 300 sub-agentes de Kimi K2.6.** Nuestro cuello no es paralelismo: es que el trabajo
  de una sola vuelta no tiene criterio de fin. Sumar agentes multiplica lo que ya no se verifica.
- **La auto-modificacion automatica del harness** (el paso 3 del 2604.25850 aplicado solo). El paso
  util es la DETECCION; que la ficha la escriba el harness y la apruebe un humano.
- **Los cuatro archivos de OpenAI** (`Prompt.md`, `Plan.md`, `Implement.md`, `Documentation.md`).
  Ya tenemos jira con esa forma; copiarlos seria un segundo esquema para lo mismo.
