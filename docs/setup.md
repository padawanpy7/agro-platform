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
| la base | Postgres + TimescaleDB + PostGIS (en local, docker) y las `PG*` del `.env` |
| tests de pantalla | `npx playwright install chromium` |
| `gitleaks` (gate de secretos) | binario portable en `../tools/gitleaks-<version>/` |

## Donde esta la plataforma

Este repo **no despliega**. Lo que corre en el VPS -k3s, Argo CD, Traefik, las 6 reglas de
admision, la red default-deny- esta documentado en `desarrollo/`, copiado de `../infra-platform`.
Leelo antes de escribir un manifiesto: la admision rechaza `:latest`, exige digest `@sha256`,
registry en allowlist y `requests/limits`.
