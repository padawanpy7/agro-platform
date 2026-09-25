# HECHO_CUANDO - riego-de-precision

**Cuándo está terminado este cambio.** Un `##` es un criterio; adentro va el COMANDO que lo
verifica -devuelve 0 si se cumple- o una línea `> manual: ...` si ninguna tool lo ve.

Lo escribe **quien pide**, y **antes** de construir: un criterio escrito después, mirando el
trabajo hecho, se acomoda al trabajo hecho. Sale del objetivo del `proposal.md`.

Lo corre `node infra.js aceptacion` y el cierre no deja cerrar con uno en rojo. En los comandos,
`$TICKET` y `$TICKET_DIR` valen `riego-de-precision` y `cambios/riego-de-precision`.

## Los gates del repo pasan

```sh
node infra.js check
```

## (borrar esto y escribir el primer criterio propio del cambio)

> manual: 
