# scripts/

Las herramientas del loop, agrupadas por para que sirven. Cada una responde a `--help`. Se
invocan por el dispatcher unico del repo: `node agro.js <tool> [argumentos]` (raiz `agro.js`).

| Carpeta | Que hay |
|---|---|
| `calidad/` | lo que se corre al terminar: `check` (el paraguas), `check-dep`, `ascii`, `doctor`, `hechos`, `presupuesto`, `test-js`. |
| `docs/` | conversion de material externo a markdown (`markitdown`) y de markdown a PDF (`md-a-pdf`). |
| `infra/` | `ssh-ro`, la unica forma de mirar el VPS de la plataforma, en solo lectura. |
| `loop/` | el loop de un cambio: arrancarlo (`cambio-nuevo`), cerrarlo (`cierre`), su ledger
  (`features`), y el loop mirandose a si mismo (`metricas`, `tool-usage`, `skill-sync`,
  `rama-drift`, `gaps`, `fallos`, `ablacion`, `control-negativo`, `traza`, `buscar`, `roles`,
  `carpetas`, `vuelta`, `arranque-frio`, `aceptacion`). |
| `lib/` | **librerias**: logica pura que se importa, sin `argv` ni prints. Se testea con
  `node --test` al lado (`*.test.js`). Nadie las ejecuta directo. |

Cada tool es un unico `.js` en `scripts/<area>/<tool>.js`: recibe `process.argv`, hace su trabajo
y sale con codigo de estado. `agro.js`, en la raiz, es el **unico punto de entrada**: ubica la
raiz del repo, carga `.env`, registra el uso en `metrics/` y despacha a la tool. No hay wrappers
de shell por tool.
