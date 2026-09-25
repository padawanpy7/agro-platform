# Diagramas para presentacion

Dos diagramas interactivos, standalone (un solo `.html`, sin dependencias: se abren con doble clic
y funcionan sin internet).

| Archivo | Que muestra |
|---|---|
| `infraestructura-completa.html` | Del sensor enterrado al VPS: campo, gateway, borde y plataforma |
| `modelo-de-datos.html` | El modelo de datos, con la parcela como unidad de analisis |

El `.json` al lado de cada uno es **la fuente**: se edita ese y se regenera. No se edita el HTML.

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
