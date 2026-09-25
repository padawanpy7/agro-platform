# scripts/

Las herramientas del loop, agrupadas por para que sirven. Cada una responde a `--help`.

| Carpeta | Que hay |
|---|---|
| `apex/` | todo lo de las pantallas APEX: exportar, importar, el turno sobre una pagina (`apex-lock`), los tests de navegador (`apex-e2e`) y los chequeos del export. |
| `db/` | la base: correr SQL (`db-sql`), compilar y comparar objetos (`db-compilar`, `db-drift`, `db-fuente`) y los gates de PL/SQL (`plsql-compila`, `plsql-lint`, `plsql-test`). |
| `jira/` | el ticket: arrancar una tarea (`task-start`), traer el issue (`jira-issue`), el board (`jira-board`), estimar (`estimacion`) y el material de pase (`pase-prod`). |
| `calidad/` | lo que se corre al terminar: `check` (el paraguas), `lint`, `ascii`, `doctor`. |
| `loop/` | el loop mirandose a si mismo: `features` (el ledger), `metricas` (tiempo y tokens por ticket), `tool-usage`, `skill-sync`. |
| `lib/` | **librerias**: logica pura que se importa, sin `argv` ni prints. Se testea con `node --test` al lado (`*.test.js`). Nadie las ejecuta. |
| `_*.sh` / `_*.py` | internos: resuelven node, python, sqlcl y el contador de uso. No se llaman a mano. |

Las tres piezas de una tool: el **`.sh`** es la entrada (resuelve el toolchain y delega), el **`.js`**
es el comando (argumentos, BD/red/navegador, exit code) y **`lib/`** es la logica pura y testeable.
