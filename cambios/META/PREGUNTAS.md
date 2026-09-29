# PREGUNTAS - el loop

Lo que no se decide solo **del loop mismo**. Una pregunta abierta que BLOQUEA no deja cerrar la vuelta.

> **Este archivo existia como hueco hasta el 29/09.** `arranque-frio --paquete` lo lee para armar el
> paquete que ve un agente sin contexto, y al no existir el paquete decia **"no se pudo leer
> PREGUNTAS.md"** -- o sea que alguien que llegaba en frio **no veia ninguna pregunta abierta, ni las
> del producto**. Lo encontro la simulacion de arranque, que es para lo que sirve.

**Bloquean**

- **Quien es el cliente, y quien pone el capital** (pregunta 0 de la ficha del producto). Productor,
  cooperativa, junta de agua, organismo, o el dueño mismo. Cambia el precio, el ciclo de venta y de
  donde sale el capital. **Se contesta en la primera reunion, no desde el escritorio.**

## Abiertas -- del loop mismo

_(ninguna)_

## Donde estan las del PRODUCTO

**No viven aca**: viven en la ficha, que es donde se decidieron.

> **[cambios/riego-de-precision/PREGUNTAS.md](../riego-de-precision/PREGUNTAS.md)**

Y al 29/09/2026 quedan **dos abiertas**, las dos del dueño y ninguna tecnica:

| | que decide |
|---|---|
| **0. Quien es el cliente, y quien pone el capital** -- **BLOQUEA** | productor, cooperativa, junta de agua, organismo, o el dueño mismo. Cambia el precio, el ciclo de venta y de quien sale el capital. **Se contesta en la primera reunion, no desde el escritorio** |
| **1. En que VPS corre el producto** | el de staging con un inquilino de terceros, o uno nuevo. Recomendacion escrita: **el mismo para construir, uno nuevo antes del primer cliente que paga** |

**Las otras tres se contestaron**: el banco de pruebas (27/09), `medicion` angosta (28/09) y el
hardware de la primera vuelta (con precios locales verificados).

## Pendientes del loop que NO son preguntas, son trabajo

- **`scripts/infra/ssh-ro.js`** sigue apuntado al server del repo de origen: pide credenciales
  LDAP/Oracle. Adaptarlo al VPS es trabajo, no decision.
- **El hook de `db-sql`** quedo muerto en `.claude/settings.json`. **Eso si lo decide el dueño.**
