# Limpieza pendiente del workspace (cambios/META/LIMPIEZA.md)

Este repo es una copia de `bf-db-workspace` (Oracle / APEX / Jira / Kove) con ese dominio borrado
el 25/09/2026. Un verificador adversarial reviso el resultado y encontro **restos del repo de
origen**. La ficha del producto -`cambios/riego-de-precision/`- ya se corrigio; **lo que queda es
higiene del workspace** y es lo que hay que hacer antes de escribir codigo.

**Nada de esto toca numeros del negocio.** Si al arreglar algo aparece una decision de producto,
va a `cambios/riego-de-precision/PREGUNTAS.md`, no se decide sola.

## 1. Los roles todavia tienen Oracle adentro

`.claude/agents/` son los roles que va a cargar cada tarea. Hoy dicen cosas falsas:

| archivo | que hay |
|---|---|
| `verifier.md` | "Es un motor de un banco"; manda `CREATE OR REPLACE`, leer `ALL_ERRORS` y `all_objects` INVALID, habla de `PLS-00`, `ln_oferta_log`, `WHEN OTHERS`, PMD. Nada de eso existe en Python/FastAPI/Postgres |
| `verifier.md:20` | manda correr `node agro.js lint`, **que no existe** |
| `lead.md:14`, `implementer.md:11` | mandan usar `db-deps`, **que no existe** |
| `backend.md:13`, `ui-designer.md:12` | "este workspace es PL/SQL puro" |

El equivalente correcto por stack: `ruff` / `mypy` / `pytest` para Python, `tsc` / `eslint` /
`next build` para el front, y para el esquema **aplicar la migracion contra una Postgres real y
comparar contra `information_schema`** -que es el reemplazo de "compilar y leer ALL_ERRORS"-.

Los gates del repo salen de `project.yml` -> `commands`, que hoy estan **vacios a proposito**: se
llenan cuando exista codigo. Los roles tienen que apuntar ahi, no clavar comandos.

## 2. `doctor` mide la carpeta equivocada

```
$ node agro.js doctor
  ! falta scripts/db/plsql-compila.js (gate de sintaxis)
  ! falta scripts/db/plsql-lint.js (gate de convenciones)
  i sin jira/META/PROGRESO.md
  i sin ledgers por-ticket (los builds grandes crean jira/<id>/FEATURES.json)
```

Cuatro lineas de ocho son falsas. `scripts/calidad/doctor.js:62-63` exige dos scripts de PL/SQL
que este stack no puede tener, y `:70,74-78` **hardcodea `jira/`** en vez de leer
`carpeta_cambios: cambios` de `project.yml`. **Ya existe `scripts/lib/carpeta-cambios.js`
justamente para eso.** `cambios/META/PROGRESO.md` y `cambios/riego-de-precision/FEATURES.json`
existen y el doctor dice que no.

Un diagnostico que miente es peor que no tenerlo: se aprende a ignorarlo.

## 3. `.mcp.json` apunta a una ruta de Windows del banco

`.mcp.json:4` -> `"command": "C:\\bffamiliar\\tools\\python-3.13.14-embed-amd64\\python.exe"`.
Inservible en este Linux. O se arregla o se saca, pero no puede quedar roto en silencio.

Ojo: `AGENTS.md:59` afirma "no hay MCP de codigo instalado" **sin mencionar que hay un `.mcp.json`**.
Las dos cosas tienen que decir lo mismo.

## 4. `AGENTS.md` cita cosas que no existen

Verificado con `test -e` y contra el dispatcher (`node agro.js` lista las tools reales):

| citado | estado |
|---|---|
| `docs/herramientas.md` (AGENTS.md:59, :222, :246) | **no existe**, y es "donde vive el detalle de cada tool" |
| `docs/work-no-se-versiona.md` (:182) | no existe |
| `memory/hechos/donde-vive-la-memoria.md` (:189) | no existe (`memory/hechos/` esta vacio) |
| `node agro.js task-start` (:170) | no existe -- es `cambio-nuevo` |
| `node agro.js lint` (:253), `db-compilar` (:177) | no existen |
| `cambios/META/FEATURES.json` y `PREGUNTAS.md` (:159) | no existen |
| `README.md` / `hallazgos.md` del change (:175) | no existen |
| `node agro.js db-sql` (skills/diagnosticar.md:27) | no existe |
| 7 wikilinks `[[...]]` (AGENTS.md:120, :205 y otros) | **ninguno existe**: `node agro.js hechos` -> "0 en disco" |

**Y hay un hueco de gate atras de esto**: `hechos` da OK sobre un universo vacio (0 en disco, 0
enlazados) mientras 7 wikilinks apuntan a hechos inexistentes. El gate no mira los wikilinks de
`AGENTS.md` ni de `skills/`, asi que el rojo nunca aparece. **Vale mas arreglar el gate que los
enlaces**: si solo se borran los enlaces, el agujero sigue.

## 5. `AGENTS.md` delega contenido obligatorio a playbooks vacios

- `:124-127`: "el formato de cierre de cada tanda vive en `memory/playbooks/lead.md`. Es lectura
  del lead: **siempre**". `lead.md` tiene **5 lineas** y no tiene ese formato.
- `:141-144`: el protocolo de sesion y el ledger `FEATURES.json` "estan en lead.md" -> tampoco.
- `:251-253`: "las convenciones del esquema viven en `database.md` y las hace cumplir
  `node agro.js lint`" -> `database.md` tiene 5 lineas y `lint` no existe.
- `:257-259`: habla de `db-consultas.md`, `db-hechos.md` y de que "db.md llego a 1381 lineas".
  Es historia del repo de origen; nada de eso existe aca.

**Que los playbooks arranquen vacios es decision declarada y correcta** (`project.yml:46-47`): los
hechos del repo de origen eran de Oracle y copiarlos los convertiria en folklore. El problema es
que `AGENTS.md` los cita como si tuvieran contenido. **Se arregla el texto de AGENTS.md, no se
rellenan los playbooks con material inventado.**

## Como se da por hecho

```sh
node agro.js check          # verde
node agro.js doctor         # sin advertencias falsas
node agro.js hechos         # y que mire los wikilinks de AGENTS.md y skills/
node agro.js test-js        # verde
grep -rin "oracle\|apex\|plsql\|pl/sql\|jira\|kove\|sqlcl\|bffamiliar" \
  AGENTS.md .claude/ skills/ scripts/ .mcp.json | grep -v node_modules
```

Ese ultimo `grep` tiene que volver vacio, salvo comentarios historicos que digan explicitamente que
son del repo de origen.

**Y despues**: hay **3 commits sin subir** en este repo. `git push` -desde esta sesion funciona,
porque este es su directorio de trabajo-.
