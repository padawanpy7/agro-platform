# La Colmena -- relevamiento

Investigacion sobre **La Colmena (Paraguari)** como zona piloto. Hecha el **25/09/2026** con
fuentes publicas.

**Para leer antes de una reunion, en este orden:**

| archivo | que tiene |
|---|---|
| [00-resumen.md](00-resumen.md) | la sintesis y por que esta zona |
| [07-vacios.md](07-vacios.md) | **el guion del relevamiento**: lo que se busco y NO aparecio |
| **[guia-relevamiento.pdf](guia-relevamiento.pdf)** | **las preguntas para imprimir y llevar**, con casillas y espacio para notas (3 paginas) |
| [08-tu-tabla-revisada.md](08-tu-tabla-revisada.md) | la tabla de 16 filas contrastada contra lo investigado |
| [04-riego-agua.md](04-riego-agua.md) | el tema central, y donde menos fuente publica hay |
| [05-clima-riesgos.md](05-clima-riesgos.md) | las perdidas documentadas, con fecha |
| [02-caica.md](02-caica.md) | con quien se habla |
| [09-oferta-tierra-maquinaria.md](09-oferta-tierra-maquinaria.md) | **ofrecio su maquinaria y 1 ha**: que se puede plantar ya, y el suelo que no drena |
| [10-plan-con-12-millones.md](10-plan-con-12-millones.md) | **el plan con el capital real**: Gs 12 M no compran 1 ha, y donde NO poner la plata |
| [11-plan-por-fines-de-semana.md](11-plan-por-fines-de-semana.md) | **el calendario real**: 8 fines de semana hasta diciembre, y por que se elige La Colmena |
| [01-produccion.md](01-produccion.md) | cultivos, hectareas, rindes, calendario |
| [03-comercializacion.md](03-comercializacion.md) | el canal, Expo Frutas, precios |
| [06-fuentes.md](06-fuentes.md) | todo lo consultado, **incluido lo que fallo y por que** |
| `crudo/` | **vacia todavia**: el relevamiento se hizo leyendo a mano. La llena `capturar.py` cuando haga falta re-verificar |

**Reejecutable**: `python3 capturar.py` lee `fuentes.yml` -las fuentes viven ahi, no en el codigo-.
Respeta `robots.txt`, 1 request por segundo por dominio, backoff ante 429/5xx, e **idempotencia por
URL**: si el contenido no cambio, no lo duplica.

## Las tres reglas con las que se escribio

1. **Cada dato numerico lleva su fuente.** Si no tiene enlace, no es un dato: es un recuerdo.
2. **Si dos fuentes se contradicen, van las dos** y se marca la contradiccion. No se promedia ni se
   elige por cuenta propia.
3. **Lo que no se encontro va a `07-vacios.md`.** No se completa con estimaciones.
