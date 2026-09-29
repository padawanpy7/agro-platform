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

Y al 29/09/2026 **no queda ninguna abierta**. Las dos ultimas se contestaron ese dia:

| | respuesta |
|---|---|
| **0. Quien es el cliente** (bloqueaba) | **el productor**. Queda firme la cuota por finca + hectarea y el piso de 3 clientes; los otros escenarios quedan despriorizados, no prohibidos |
| **1. En que VPS corre el producto** | **este, para el desarrollo local**; el despliegue a staging lo hace la sesion INFRA. El disparador para mudar sigue siendo **el primer cliente que paga** |

**Las otras tres ya estaban**: el banco de pruebas (27/09), `medicion` angosta (28/09) y el
hardware de la primera vuelta (con precios locales verificados).

## Pendientes del loop que NO son preguntas, son trabajo

- **`scripts/infra/ssh-ro.js`** sigue apuntado al server del repo de origen: pide credenciales
  LDAP/Oracle. Adaptarlo al VPS es trabajo, no decision.
- **El hook de `db-sql`** quedo muerto en `.claude/settings.json`. **Eso si lo decide el dueño.**
