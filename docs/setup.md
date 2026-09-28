# Setup

## Lo minimo para que el loop corra

```sh
npm ci                 # marked, ssh2, yaml (+ playwright en dev)
node agro.js doctor    # dice que falta
node agro.js check     # los gates del repo
```

`check` da verde con los gates del stack **salteados** mientras `project.yml` -> `commands` este
vacio. Eso es a proposito: un comando que no corre daria un rojo permanente y se aprende a
ignorarlo. Se llenan cuando haya codigo.

## Lo que hace falta segun que vayas a tocar

| para | necesitas |
|---|---|
| mirar el VPS (`ssh-ro`) | **no funciona todavia**: el script es el del repo de origen y pide `LDAP_USUARIO`/`ORA_DSN_*`. Las `VPS_*` del `.env.example` son para cuando se adapte |
| **el backend** | `python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"`. Las versiones exactas estan en `pyproject.toml`; el `.venv` no va a git |
| la base | Postgres + TimescaleDB + PostGIS: `docker compose -f desarrollo/postgres-dev.yml up -d`, y las `PG*` del `.env` |
| tests de pantalla, y **`md-a-pdf`** | `PLAYWRIGHT_BROWSERS_PATH=../tools/playwright-browsers npx playwright install chromium` |
| `gitleaks` (gate de secretos) | binario portable en `../tools/gitleaks-<version>/` |

### El detalle de Playwright que cuesta media hora si no esta escrito (28/09/2026)

`agro.js` fija `PLAYWRIGHT_BROWSERS_PATH` a **`../tools/playwright-browsers`** si nadie la seteo. Un
`npx playwright install chromium` pelado baja los navegadores a `~/.cache/ms-playwright`, **que no es
donde las tools los buscan**, y el error que sale es *"Looks like Playwright was just installed"* --
que manda a correr justo el comando que ya se corrio. **Hay que pasarle la variable**, como en la
tabla de arriba.

Y el daemon de navegador tenia un arranque **solo de Windows** (`spawn('cmd', ['/c','start',...])`),
que en Linux moria con `ENOENT` y dejaba `md-a-pdf` y toda tool con navegador rotas. Arreglado el
28/09 con dos caminos segun `process.platform`; el porque de cada uno esta comentado en
`scripts/lib/navegador.js`.

### La Postgres de desarrollo (29/09/2026)

**Corre en el VPS y NO expone nada**: el puerto va atado a `127.0.0.1`, por decision del dueño --
se desarrolla aca, sin nada abierto a internet, y se despliega despues con la infra.

```sh
docker compose -f desarrollo/postgres-dev.yml up -d     # levantar
docker compose -f desarrollo/postgres-dev.yml down       # parar, conservando los datos
docker compose -f desarrollo/postgres-dev.yml down -v    # parar y BORRAR los datos
```

La imagen es `timescaledb-ha`, que trae **TimescaleDB y PostGIS juntos**: el diseño necesita los dos
y separarlos es un problema ya resuelto rio arriba.

**Dos maquinas, y conviene no mezclarlas** (confirmado con la sesion de `infra-platform` el 29/09):

| | que es | que corre |
|---|---|---|
| **`vmi2900083`** | **aca**: nodo de **control**. 96G de disco, 11G de RAM | **SIRA** en docker. **NO corre k3s** |
| `srv1943767` | el **VPS de staging**. 387G, 32G de RAM | k3s, Argo CD y `primavera-nati`. **Ahi** paso el `fsync` de 3 s del 07/09 |

**El disco de esta maquina estaba al 84% el 29/09**, y **~50 de los 80 GB usados son basura de docker
recuperable**. **No se corre `docker system prune` desde una sesion**: hay 14 volumenes en uso y
varios son de SIRA. **Esa limpieza la decide y la hace el dueño.** Con los 17 GB libres alcanza para
la Fase 1; lo que no entra son meses de serie sintetica.

**Y no se toca SIRA** -- regla del dueño del 24/09: *"dejar solo que ande lo que es sira"*. Por eso
todo lo de agro lleva prefijo `agro-` y red propia.

**Para el DESPLIEGUE la admision exige `@sha256` y registry en allowlist**; eso lo arma
`infra-platform`, no este compose, que es solo de desarrollo.

## Donde esta la plataforma

Este repo **no despliega**. Lo que corre en el VPS -k3s, Argo CD, Traefik, las 6 reglas de
admision, la red default-deny- esta documentado en `desarrollo/`, copiado de `../infra-platform`.
Leelo antes de escribir un manifiesto: la admision rechaza `:latest`, exige digest `@sha256`,
registry en allowlist y `requests/limits`.
