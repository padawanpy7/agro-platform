# Reglas del front, y no son negociables

**29/09/2026.** Tres decisiones del dueño, textuales:

> *"Todo en ingles, hasta el codigo del front, solo el texto del front va ser espaniol."*
>
> *"Quiero activar otra vez el spell es-en para los archivos que se muestran en el front, para
> evitar palabras raras."*
>
> *"Para el front esta PROHIBIDO crear componentes sin autorizacion, todo tiene que venir de
> librerias como shadcn."*

## 1. Ingles en el codigo, espaniol en la pantalla

| | idioma | ejemplo |
|---|---|---|
| Nombres de tabla y columna | **ingles** | `measurement`, `raw_value`, `measured_at` |
| Codigo del front: componentes, props, variables, rutas | **ingles** | `<PaddockMap />`, `isLoading`, `/fields/:id` |
| **Texto que lee el usuario** | **espaniol** | *"Regá hoy temprano"*, *"Última lectura hace 6 minutos"* |

**Y el texto NO va escrito adentro del componente**: va en archivos de traduccion (`locales`), que es
lo unico que el spell revisa y lo unico que se traduce si algun dia hace falta.

### La distincion de los acentos, que sale de correr el spell la primera vez

Este repo escribe los **documentos internos en espaniol SIN acentos** (convencion ASCII, y la tool
`ascii` la hace cumplir). El diccionario espaniol **exige los acentos**.

> **No es una contradiccion: son dos registros distintos.**
>
> - **Documento interno** -> sin acentos, estilo ASCII. **No pasa por el spell.**
> - **Texto de pantalla** -> espaniol **correcto, con acentos**. **Si pasa por el spell.**
>
> Un capataz que lee *"calibracion"* sin tilde en el telefono ve un producto descuidado. En un
> comentario de SQL no lo ve nadie.

(`ascii` no pelea con esto: convierte tipografia -- guiones largos, comillas curvas -- y
**mantiene los acentos**.)

## 2. PROHIBIDO crear componentes sin autorizacion

**Todo componente sale de una libreria.** shadcn/ui como base.

**Por que esta regla es buena, y no es burocracia:**

1. **Un componente propio es deuda para siempre.** Hay que mantenerlo, hacerlo accesible, probarlo
   en teclado y en lector de pantalla, y arreglarlo en cada navegador nuevo. Una libreria ya pago
   todo eso.
2. **La accesibilidad es lo primero que se pierde.** Un `<div onClick>` hecho a mano no responde al
   teclado, no anuncia nada y no tiene foco visible. Los componentes de shadcn vienen sobre Radix,
   que resuelve foco, teclado y ARIA.
3. **Es coherencia gratis.** Doce componentes propios hechos en semanas distintas no se parecen
   entre si; doce de la misma libreria si.
4. **Y es lo que hace que el mockup se pueda tirar.** El mockup actual es HTML a mano, y esta bien
   que lo sea -- es un mockup. El front de verdad no se escribe asi.

### Que SI se puede hacer sin pedir permiso

| | |
|---|---|
| **Componer** los de la libreria | un `Card` con un `Badge` adentro es composicion, no un componente nuevo |
| **Envolver** uno para fijar props del producto | un `StatusBadge` que es un `Badge` con nuestros estados |
| **Layout** con clases de utilidad | las grillas y los espacios son CSS, no componentes |

### Que NO, sin autorizacion explicita

- Reimplementar algo que la libreria ya tiene -- modal, tooltip, select, tabs, tabla.
- Un control interactivo nuevo desde cero: cualquier cosa con foco, teclado o estado abierto.

### Las dos excepciones previsibles, y hay que pedirlas igual

1. **El mapa.** Ninguna libreria trae el mapa de parcelas con sus capas. Va a haber que escribirlo.
   **Se pide antes de escribirlo**, no despues.
2. **Los graficos.** Van con una libreria de graficos, no a mano. Lo propio ahi es la configuracion,
   no el componente.

## 3. Lo que esto cambia en lo ya hecho

- **Las tres migraciones estan en espaniol y hay que rehacerlas en ingles.** Se hace AHORA porque
  hoy son 13 tablas **sin un solo dato de valor**: renombrarlas cuesta una tarde. Con datos adentro
  cuesta una migracion con reescritura.
- **Los catalogos llevan las dos cosas**: `code` en ingles para el sistema, `name` en espaniol para
  la pantalla. `code='drip'`, `name='Goteo'`. Asi el codigo queda en un idioma y la pantalla en el
  del campo, **sin traducir nada en la UI**.
- **El mockup se queda como esta.** Es un mockup, no el front, y su valor es que el capataz lo
  toque el sabado.
