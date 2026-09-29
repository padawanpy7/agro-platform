# Diagramas para presentacion

Dos diagramas interactivos, standalone (un solo `.html`, sin dependencias: se abren con doble clic
y funcionan sin internet).

| Archivo | Que muestra |
|---|---|
| `infraestructura-completa.html` | Del sensor enterrado al VPS: campo, gateway, borde y plataforma |
| `modelo-de-datos.html` | La espina del modelo, con la parcela como unidad de analisis |
| `etiquetas-y-eventos.html` | La otra mitad: la campania, la cosecha, lo que se vio y lo que se aplico |

El `.json` al lado de cada uno es **la fuente**: se edita ese y se regenera. No se edita el HTML.

## El DER completo NO esta aca, y es a proposito

Estos tres son diagramas **para mirar**: cada linea esta puesta a mano y archify **rechaza** una
flecha que cruce a otra o que pase por encima de una caja, en los dos perfiles de calidad. Eso es
lo que los hace legibles, y es exactamente lo que un DER de 62 tablas y 130 claves foraneas **no
puede cumplir** -- no hay acomodo de 62 cajas donde cien relaciones no se crucen. Se intento y se
descarto; el intento esta documentado en el encabezado de `generate-der.mjs`.

**El DER completo -- todas las tablas, todas las columnas, todas las claves -- vive en
[cambios/riego-de-precision/docs/der.md](../../cambios/riego-de-precision/docs/der.md)**, lo
**genera un script leyendo el catalogo de la base que corre**, y trae ademas el grafo entero en
Mermaid. No se edita a mano:

```sh
node cambios/riego-de-precision/scripts/generate-der.mjs
```

## Y ese mismo script vigila este diagrama

`modelo-de-datos.html` se dibujo el 25/09 con los nombres en español y **siguio diciendo `parcela`,
`campania` y `medicion` cuatro dias despues de que el esquema pasara a ingles**. Nadie se dio
cuenta porque **nada podia darse cuenta**: un diagrama dibujado a mano no tiene quien lo desmienta.

Desde el 29/09 `generate-der.mjs` **falla** si `modelo-de-datos.json` nombra una tabla que no existe
en la base. La primera vez que corrio, fallo -- con las once tablas viejas en la salida.

## Regenerar

```sh
cd .claude/skills/archify
node bin/archify.mjs validate architecture <fuente>.json --quality showcase --json
node bin/archify.mjs deliver  architecture <fuente>.json <salida>.html --quality showcase --json
node bin/archify.mjs visual-check <salida>.html --json
```

Los tres pasos importan: `validate` mira geometria y solapamientos, `deliver` congela la fuente y
renderiza, y `visual-check` confirma que entra en pantalla a 1440x900 y mas grandes. Los dos
diagramas pasan los **9 checks de showcase** y la verificacion de contencion.

## Para presentar

El visor ya trae, sin configurar nada: tema claro/oscuro, zoom y desplazamiento, busqueda, foco
sobre un componente, resaltado de relaciones y modo presentacion. **Revisalo en la pantalla donde
vas a proyectar antes de la reunion**: la contencion esta verificada hasta 2048x1320, pero un
proyector viejo puede tener otra relacion de aspecto.

## Lo que los diagramas afirman, y de donde sale

No son un dibujo de intenciones: lo que muestran del lado del VPS **ya existe y esta medido** -k3s,
Cilium, Traefik, cert-manager, Argo CD, el candado de Cloudflare, la admision-. Lo que todavia no
existe es la parte de producto: sensores, gateway, controlador, MQTT, la API, la base y el ML.

Si vas a presentarlo a un tercero, conviene decir esa diferencia en voz alta. Es la misma regla que
el resto del repositorio: lo declarado no es lo aplicado hasta que se mide.

## Publicados como Artifact (los enlaces, que solo vivian en el chat)

Los `.html` de esta carpeta son la copia buena y no dependen de nada. Pero ademas estan publicados,
que es lo que sirve para **abrirlos desde el telefono o pasarle el enlace a un tercero** sin
mandarle un archivo de 700 KB:

| Diagrama | Enlace |
|---|---|
| `infraestructura-completa.html` | https://claude.ai/artifact/MBAKVqpqCHK2VMUtyZWw2z |
| `modelo-de-datos.html` | https://claude.ai/artifact/93iQsN4NdDGgeoJ2TBTfwK |
| Presentacion de viabilidad (17 laminas) | https://claude.ai/artifact/Q9WktgJCQFoDwiEh3f5TpT |
| Mockup de pantallas | https://claude.ai/artifact/9axfD7KWQAHCHVLWeodctp |

**Los publicados son del 25/09 y el HTML local del 29/09.** El de `modelo-de-datos` es justamente
el que quedo nombrando tablas en español despues de que el esquema pasara a ingles: el publicado
**tiene los nombres viejos**. Antes de mostrarselo a alguien, republicar desde el `.html` de esta
carpeta.

Quedan escritos aca porque un enlace publicado no vive en ningun repositorio: si se cierra el chat
donde se genero, no hay de donde sacarlo de nuevo.
