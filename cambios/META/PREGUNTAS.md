# PREGUNTAS - el loop

Lo que no se decide solo **del loop mismo**. Una pregunta abierta que BLOQUEA no deja cerrar la vuelta.

> **Este archivo existia como hueco hasta el 29/09.** `arranque-frio --paquete` lo lee para armar el
> paquete que ve un agente sin contexto, y al no existir el paquete decia **"no se pudo leer
> PREGUNTAS.md"** -- o sea que alguien que llegaba en frio **no veia ninguna pregunta abierta, ni las
> del producto**. Lo encontro la simulacion de arranque, que es para lo que sirve.

**Bloquean**

_(ninguna)_

> **La unica que bloqueaba se contesto el 29/09**: *quien es el cliente* -> **el productor**. Quedo
> abierta cuatro dias y la contesto el dueño, que era la unica forma. El detalle y lo que queda
> firme por esa decision estan en la ficha.

## Abiertas -- del loop mismo

_(ninguna)_

## Donde estan las del PRODUCTO

**No viven aca**: viven en la ficha, que es donde se decidieron.

> **[cambios/riego-de-precision/PREGUNTAS.md](../riego-de-precision/PREGUNTAS.md)**

Al 29/09/2026 queda **una sola abierta, y no bloquea nada de lo que se esta construyendo**:

| | estado |
|---|---|
| **0. Quien es el cliente** (bloqueaba) | **CONTESTADA: el productor.** Queda firme la cuota por finca + hectarea y el piso de 3 clientes; los otros escenarios quedan despriorizados, no prohibidos |
| **1. En que VPS corre el producto** | **CONTESTADA: este, para el desarrollo local**; el despliegue a staging lo hace la sesion INFRA. El disparador para mudar sigue siendo **el primer cliente que paga** |
| **3. Cuanto hardware se compra** | **ABIERTA.** El analisis y los precios estan completos; **falta la decision, y es plata del dueño**. Bloquea la Fase 4 -el banco de pruebas- y ninguna anterior |

**Las otras dos**: el banco de pruebas (27/09) y `medicion` angosta (28/09).

> **La 3 figuraba como contestada y no lo estaba.** Se la habia dado por cerrada *"con precios
> locales verificados"* -- pero la pregunta no es que marca, es **cuantos se compran**, y eso lo
> decide quien paga. Lo encontro el gate de cierre del 29/09, que contaba dos abiertas mientras el
> texto afirmaba que no quedaba ninguna.

## Pendientes del loop que NO son preguntas, son trabajo

**Desde el 29/09 tienen ficha**, en `cambios/META/FEATURES.json`. Antes vivian solo como estas dos
lineas, asi que el cierre no podia cruzarlos contra nada y el paquete de arranque en frio listaba
el ledger del META como **NO EXISTE**.

- **`META-ssh-ro`** -- `scripts/infra/ssh-ro.js` sigue apuntado al server del repo de origen: pide
  credenciales LDAP/Oracle. Adaptarlo al VPS es trabajo, no decision.
- **`META-hook-db-sql`** -- el hook de `.claude/settings.json` autoriza `node agro.js db-sql`, una
  tool que **no existe en este repo**. **Eso si lo decide el dueño.**
- **`META-progreso-mensual`** -- `cambios/META/progreso/2026-09.md` todavia no hace falta
  (`PROGRESO.md` va en 33 de 150 lineas), pero el paquete de arranque lo pide por nombre.
