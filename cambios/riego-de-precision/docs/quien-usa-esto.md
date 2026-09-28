# Quien usa esto, y por que cambia toda la UI

**28/09/2026.** Dato del dueño, y es el que faltaba en todo el diseño de pantallas hecho hasta hoy:

> *"Esto lo van a usar estancieros o capataces que jamas vinieron a Asuncion y no saben de lo que es
> capaz la IA ni la informatica."*

**No es un comentario de estilo: es la restriccion mas dura del producto**, y llego despues de que el
mockup estuviera hecho. El mockup se diseño sin saber esto y **se nota**.

## La jerga que se filtro, contada

| termino | veces en el mockup | quien lo entiende |
|---|---|---|
| `ST_Contains` | **2** | nadie fuera de un programador |
| `tenant` | **10** | nadie. Es una palabra del esquema |
| `p10` / `p90` | **16** | un agronomo, con suerte |
| `mS/cm` | **11** | un hidroponista. **Un capataz no** |
| `NDVI` | **34** | nadie sin explicacion |
| `calibracion_id` | 1 | nadie |
| `LoRa` | 1 | nadie |

**El ejemplo que el dueño encontro solo, y tenia razon**: en el mapa decia *"Ningun dispositivo se
asigna a mano -- cae adentro de la parcela por `ST_Contains`"*. **Eso es el nombre de una funcion de
PostGIS en la pantalla principal.**

> **La regla que faltaba: si la palabra no se dice en el campo, no va en la pantalla.** No se traduce
> a una version "mas simple" de la jerga: **se saca**, y en su lugar va lo que la persona hace con
> eso.

## Las nueve reglas que salen de ese perfil

1. **La pantalla contesta una PREGUNTA, no muestra datos.** El capataz no quiere un grafico: quiere
   *"riego hoy o no"*. **La respuesta arriba, grande; el grafico abajo, como justificacion.** Hoy el
   mockup esta al reves.
2. **Icono + palabra, nunca icono solo.** Un icono solo es una adivinanza. Y la palabra en el idioma
   del campo: *potrero*, *lote*, *aguada*, *seco*, *mojado*, *regar*.
3. **Se usa al sol, en un telefono barato, con las manos sucias.** Contraste alto, letra grande,
   botones grandes. **El color nunca es el unico canal**: al sol un verde y un naranja se parecen.
4. **La señal es mala y el dato llega viejo.** *"Ultima lectura hace 3 dias"* importa **mas** que
   cualquier grafico, y va arriba, no en letra chica.
5. **Las unidades son las de ellos.** **Litros, no m3.** Hectareas. Guaranies con separador de miles.
   Nada de notacion cientifica.
6. **Escribir en un telefono en el campo es un castigo.** Foto y eleccion antes que teclado. El
   `proposal.md` ya tiene el instinto correcto con la **foto georreferenciada** de la trampa.
7. **Ninguna accion peligrosa a un toque**, y ninguna accion cuyo resultado la persona no pueda
   predecir antes de tocarla.
8. **Cada rol ve una app de distinto TAMAÑO.** El capataz necesita **tres** pantallas; el dueño,
   doce. **Mostrarle doce al capataz es el fracaso.**
9. **Nada de IA visible.** La persona no sabe que puede hacer un modelo y no tiene por que saberlo.
   **El sistema dice "regá" o "no riegues", no "el modelo predice con 87% de confianza".**

> **La 8 es la que ata esto con lo que ya se diseño**: el modelo de permisos granulares de
> [usuarios-roles-permisos.md](usuarios-roles-permisos.md) **es justamente lo que permite que el
> capataz vea tres pantallas y el dueño doce**, sin dos aplicaciones distintas. Los permisos no son
> solo seguridad: **son la densidad de informacion.**

## Traduccion: que se dice en vez de que

| en vez de | se dice | o directamente |
|---|---|---|
| `ST_Contains` | -- | **no se dice nada.** Que el sensor caiga en el lote es asunto del sistema |
| `tenant` | *"cliente"* | invisible para el usuario |
| **NDVI** | **"cuanto pasto hay"** / *"verdor"* | y el numero al lado, si lo pide |
| p10 / p90 | *"lo mas flojo y lo mejor del lote"* | o no se muestra |
| **coeficiente de variacion** | **"este lote es parejo o disparejo"** | |
| calibracion | *"ajuste del sensor"* | |
| m3 | **litros** | |
| EC, mS/cm | se quedan **solo en hidroponia** | el capataz nunca abre esa pantalla |
| "sin señal" | **ya esta bien** | |

## Como se prueba, y es gratis

**El capataz del señor existe, planta tomate y sandia, y ya se ofrecio a ayudar**
([colmena/02-caica.md](../colmena/02-caica.md)).

> **Dale el telefono con el mockup abierto y callate.** Sin explicar nada. Lo que el busque y no
> encuentre, y lo que toque esperando otra cosa, **es el diseño**. Cinco minutos valen mas que cinco
> iteraciones de escritorio.

**Y es la misma persona que es la referencia agronomica y el grupo de control.** El mismo viaje del
sabado.

## Que hay y que no hay de "Claude Design" -- verificado el 28/09/2026

`.claude/agents/ui-designer.md` dice que el rol *"diseña con Claude Design"* si hay skill o MCP
disponible. **Se reviso en serio en vez de suponer**, y la respuesta tiene tres partes:

| para | herramienta | estado |
|---|---|---|
| **Diseñar pantallas en un canvas** (artboards en vivo) | **Artifact, tipo "Design"** | **DISPONIBLE AHORA.** Es lo mas parecido a lo que el dueño pide |
| **Subir NUESTRA libreria de componentes** a claude.ai/design, para que el agente de diseño arme todo con nuestras piezas | `DesignSync` + skill `/design-sync` | **pide `/design-login`** (solo lo puede correr el dueño) **Y una libreria compilada, que este repo no tiene** |
| Figma u otro MCP de diseño | -- | **ninguno conectado.** Los MCP de esta sesion son Claude Docs, Gmail, Calendar y Drive |

**Correccion de lo que decia antes este documento**: se habia escrito *"no hay skill ni MCP de Claude
Design"*. **Es impreciso.** La herramienta `DesignSync` existe y esta cableada; lo que falta son la
autorizacion y **la libreria de componentes**. Y para **hacer** un diseño la herramienta correcta
nunca fue `DesignSync` -- su propia descripcion lo dice: *"nunca la uses para hacer un diseño, deck o
prototipo: eso se hace con un tipo Slides o Design del Artifact"*.

**Y el dato que ordena el orden de las cosas**: la cuenta **no tiene ningun design system cargado**.
Sincronizar uno **no tiene nada que sincronizar hasta que exista el front**, que es la **Fase 5** de
[tasks.md](../tasks.md). Antes de eso, `/design-sync` crearia un proyecto vacio.

El mockup actual se hizo con `frontend-design` y `dataviz`, que si estan.
