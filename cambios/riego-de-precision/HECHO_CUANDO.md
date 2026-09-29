# HECHO_CUANDO - riego-de-precision

**Cuándo está terminado este cambio.** Un `##` es un criterio; adentro va el COMANDO que lo
verifica -devuelve 0 si se cumple- o una línea `> manual: ...` si ninguna tool lo ve.

Lo escribe **quien pide**, y **antes** de construir: un criterio escrito después, mirando el
trabajo hecho, se acomoda al trabajo hecho. Sale del objetivo del `proposal.md`.

Lo corre `node agro.js aceptacion` y el cierre no deja cerrar con uno en rojo. En los comandos,
`$TICKET` y `$TICKET_DIR` valen `riego-de-precision` y `cambios/riego-de-precision`.

> **Escrito el 27/09/2026, fuera de orden y sin nada construido todavía.** El orden que pide
> `cambio-nuevo` es proposal -> HECHO_CUANDO -> design/tasks, y acá el `design.md` se escribió
> primero (248 líneas). Se registra así porque es lo que pasó. Lo que **sí** se cumple es la parte
> que importa del ordenamiento: **no hay una sola línea de código todavía**, así que ningún criterio
> de acá pudo acomodarse al trabajo hecho. Los ocho salen de los cuatro objetivos del `proposal.md`
> y de la tabla de "orden de construcción" del `design.md`, no de mirar una implementación.
>
> **Va a estar en rojo durante todo el desarrollo, y está bien**: es la regla de parada del ticket
> entero, no un gate de cada commit. `check` no lo corre; lo corre `aceptacion` y lo exige `cierre`.
>
> Los scripts que nombran los criterios **no existen todavía**: cada uno es un entregable declarado
> en `tasks.md` y una ficha del `FEATURES.json`. Un criterio que nombra un script inexistente sale
> en rojo, que es la verdad, y no un falso verde.

## Los gates del repo pasan

```sh
node agro.js check
```

## El ledger del cambio no tiene fichas pendientes

```sh
node agro.js features --gate riego-de-precision
```

## Un cliente no ve la parcela de otro, y lo hace cumplir la base

Dos tenants cargados; una query sin `tenant_id` no devuelve filas y A no ve nada de B. El script
lo prueba **contra una Postgres real** y comparando el catálogo, no el archivo de migración: que
una migración figure aplicada no prueba que la policy de RLS bloquee.

```sh
bash cambios/riego-de-precision/scripts/verify-schema.sh
```

## El dato se guarda sin perder precisión

Por cada medición insertada: la hora de **medición** y la de **llegada** están en columnas
separadas y son distintas cuando el gateway encoló, el valor **crudo** sigue ahí junto al
calibrado, el punto geográfico no es nulo, y **ninguna fila de la ingesta es un promedio**.

```sh
bash cambios/riego-de-precision/scripts/verify-schema.sh
```

## Reenviar el mismo payload no duplica filas

El gateway hace store-and-forward y reenvía lo que ya mandó. El backend deduplica por
(dispositivo, hora de medición): el script manda el mismo payload tres veces y cuenta una fila.

```sh
bash cambios/riego-de-precision/scripts/verificar-dedup.sh
```

## Sin enlace, el riego sigue y cae al programa conservador

Se corta el enlace del controlador y **sigue decidiendo con lo que mide**. Pasados N días sin
política nueva, cae al programa conservador; no se queda esperando. Y la nube nunca manda el abrir
y cerrar de una válvula: manda umbrales y ventanas.

```sh
bash cambios/riego-de-precision/scripts/verificar-autonomia.sh
```

## Un polígono nuevo trae su serie de NDVI

Se da de alta una parcela con su geometría y su serie de NDVI de Sentinel-2 aparece atada a ella,
sin tocar nada a mano.

```sh
bash cambios/riego-de-precision/scripts/verificar-ndvi.sh
```

## La válvula abre por humedad medida, no por reloj

> manual: en el banco de pruebas de Misiones, con el ESP32 y la válvula de 12V armados: se seca el
> sustrato hasta cruzar el umbral y la válvula abre sin que haya llegado ninguna hora programada;
> se moja por encima del umbral en plena ventana de riego y NO abre. Ninguna tool nuestra ve una
> válvula física. El banco es el paso 4 del orden de construcción y es el primero que necesita
> comprar hardware (~72 USD, ver PREGUNTAS.md).

## La parcela se ve en el mapa y sus dispositivos caen adentro solos

> manual: se abre el front, se dibuja o se importa el polígono de una parcela, y los dispositivos
> cuyo punto cae dentro del polígono quedan asociados a ella sin asignarlos a mano. Queda manual
> hasta que exista el helper e2e del front (ver desarrollo/revision-bf-db-workspace.md); cuando
> exista, este criterio pasa a ser un comando.
