---
name: merge-de-rama
when: traer main a una rama de ticket atrasada; resolver un merge o rebase con conflictos
---

# Skill: merge de rama

Un conflicto se resuelve por la **intención** de cada cambio, no por la carpeta donde vive el archivo.
Nace del 14/09/2026: cuatro ramas con 55-77 conflictos cada una, y la regla por ubicación pisó un
arreglo real (un archivo de otro ticket puede ser en verdad de la rama). Técnica tomada de
`mattpocock/skills` (`resolving-merge-conflicts`); detalle en `docs/research-2026-09-14-10-repos-fazt.md`.

## Pasos

1. **Medir antes de tocar.** Worktree limpio. `git merge-tree --write-tree --name-only main <RAMA>`
   da la lista real de conflictos sin tocar nada; `node agro.js rama-drift <RAMA>` separa loop de ticket.
   Hecho cuando: tenés la lista y el merge-base (`git merge-base main <RAMA>`).

2. **Clasificar cada conflicto por la historia**, no a ojo:
   - el contenido de la rama ya estuvo alguna vez en main -> es una copia vieja: gana main;
   - el contenido de main ya estuvo en la rama -> gana la rama;
   - ninguno de los dos -> **diverge de verdad**: va al paso 3;
   - el path no existe ni en main ni en la rama -> rename hecho en los dos lados: se borra.
   La prueba de "ya estuvo" es el blob en `git rev-list --objects <ref>`, no un diff.
   Hecho cuando: cada archivo en conflicto tiene una de las cuatro etiquetas.

3. **Resolver lo que diverge por intención.** Para cada archivo, `git log --oneline <base>..main -- <f>`
   y `git log --oneline <base>..<RAMA> -- <f>`, y leer los mensajes: por qué cambió cada lado. Preservar
   las dos intenciones; si son incompatibles, gana la que coincide con el objetivo del merge y el
   trade-off se escribe en el mensaje del commit. El merge no agrega comportamiento nuevo.

4. **Fuera de la carpeta del ticket, mirar quién cambió el archivo.** Un archivo de `scripts/`, `memory/`
   u otro `cambios/<otro>/` que la rama cambió de verdad desde el merge-base (estado A, M o R<100 en
   `git diff --name-status -M <base> <RAMA>`) se trata como divergencia del paso 3, aunque la carpeta
   diga que es de otro.

5. **Si la rama mejoró el loop y main no lo tiene, eso va a main primero**, una sola vez para todas las
   ramas; recién después se trae main a cada rama. Promoverlo por copia en cada rama, en vez de una
   vez a main, deja cuatro versiones del loop divergiendo solas.

6. **Controlar pérdidas después del merge.** Para cada archivo que la rama cambió de verdad, su versión
   (normalizando los renames de layout: `openspec/changes` -> `cambios`, `harness` -> `loop`) está en el
   resultado, o es igual a la de main. "Igual a main" en archivos de otros tickets NO prueba nada.
   Además: sin marcadores de conflicto, `node --test scripts/lib/*.test.js` verde, los tests del
   ticket que no necesiten base, y `rama-drift` sin choque de loop.

7. **Commit y push de la rama**, con el mensaje diciendo cómo se resolvió cada grupo de conflictos.

## Hecho cuando

El control del paso 6 da cero pérdidas, los tests están en verde y `git merge-tree --write-tree main <RAMA>`
entra limpio. Si el ticket se va a cerrar, recién ahí `task-cerrar`.

## Quién hace qué

Lo mecánico (pasos 1, 2 y 6) va por script: resuelve 60 conflictos en segundos. Un agente solo para
las divergencias reales del paso 3. Un merge resuelto archivo por archivo por un agente tardó ~20
minutos el 14/09.
