# PROGRESO - bitacora del loop

El puente entre sesiones. Una entrada por sesion, la mas nueva ARRIBA.

## 2026-09-29 -- la base del producto, y dos gates que no median nada
**La bitacora del trabajo es la DEL TICKET**: `cambios/riego-de-precision/PROGRESO.md`. Aca el puente:
existe la primera Postgres (17.11 + Timescale + PostGIS, local, sin exponer), 51 tablas en ingles con
historia en cada tabla mutable, y `verify-schema.sh` en 21/21. `check` paso de 6 a 9 gates reales.
- **Del loop**: `ascii` existia y NO estaba enchufada a `check`; y `cierre` llamaba a
  `buscarComandosObsoletos` sin la prueba de existencia, asi que la excepcion del 01/09 era codigo
  muerto cuatro semanas. Arreglados, 495 tests. Pendiente: `ssh-ro.js` y el hook de `db-sql`.

## 2026-09-27 -- ficha del producto del agro
**La bitacora de ese trabajo es la DEL TICKET**: `cambios/riego-de-precision/PROGRESO.md`, que tiene
lugar. Aca solo el puente: la ficha esta completa salvo `HECHO_CUANDO.md` y `tasks.md`, la pregunta
0 -quien es el cliente- bloquea, y `scripts/infra/ssh-ro.js` sigue sin adaptar al VPS.

## 2026-09-25 - limpieza del workspace (LIMPIEZA.md)
- Hecho: roles/AGENTS.md/skills sin Oracle; `hechos` bloquea wikilinks colgados en docs de contrato;
  `doctor` lee `cambios/`; `.mcp.json` fuera; `buscar` resuelve worktrees; `memory/hechos/.gitkeep`
  (sin la carpeta, un clon fresco daba `check` rojo).
- Pendiente: `scripts/infra/ssh-ro.js` sigue pensado para el server de base del origen; hook de
  `db-sql` muerto en `.claude/settings.json` (decide el dueño).
