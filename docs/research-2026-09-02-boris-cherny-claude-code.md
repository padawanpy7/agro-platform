# Research 02/09/2026: Boris Cherny (Claude Code) en YC, y que le sacamos a nuestro loop

Una charla, una pregunta: **el equipo que construye la herramienta que usamos, .que hace al revés
que nosotros?** Lo que sigue es lo adoptable, no un resumen.

**Fuentes** (la pagina de YC es una SPA y no sirve para traer texto: devuelve solo el titulo)

1. `ycombinator.com/library/UN-boris-cherny-building-claude-code` - la charla (Startup School 2026,
   con Diana Hu, recien salido Opus 5). **No se puede leer con un fetch.**
2. `ycrootaccess.com/p/boris-cherny-building-claude-code` - transcripcion/resumen. **La fuente mas
   rica de las que se pudieron traer.**
3. `spoken.md/episode/boris-cherny-building-claude-code-...` - transcripcion, se trajo parcial.
4. `startuphub.ai/.../anthropic-s-boris-cherny-on-building-claude-code` - resumen.
5. `newsletter.pragmaticengineer.com/p/building-claude-code-with-boris-cherny` (Gergely Orosz) - lo
   de practicas de equipo sale casi todo de aca.

**Aviso de confianza**: 2-5 son transcripciones y resumenes de terceros. Las frases entre comillas
estan atribuidas a Cherny por esas fuentes, no por una grabacion que hayamos escuchado. Lo que se
adopta abajo no depende de la palabra exacta; donde el matiz importa, esta marcado.

---

## 1. La idea central: **borrar es el trabajo**

> *"Every time that a new model comes out, we delete a bunch of the system prompt, change a bunch of
> the system prompt."*

Con Opus 5 borraron **mas del 80% del system prompt**, y el motivo es el que nos importa:

> *"A lot of the stuff in the system prompt was correcting for these behaviors that the model should
> have known, but it didn't. Now Opus 5 just does it."*

Y el remate, que es el que nos incomoda:

> *"The model is actually a little bit more intelligent without these prompts."*

**Esto ya esta escrito en nuestro AGENTS.md, Regla 2.10** ("desmonta andamiaje viejo... al salir un
modelo nuevo, revisa el loop apuntando a MENOS scaffolding"). La diferencia es que **nosotros
nunca la ejercimos**: la regla se escribio y el loop siguio creciendo. Hoy corremos Opus 5 -el
modelo para el que ellos borraron el 80%- con `AGENTS.md` en 500 lineas de tope, cuatro playbooks de
320 a 520, y un gate de presupuesto que **vigila que no crezcan** pero no obliga a probar si hacen
falta.

**Lo accionable, y es lo unico que ellos tienen y nosotros no:** un **interruptor de ablacion**.
Ellos prueban con `claude code simple=1`, que saca todos los prompts del sistema, y despues re-agregan
solo lo que hace falta. Nosotros no tenemos forma de correr una tarea **sin** `AGENTS.md` ni los
playbooks para ver si el resultado empeora. Sin eso, "sacar andamiaje" es una opinion.

## 2. La habilidad que importa no es promptear: es **verificar**

> *"Give it a way to verify the output of its work so it doesn't get stuck."*

Coincide con lo que veniamos midiendo, y por eso vale como confirmacion externa y no como noticia:
nuestro `check` + verifier es lo mejor que tenemos. Lo que la charla agrega es **el orden de
prioridad**: la verificacion es LA pieza, no una mas.

Contra eso, nuestro agujero de esta semana es peor de lo que parecia: no es que falten gates, es que
**tenemos gates que dicen "no encontre nada" cuando quieren decir "no pude mirar"**
(`kove-actividad estado` con la grilla vacia, `aceptacion` corriendo `sh -c` bajo cmd.exe). Un gate
que miente es peor que no tenerlo, porque el modelo lo usa como senal de parada.

## 3. **Los evals caducan**, y hay que dejarlos morir

> *"An eval might live for maybe one, two, three model generations."*

Saturan el eval, lo tiran y arman otro con las fallas nuevas que observan.

Nosotros tratamos los gates como permanentes. Ninguno tiene **fecha de nacimiento** ni revision al
cambiar de modelo. Dos de esta semana ya estan pidiendo la jubilacion: reglas del lint que existen
para errores que el modelo ya no comete, contra otras que no cazan lo que si sigue pasando
(`gates-estaticos-no-resuelven-nombres`). Adoptable barato: que cada gate declare **cuando nacio y
que falla vino a atajar**, y que al cambiar de modelo se revise si esa falla sigue existiendo.

## 4. Prototipos en vez de PRD (y donde NO nos aplica)

> *"There's just no way we could have shipped this if we started with static mocks and Figma or if we
> started with a PRD."*

Tiraron los PRD: hacen decenas de prototipos funcionando antes de shippear.

**Ojo con copiar esto.** Nosotros escribimos PL/SQL sobre las bases de un banco, con una compuerta
humana antes de codear; ahi el SDD no es burocracia, es lo que evita tocar produccion a ciegas.
**Donde si aplica es en el loop**, que es nuestro propio producto y donde el cliente somos
nosotros: para una tool nueva, un prototipo que corre vale mas que un `design.md`. El 25/08 ya nos
costo al reves (`HN-GATES-RAPIDOS`: plan aprobado sobre un numero que despues resulto valer 293 ms).

## 5. Buscar con glob y grep le gano a la base vectorial

La recuperacion de codigo de Claude Code es **glob + grep manejados por el modelo**. Probaron bases
vectoriales locales e indexado recursivo con modelo: perdieron. La idea salio de mirar como buscaban
los ingenieros de Instagram cuando se rompio el "click to definition" del editor de Meta.

Es exactamente nuestra Regla 2.5 y la razon por la que el 24/08 se saco `db-deps`. **Vale como
validacion externa de una decision que ya tomamos**, no como cambio. Y refuerza la parte que si es
nuestra: el grafo de la BD lo da el diccionario de Oracle, no un parser.

## 6. Una migracion a medias confunde al modelo igual que a una persona

De su epoca en Meta, con analisis causal: la limpieza del codigo tiene **impacto de dos digitos
porcentuales en la productividad**. Y la regla que saca:

> *"always make sure that when you start a migration, you finish the migration"*

Nos pega directo, y hoy mismo: ICC-150 quedo con la familia `TARDEB_WS_*` vieja **sin borrar** en la
base (el `delete` esta escrito en la cabecera del script y no se corrio), y la entrega describiendo
el servicio anterior. Los dos son "migracion a medias" y los dos ya tienen su marca. Es el mismo
patron que ya teniamos fichado como hecho: `unificar-dos-caminos-deja-atras-al-llamador`.

## 7. Paralelismo: 20-30 PR por dia, 5 pestañas

Cherny corre **cinco checkouts separados**, arranca en modo plan, itera el plan, y recien despues
implementa:

> *"once there is a good plan, it will one-shot the implementation almost every time."*

Es lo que nuestro `HN-MULTI-SESION` describe y no termina de resolver -hoy tenemos cuatro worktrees
y la friccion esta en el `node_modules` y en los archivos compartidos entre ramas, no en el modelo-.
Y confirma nuestra compuerta humana: el plan primero, la implementacion despues.

## 8. Rutinas diarias que mantienen el codigo solo

Corren **20-30 rutinas por dia** sobre su propio repo: codigo muerto, huecos de cobertura,
unificacion de abstracciones (le dicen *"abstraction police"*).

Nosotros tenemos las dos piezas sueltas -`/loop` y `cron`- y ninguna rutina de mantenimiento
corriendo. Candidatas obvias, todas con gate propio ya escrito: `presupuesto`, `hechos`, `spell`,
`tool-usage` (que dice que tools no se usan nunca), y el barrido de `work/kove/` que hoy tiene 300+
`modal-no-abrio-*.html` de agosto.

## 9. Dejalo correr, con criterio de salida

> *"Give the model slightly harder tasks than what you think it can do."*

El ejemplo que dan: reescribir Bun de Zig a Rust, **11 dias y mas de 100.000 lineas**, sin
intervencion. Y el prompt que citan como suficiente:

> *"Rewrite this in Swift. Run the old version, screenshot it, compare pixel by pixel. Don't stop
> until you're done."*

Ese prompt es, textualmente, **las cinco piezas de un loop**: objetivo, verificacion (comparar pixel
por pixel), y **regla de parada** ("don't stop until you're done"). Es la validacion externa de lo
que construimos el 31/08 y estrenamos ayer con `HECHO_CUANDO.md`.

## 10. Lo que NO se adopta

- **"Borramos todo el codebase con cada modelo"**: ellos pueden; nosotros tocamos objetos que corren
  en un banco, con pase a QA y produccion. Lo que si se adopta es borrar **el andamiaje del
  loop**, que es nuestro y no tiene usuarios.
- **Tirar el SDD**: la compuerta humana antes de codear se queda para los tickets. Ver §4.
- **El ritmo de 20-30 PR/dia** no es una meta: sale de un repo propio, con CI propio y sin pase.

---

## Que hacemos con esto

| # | Que | Ficha |
|---|---|---|
| 1 | **Interruptor de ablacion**: poder correr una tarea sin `AGENTS.md` ni playbooks y comparar el resultado, para que "sacar andamiaje" deje de ser una opinion (§1). | nueva |
| 2 | **Fecha de nacimiento y motivo por gate**, y revision al cambiar de modelo: los evals caducan (§3). | nueva |
| 3 | **Rutinas diarias de mantenimiento** con lo que ya tenemos: `presupuesto`, `hechos`, `tool-usage`, limpieza de `work/` (§8). | nueva |
| 4 | Terminar las migraciones abiertas de ICC-150 (claves viejas, entrega) (§6). | en el ticket |
| 5 | El agujero de verificacion que ya venia: gates que confunden "no hay" con "no pude mirar" (§2). | ya fichado (`HN-CIERRE-HONESTO`) + las tres nuevas del 02/09 |

---

# Parte 2 (02/09, mas tarde): las dos fuentes que faltaban, y lo que cambia de verdad

**Fuentes nuevas**

6. `howborisusesclaudecode.com` - recopilacion de como usa Claude Code el que lo construyo.
7. `every.to/podcast/how-to-use-claude-code-like-the-people-who-built-it` - Boris Cherny y Cat Wu.

Mismo aviso de confianza que arriba: son recopilaciones de terceros.

## 11. "El modo plan ya no hace falta" - y por que a nosotros NO nos aplica igual

> *"The newer models don't actually need a planning step. It was really important for Opus 4 through
> 4.5, but starting with 4.6... it just doesn't need it."*

Es la afirmacion mas incomoda del research, porque nuestro flujo empieza con SDD y una compuerta
humana. **La distincion que la resuelve: ellos hablan del plan como ayuda para el MODELO; nuestra
compuerta no es para el modelo, es para el DUEÑO.** El plan existe para que una persona revise antes
de que se toque un objeto de un banco, no para que el modelo piense mejor. Esa razon no caduca con
el modelo.

Lo que si se puede podar, y es medible: **el plan como paso previo en modo quick**. Ahi no hay
compuerta -el playbook ya dice que un cambio de 1-2 lineas va directo-, asi que el plan solo estaria
ayudando al modelo. Entra como caso de prueba de `HN-ABLACION-DEL-ANDAMIAJE`.

## 12. Ellos agregan al CLAUDE.md igual que nosotros. La diferencia es que TAMBIEN borran

> *"Anytime we see Claude do something incorrectly we add it to the CLAUDE.md, so Claude knows not
> to do it next time."*

Es exactamente nuestro `memory/hechos/` + los playbooks, y lo hacen varias veces por semana. O sea
que la practica esta bien.

**Lo que nos falta es la otra mitad del ciclo.** Ellos agregan Y borran (el 80% del system prompt en
Opus 5). Nosotros solo agregamos, y el unico freno es un tope de lineas que obliga a **comprimir**,
no a **podar**: cuando `presupuesto` salta, la salida sugiere mover el detalle a un archivo hermano.
Mover no es sacar. Sin la mitad que borra, el loop crece hasta el techo y ahi se queda.

## 13. Menos tools: "less choice for Claude, a little less stuff in context"

Se apoyan cada vez mas en Bash como interfaz universal en vez de tools especializadas.

Nuestra Regla 2.6 dice lo mismo. **Lo medido hoy con `tool-usage`, que es lo que vale:**

- **75 tools** en el catalogo. **Ninguna sin uso**: el criterio "sacar lo que nunca se uso" no poda
  nada.
- Pero cuatro nombres del log -`served-fresh`, `smoke`, `strip-comments`, `adopt`- se usaron **una
  vez, el 04/08**, y ya no existen como tools: el log mezcla vivas y muertas, asi que "ninguna sin
  uso" es una respuesta optimista sobre una lista incompleta.
- Y el dato que importa: **el 30% del tiempo de tools se va en Kove**
  (`kove-actividad` 13.8% + `kove-cargar-horas` 8.3% + `kove-seguimiento` 5.3% + `kove-tarea` 2.8%
  = 11.000 s de 36.000 s medidos). Eso es **cargar horas, no desarrollar**.

O sea que nuestro andamiaje mas caro no es `AGENTS.md`: es la automatizacion de Kove. Y es la misma
superficie donde `gaps` propone 4 de sus 5 fichas y la que nos mordio tres dias seguidos.

## 14. Verificacion adversarial: revisores que se agujerean entre si

La tecnica concreta, y es la mas adoptable de todo el research:

> Varios subagentes con roles en conflicto -uno mira estilo, otro la historia, otro bugs- y despues
> *"five more subagents specifically tasked with poking holes in the original findings"*.
> Resultado: *"it finds all the real issues without the false [ones]"*.

Nosotros tenemos **un** verifier, y su problema medido esta semana no fue no encontrar: fue **dar
por bueno lo que no midio** (`HN-CIERRE-HONESTO`) y, hoy mismo, **explicar un sintoma con una causa
inventada** que sobrevivio a su propio control positivo. Un segundo pase cuyo unico trabajo sea
agujerear el hallazgo del primero es exactamente lo que faltaba.

Y ya tenemos con que: la tool `Workflow` corre agentes en paralelo con fases, y `.claude/agents/` ya
define los roles.

## 15. "Que siga hasta que este hecho", pero automatico

> *"You can just make the model keep going until the thing is done"* - con un hook que al terminar
> corre la suite y le devuelve los rojos.

Nuestra regla de parada existe (`HECHO_CUANDO.md`) y ya nos sirvio, pero **la corre una persona**.
Nada la dispara sola al final de una tanda. Es la pieza que convierte la regla de parada en un loop
de verdad.

## 16. Lo que valida lo que ya hacemos (no cambia nada, pero conviene saberlo)

- **Worktrees por sesion**, numerados, uno por tarea: es nuestro `task-start` (`HN-MULTI-SESION`).
- **"Diarios" que otro agente destila en aprendizajes reutilizables**: es nuestro `PROGRESO.md` mas
  la destilada a `memory/hechos/` del cierre final.
- **`settings.json` versionado con los permisos del equipo**: ya lo tenemos.
- **Verificacion como LA pieza** (*"give Claude a way to verify its work... it will 2-3x the
  quality"*): dicho tres veces en tres fuentes distintas.

## 17. Practica del operador (no del loop)

Dos que no son del repo sino de como se opera, y valen para el dueño:

- **`/rewind` en vez de "eso no anduvo, proba con X"**: vuelve atras y **saca del contexto** el
  intento fallido, en vez de dejarlo pesando.
- **`/compact` con hint** (`/compact enfocate en X, tira el debug de Y`): dirige que se conserva.

---

## Integracion: que hacemos, en orden

| # | Que | Estado |
|---|---|---|
| 1 | **Verificacion adversarial**: un segundo pase que agujerea los hallazgos del primero, antes de darlos por buenos. Es lo unico del research que ataca el fallo que tuvimos HOY. | proponer ficha |
| 2 | **El ciclo completo de la memoria**: al `presupuesto` le falta la mitad que PODA. Hoy solo obliga a mover el detalle de lugar. | entra en `HN-ABLACION-DEL-ANDAMIAJE` |
| 3 | **Podar el catalogo de tools** con el dato medido, no con la sensacion: cuatro nombres muertos en el log, 30% del tiempo en Kove. | proponer ficha |
| 4 | **El plan en modo quick** como primer caso de ablacion medible. | entra en `HN-ABLACION-DEL-ANDAMIAJE` |
| 5 | **Disparar `aceptacion` sola al cerrar una tanda**. | entra en `HN-RUTINAS-DIARIAS` |
