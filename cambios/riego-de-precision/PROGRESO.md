# PROGRESO - riego-de-precision

**La bitacora de ESTE ticket.** `AGENTS.md` pide una por cambio; el puente del producto estaba
metido en `cambios/META/PROGRESO.md`, que es para lo que se hace en `main` y tiene un techo de
**+8 lineas por sesion** -pensado para la bitacora del loop, no para un producto de quince
documentos-. Aca hay lugar. La mas nueva ARRIBA.

## 2026-09-27 -- el SDD completo: regla de parada y plan por fases

Los dos archivos que faltaban desde el 25/09 dejaron de ser el placeholder de `cambio-nuevo`.

- **`HECHO_CUANDO.md`: nueve criterios**, siete con comando y dos a mano. Salen de los cuatro
  objetivos del `proposal.md`, no de mirar una implementacion: **no hay una sola linea de codigo
  todavia**, asi que ningun criterio pudo acomodarse al trabajo hecho -que es justo lo que el
  archivo existe para evitar-. Se escribio **fuera de orden** (el `design.md` ya estaba) y queda
  registrado asi en el propio archivo.
- **Los dos criterios a mano son a mano por una razon, no por comodidad**: ninguna tool nuestra ve
  una valvula fisica, y el mapa no se puede verificar hasta que exista el helper e2e del front.
- **`tasks.md`: las siete fases** del `design.md` §6 mas una Fase 0. La 0 existe porque
  `project.yml` tiene `lint`, `test` y `build` vacios: mientras lo esten, `check` saltea esos gates
  y no mide nada. Y porque `memory/playbooks/database.md` esta vacio y el contrato pide leerlo
  **antes** de tocar un objeto.
- **`FEATURES.json`: 16 fichas**, 0 en verde. Antes tenia `features: []`, que hacia que
  `features --gate` saliera **2 -"no hay ledger que medir"-, que no es lo mismo que estar al dia**.
- **Cada fase entrega su script de verificacion versionado** en `scripts/`, no una corrida en la
  terminal: el scratchpad de la sesion se pierde y el criterio lo nombra por nombre de archivo.
- **Modo del cambio: `critical`.** Hay plata, hay datos irreversibles y hay aislamiento entre
  clientes. Pide evidencia contra la base real y revision humana firme.

`aceptacion` da **rojo, y es lo correcto**: los cinco scripts que nombran los criterios no existen.
`check` no corre `aceptacion`, asi que el rojo no bloquea los commits; lo exige `cierre`.

**La pregunta 0 sigue abierta y NO bloquea ninguna fase**: los cuatro escenarios construyen el
mismo producto. Lo que bloquea es la compra de la Fase 4, que es plata del dueño.

**Los 8 commits que estaban sin subir se pushearon** (`53e04b0..c0df0fd`). Sin resolver, y es del
dueño: el hook de `db-sql` muerto en `.claude/settings.json`.

## 2026-09-27 -- correcciones del arranque en frio

Un agente sin contexto leyo el repo entero y reconstruyo **8 de 9** preguntas con archivo y linea.
Lo que encontro y se arreglo:

- **El `26x` de soja seguia en `proposal.md`** aunque `MERCADO.md` ya lo habia corregido a `23x` y
  documentaba que 26 era el viejo. El proposal es el que se lee primero.
- **La compuerta**: el proposal decia que `design.md` se escribe despues de aprobar, con 248 lineas
  de design ya escritas. Se registro lo que paso de verdad -el dueño dirigio el trabajo, nunca dijo
  "aprobado"- porque **inventar una aprobacion es peor que no tenerla**.
- **`ssh-ro` roto y tres documentos diciendo que anda** (`AGENTS.md`, `project.yml`, `docs/setup.md`,
  mas `.env.example`). Los cuatro lo marcan como pendiente ahora.
- **La pregunta 2 de `PREGUNTAS.md`** seguia abierta y ya se habia decidido el 27/09.
- **La bitacora de META estaba al reves** de lo que ella misma declara.
- Numeros que no cerraban: `~145` que eran 142, `19%/2,1%` contra `20%/2,2%`, y `63 USD` que al
  dolar declarado son 60. Y la tabla local tenia **dos items de Gs 140.000** sin decir cual suma.
- **`crudo/` estaba citada como si tuviera contenido** y esta vacia: nunca se corrio `capturar.py`.
- **`LIMPIEZA.md` se leia como pendiente** y estaba hecha.

Y un arreglo de gate: **`arranque-frio` afirmaba algo falso.** Decia *"dice que falta ssh-ro.js,
pero existe"* sobre un texto que decia *"sigue pensado para el server del origen"* -que no es lo
mismo-. El primer intento fue una lista negra de verbos de modificacion y **quedo corta a la
primera**: "sin adaptar" y "sigue pensado para" se escriben de diez formas. Se paso a **lista
blanca de verbos de AUSENCIA**: solo se contradice lo que afirma que algo no existe. Con test del
caso nuevo y control negativo del que tiene que seguir dando rojo.

**Sin resolver, y es del dueño**: los commits sin subir, y el hook de `db-sql` muerto en
`.claude/settings.json` -al que el commit `2fc5743` le sumo permisos de git por arrastre de un
`git add -A`-.

## 2026-09-25 al 27 -- la ficha del producto

Escrita desde `infra-platform` y mudada aca. El detalle vive en los archivos, no en esta bitacora:
`proposal.md` (objetivo, cultivos, hoja de ruta, drones), `design.md` (doce tablas, las cinco
reglas de precision, el lazo de control), `ECONOMIA.md`, `MERCADO.md`, `PREGUNTAS.md`, `economia/`
(un archivo por cultivo), `colmena/` (relevamiento) y `banco-de-pruebas.md` (Misiones).

Presentacion de viabilidad, 17 laminas: https://claude.ai/artifact/Q9WktgJCQFoDwiEh3f5TpT

**Lo que falta**: `HECHO_CUANDO.md` y `tasks.md`, que siguen siendo el placeholder de
`cambio-nuevo`, y contestar la pregunta 0 -quien es el cliente-.
