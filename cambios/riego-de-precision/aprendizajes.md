# Aprendizajes de riego-de-precision

## Diseño de front — tercera pasada (28/09/2026)

**Decisión del dueño: una sola app.** Se sacó la vista capataz como vista separada y el interruptor
de rol. Y el aprendizaje es el bueno: **lo que se aprendió haciendo esa vista no se tiró — se
ascendió a default de la app entera.** 18 px de base, 56 px de toque, contraste alto, respuesta
arriba y grande, acción escrita en cada renglón, agua en palabras, gráficos plegados. La vista
descartada sirvió para descubrir cómo tenía que comportarse todo.

**Y el corolario que ordena el producto: el permiso decide la densidad, y no se rotula.** Quien no
puede escribir reglas de riego no ve esa opción — no apagada, no con un cartel: no está. Decirle a
alguien "esto es para otro rol" es contarle lo que no puede hacer, que no le sirve de nada.

**El mapa pasó a tener dos niveles**, y eso toca el modelo: `campo` necesita `campo.geom`, que hoy
no tiene. El campo es el **fondo** y los potreros son **lo que se toca**. Lo que más costó dibujar
bien es lo que más importa: **la suma de los potreros no da el campo** — hay monte, camino, casco,
corral y tajamar en el medio. De ahí sale una trampa que un tablero mal hecho induce solo: **el
verdor del campo entero no sirve para decidir nada**, porque el monte está verde todo el año.

El producto se llama **agropecuaria de precisión**; el ticket sigue llamándose como el día que se
abrió.

## Diseño de front — segunda pasada (28/09/2026)

**El error de la primera pasada, y vale más que todo lo que salió bien: se diseñaron doce
pantallas sin saber quién las usa.** El perfil llegó después
([docs/quien-usa-esto.md](docs/quien-usa-esto.md)) y obligó a rehacerlo entero. Lo que se aprende
no es "traducir la jerga": es que **el perfil del usuario es contexto de arranque, no una revisión
posterior**. Un brief sin usuario produce una app correcta para nadie.

Los cuatro cambios que importaron:

1. **La respuesta arriba y grande; el gráfico abajo, plegado, como justificación.** Estaba al revés.
2. **El rol decide el TAMAÑO de la app, no solo los permisos.** El capataz ve tres pantallas; el
   dueño, doce. Es la misma app: lo hace posible el modelo de permisos que ya estaba diseñado.
3. **Icono + palabra siempre, y las palabras del campo** — lote, potrero, manguera, pila, seco,
   regar, cantero, testigo. La jerga no se simplifica: se saca y se pone lo que la persona hace.
4. **Al sol, en un teléfono barato, con las manos sucias**: 18 px de base (21 con un botón),
   56 px de toque, contraste alto, cinco figuras distintas de estado, y *"última lectura hace 3
   días"* arriba y en grande.

Y dos que se mantuvieron sin discusión: **no hay botón de válvula** y el cartel de datos de ejemplo
no se cierra.

**Bug real encontrado en el navegador, no en el código:** el override de contraste del capataz
(`:root[data-role="capataz"]`) pisaba al tema oscuro, porque los dos selectores pesan igual y el
del rol iba después. El texto quedaba casi negro sobre fondo negro. **Un tema oscuro solo se
verifica mirándolo.**

## Diseño de front — primera pasada (28/09/2026)

**Estado: PENDIENTE DE APROBACIÓN.** Nada de esto sube a `memory/playbooks/ui-designer.md`
hasta que el dueño mire `docs/mockup/index.html` en el navegador y diga que sí. El playbook
arranca vacío a propósito y solo entra ahí lo que se probó y se aprobó.

Entregables: [`docs/pantallas.md`](docs/pantallas.md) (inventario de 12 pantallas + principios)
y [`docs/mockup/index.html`](docs/mockup/index.html) (un archivo, sin backend).

### Decisiones de diseño que hay que confirmar o rechazar

1. **La profundidad se dibuja como profundidad.** La humedad va en tres paneles apilados
   (10 / 30 / 60 cm) que comparten el eje de tiempo, con una rampa de un solo tono donde más
   oscuro es más profundo. La profundidad es un **orden**, no cuatro identidades: por eso rampa
   y no cuatro colores. Es lo que hace visible el sobre-riego.
2. **Lluvia hacia abajo, riego hacia arriba.** Convención de hidrología (hietograma). Separa las
   dos series por **posición** y no solo por color, que es lo que pide la regla de accesibilidad.
3. **`NULL` se dibuja como hueco** (línea cortada + franja "sin dato"), nunca como caída a cero.
4. **La política no tiene botón de válvula**, y la pantalla lo dice en un cartel fijo, arriba,
   en vez de dejar que alguien lo busque. Los tres tiempos —guardada / acusada / rigiendo— son
   tres filas distintas.
5. **Sin señal es gris, no rojo.** El rojo se reserva para lo que obliga a ir al lote.
6. **La procedencia de la calibración es una columna de la tabla**, no un tooltip.
7. **Cartel de mockup que no se puede cerrar**, para que ningún número de ejemplo se confunda
   con un dato medido.

### Sistema visual propuesto

- **Tipografía: una sola familia, Archivo variable**, usando el **eje de ancho** (wdth 86–118)
  para la jerarquía en vez de meter una segunda familia o versalitas. Números con
  `tabular-nums`; **nada de monoespaciada** para etiquetas de dato.
- **Color**: papel mineral `#F2F4F1` (no crema), tinta verde-negra `#132019`, marca teal de agua
  profunda `#0D4F5C`. Las paletas de datos —categórica, rampa de profundidad, rampa de NDVI, en
  claro y en oscuro— están **validadas con el script de la skill `dataviz`** (banda de luminosidad,
  piso de croma, separación para daltonismo, contraste contra la superficie). Los hex están en las
  variables CSS del mockup.
- **Sin tarjetas flotantes con sombra**: paneles con hairline sobre una sola superficie.
- **Responsive**: riel a la izquierda en escritorio; en teléfono, cajón + barra de 4 pestañas
  (Mapa · Riego · Solución · Alertas). Los ticks del eje X se ralean solos según el ancho.

### Lo que falta

- Que un humano lo abra en el navegador y lo apruebe o lo devuelva.
- Recién ahí, destilar lo aprobado a `memory/playbooks/ui-designer.md` (respetando el tope de
  `node agro.js presupuesto`: entra lo que ahorra un error en la próxima pantalla, no el catálogo).
