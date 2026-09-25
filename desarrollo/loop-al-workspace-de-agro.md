# Que del loop de infra-platform se lleva al workspace del agro

Medido el 25/09/2026 con `grep` sobre los 59 scripts no-test de `scripts/`. El criterio es
mecanico: un script "toca infra" si menciona `kubectl`, `ansible`, `argocd`, `cilium`, `kyverno`,
`helm`, `k3s`, `sops`, `CCNP`, `kube-bench` o `gitops`.

**52 de 59 se llevan tal cual.** El loop es casi todo generico; lo especifico de infraestructura
esta concentrado en 7 archivos.

## Se llevan sin tocar (52)

Todo `scripts/lib/` menos dos, todo `scripts/loop/` menos dos, y todo `scripts/calidad/` menos uno.
Lo que mas importa, porque es el loop en si:

| tool | que hace | sirve en el agro |
|---|---|---|
| `cambio-nuevo` | crea la ficha SDD (proposal/design/tasks/HECHO_CUANDO) | si, es el flujo entero |
| `aceptacion` | corre los criterios de HECHO_CUANDO de un ticket | si |
| `cierre` | la compuerta de cierre de una vuelta | si |
| `presupuesto` | presupuesto de lineas de los docs de arranque | si, y hace falta mas en una app |
| `hechos` | que la memoria no cite rutas muertas | si |
| `ascii` | normaliza el texto de los docs | si |
| `test-js` / `check-dep` / `doctor` | tests, dependencias fijas, salud del repo | si |
| `traza` / `gaps` / `fallos` / `vuelta` / `metricas` / `ablacion` | la instrumentacion del loop | si |
| `control-negativo` | probar que un gate da ROJO cuando debe | si, y es de lo mejor que hay aca |

## Hay que editar (2)

| archivo | por que | que hacer |
|---|---|---|
| `scripts/calidad/check.js` | son 13 gates y varios son de infra (yamllint/ansible-lint, SOPS por path, cuotas generadas, grupo D de gitops) | conservar el armazon -corre en paralelo, reporta OK/salteado/rojo- y cambiar la lista de gates por los del stack: ruff, mypy, pytest, eslint, `next build` |
| `scripts/loop/arranque-frio.js` | arma el paquete de arranque en frio leyendo la bitacora | conservar entero; solo cambian las rutas que empaqueta |

## Se dejan (5)

`scripts/lib/gitops-repo.js`, `scripts/lib/cuotas-generadas.js`, `scripts/seguridad/cuotas-generadas.js`,
`scripts/seguridad/kube-bench-score.js`, `scripts/loop/diagrama.js` (valida el diagrama de GitOps
contra `infra/site.yml`; el agro va a querer su propio diagrama, pero es otro).

## Lo que NO es script y tambien se lleva

- `AGENTS.md` -el contrato de trabajo-, adaptado al stack del agro.
- `.claude/agents/`: **`lead`, `implementer` y `verifier` se llevan tal cual**. `platform`,
  `security`, `gitops` y `observability` son de esta casa. Faltaria inventar los del producto
  -backend, frontend, datos/ML, firmware del campo-.
- `skills/`: `sdd.md` y `tdd.md` se llevan; `adopt.md`, `migrate.md`, `judgment-day.md` a revisar.
- `memory/playbooks/`: los playbooks de esta casa NO se llevan -son hechos medidos sobre ESTE
  sistema-. El workspace del agro arranca con playbooks vacios y los llena con los suyos.
- **`desarrollo/`**: esta carpeta entera, que es el contrato de la plataforma. Es la referencia que
  el workspace del agro lee para saber que hay y como desplegar.

## La regla que no se puede romper al copiar

Un playbook de memoria vale porque cada linea salio de algo que se rompio **en este sistema**.
Copiarlo al workspace del agro convierte hechos medidos en folklore. **Se copian las tools; no se
copia la memoria.**
