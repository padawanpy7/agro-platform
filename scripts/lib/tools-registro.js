// El registro de herramientas del loop: que tools hay y donde vive cada una.
//
// Se descubre del filesystem, no se mantiene a mano: un registro escrito se desincroniza el dia
// que alguien agrega una tool y se olvida de anotarla. `lib/` queda afuera porque son librerias
// que se importan, no cosas que se corren.
//
// Lo comparten agro.js (para despachar) y tool-usage (para saber cuales NUNCA se usaron). Antes esa
// segunda pregunta se contestaba grepeando `_count.sh` dentro de los `*.sh`; al desaparecer los
// wrappers, la fuente de verdad pasa a ser esta.

const fs = require('fs')
const path = require('path')

function descubrirTools(raiz) {
  const tools = new Map()
  const base = path.join(raiz, 'scripts')
  let areas
  try { areas = fs.readdirSync(base, { withFileTypes: true }) } catch { return tools }
  for (const area of areas) {
    if (!area.isDirectory() || area.name === 'lib') continue
    for (const archivo of fs.readdirSync(path.join(base, area.name))) {
      if (!archivo.endsWith('.js') || archivo.endsWith('.test.js')) continue
      tools.set(archivo.slice(0, -3), path.join(base, area.name, archivo))
    }
  }
  return tools
}

const areaDe = (ruta) => path.basename(path.dirname(ruta))

module.exports = { descubrirTools, areaDe }
