# Revision de bf-db-workspace, herramienta por herramienta

Clonado de `padawanpy7/bf-db-workspace` el 25/09/2026 en `/home/devops/bf-db-workspace`.
**178 scripts, 84 archivos de test, 40.431 lineas** -contra 61 / 33 / 12.527 de infra-platform-.
Es efectivamente el loop mas avanzado para desarrollo, y trae los roles que aca no existen.

Tres veredictos: **LLEVA** (sirve tal cual o con cambio menor), **ADAPTA** (el patron vale, el
codigo es de Oracle/APEX/Jira y hay que reescribirlo contra el stack del agro), **SACA**.

## Resumen

| grupo | tools | LLEVA | ADAPTA | SACA |
|---|---|---|---|---|
| loop | 19 | 18 | 1 | 0 |
| calidad | 7 | 6 | 1 | 0 |
| docs | 3 | 2 | 1 | 0 |
| infra | 1 | 0 | 1 | 0 |
| db | 10 | 0 | 1 | 9 |
| apex | 19 | 0 | 1 | 18 |
| jira | 9 | 0 | 0 | 9 |
| kove | 5 | 0 | 0 | 5 |
| envx | 3 | 0 | 0 | 3 |
| prestamo | 3 | 0 | 0 | 3 |
| **total** | **79** | **26** | **7** | **46** |

## Lo que mas me interesa (las 7 que se adaptan)

### `ssh-ro` -- la pieza que mas falta hacia
Runner SSH de **solo lectura** contra un servidor, con **lista blanca real**: rechaza
redirecciones, encadenamientos, sustitucion de comandos, interpretes y todo binario que pueda
escribir. Validado en `scripts/lib/ssh-ro-core.js`, con tests.

Es exactamente lo que el workspace del agro necesita para **mirar el VPS staging sin poder tocarlo**:
el otro Claude diagnostica y arma el despliegue, pero la escritura sigue siendo de este lado. Hay que
cambiarle las credenciales (hoy toma `LDAP_USUARIO`/`LDAP_CONTRASENA`) y revisar la allowlist contra
`kubectl`/`crictl`.

### `db-drift` -- el mejor gate del repo
Contesta **"lo que dice el archivo, es lo que hay en la base?"**, y la cabecera explica por que:
tres veces en dos dias se dio por cierto un constraint que estaba en el DDL del repo y **nunca se
aplico**. La trampa documentada es general, no de Oracle: **la metadata dice CUANDO se toco el
objeto, nunca QUE tiene adentro**. Un objeto VALID con DDL de ayer puede tener otro cuerpo.

En Postgres pasa igual con las migraciones: que una migracion figure aplicada **no prueba** que el
esquema sea el declarado. Reescribir contra `information_schema` y comparar texto.

### `apex-e2e` -- Playwright contra la app viva
Abre la pagina de verdad y la opera. Para el front Next es directamente lo que hace falta; se tira
todo lo de APEX y queda el armazon de correr specs contra la app corriendo.

### `evidencia-e2e` -- capturas que no se desincronizan
Arma el documento de evidencia con el titulo sacado del spec y la imagen de la corrida REAL. Si un
caso no tiene captura **lo dice**, en vez de omitirlo en silencio. Para mostrarle al cliente del
piloto que se probo, sirve tal cual.

### `check` (calidad) -- se conserva el armazon, cambia la lista
Igual que en infra-platform: corre en paralelo y reporta OK/salteado/rojo. Los gates pasan a ser
ruff, mypy, pytest, eslint, `next build`.

### `tickets` (loop) -- el registro, sin las fuentes del empleador
Agrupa los tickets por iniciativa y **no inventa: si un dato no esta muestra `?` y dice por que**.
El armazon sirve; hoy lee Jira y Kove, y eso se saca.

### `md-a-pdf` (docs)
Sirve tal cual, solo le falta `marked` instalado. En el agro vale mas que aca: **los reportes al
cliente salen en PDF**.

## Lo que se saca (46), y por que

- **apex (18)**: `apex-bind-live`, `apex-bootstrap`, `apex-componente`, `apex-drift`, `apex-estandar`,
  `apex-export`, `apex-import`, `apex-item`, `apex-js-check`, `apex-lock`, `apex-mapa`,
  `apex-obj-refs`, `apex-preflight`, `apex-shared`, `apex-shared-export`, `apex-static-build`,
  `apex-static-check`. Oracle Application Express no existe en este stack. `apex-js-check` lo cubre
  eslint + tsc; `apex-static-check` y `apex-drift` los cubre Argo, que **reconcilia** en vez de
  avisar que hay drift.
- **db (9)**: `db-check`, `db-compilar`, `db-sql`, `db-fuente`, `sqlcl`, `plsql-compila`,
  `plsql-lint`, `plsql-test`, `sync-db-source`. Son PL/SQL y SQLcl. `plsql-test` lo reemplaza pytest.
- **jira (9)** y **kove (5)**: integraciones con el Jira y el registro de horas del trabajo. No
  aplican salvo que el agro use Jira, que hoy no es el caso -el ledger es `cambios/`-.
- **envx (3)**: portal de solicitudes de ambiente del empleador.
- **prestamo (3)**: `cuadre-iva`, `foto-operacion`, `iva-parcial`. Dominio de prestamos.
  **Una nota que sobrevive al borrado**: cuando el SaaS facture suscripciones con IVA, el metodo de
  `cuadre-iva` vale -leer la tasa del parametro y **nunca deducirla del dato que se esta auditando,
  porque es circular**-. Es una nota para el playbook, no codigo para copiar.

## Lo que NO es script y tambien importa

| pieza | veredicto |
|---|---|
| `.claude/agents/`: `backend`, `database`, `ui-designer`, `project-manager` | **LLEVA** -- son los roles que infra-platform no tiene y el agro necesita. `database` hay que reescribirlo: era Oracle, pasa a Postgres + TimescaleDB + PostGIS |
| `.claude/agents/`: `lead`, `implementer`, `verifier` | LLEVA tal cual |
| `skills/`: `sdd`, `tdd`, `merge-de-rama`, `diagnosticar` | LLEVA |
| `skills/`: `jira-comentarios`, `manual-entrega` | SACA |
| `.gitleaks.toml`, el patron de `entornos.yml` y `.env.example` | LLEVA |
| `memory/hechos/` (cientos de archivos) | **SACA.** Son hechos medidos sobre Oracle y APEX. Ver la regla en [loop-al-workspace-de-agro.md](loop-al-workspace-de-agro.md): se copian las tools, no se copia la memoria |
| `memory/playbooks/` | SACA el contenido, LLEVA el armazon vacio |
| `jira/` (39 carpetas de tickets), `apex/`, `db/`, `bootstrap_out/` | SACA |

## Que le falta a bf-db-workspace que este repo si tiene

Solo una cosa relevante: **`cambio-nuevo`**, que crea la ficha SDD completa
(proposal + design + tasks + HECHO_CUANDO + FEATURES.json) de una. En bf el equivalente vive atado
a Jira (`task-start`). Se porta desde aca.

Tambien conviene portar lo que se arreglo en `arranque-frio` / `arranque-core` este mes -el paquete
que mandaba al ticket cerrado, cuatro vueltas hasta cerrarlo-.

## Addendum (25/09/2026): lo que cambio al armar el workspace de verdad

`agro-platform` quedo armado. Dos correcciones a la revision de arriba, medidas al construirlo:

1. **`evidencia-e2e` NO viajo.** Parsea una convencion (`apex.casoConFoto`) del helper e2e de APEX,
   que se borro con ese grupo. Sin front todavia no hay con que reescribirla **ni con que
   probarla**, y una tool en el dispatcher que no puede correr es peor que no tenerla. Vuelve
   cuando exista el helper e2e del front; el original sigue en `padawanpy7/bf-db-workspace`.
2. **`apex-e2e` tampoco**, por lo mismo: lo que se lleva es Playwright, que ya esta en
   `devDependencies`, no el wrapper de APEX.

Quedaron **29 tools** andando y `check` en verde. Lo que el loop encontro solo al portarlo:
- Renombrar `bf.js` -> `agro.js` rompio `familiaDeComando` en silencio: el regex `/bf\.js$/` dejo
  de matchear y TODA invocacion caia en la familia generica. **Lo cazo un test**, no una lectura.
  Es exactamente la leccion que ya estaba escrita en `cierre-core.js` -no clavar el nombre del
  dispatcher- en un archivo que no la habia aplicado.
- Tres tests fallaban **tambien en el clon original** por `node_modules` sin instalar y por un
  caso de Windows. Correr el control contra el original antes de tocar nada separo "lo rompi yo"
  de "ya venia asi".
