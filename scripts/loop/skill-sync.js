// Regenera skills/REGISTRY.md: el indice de skills, que se cargan por necesidad y no todas en el
// contexto. Uso: node agro.js skill-sync

const fs = require('fs')
const path = require('path')

const SALIDA = 'skills/REGISTRY.md'

// El frontmatter se lee de las PRIMERAS lineas, no del archivo entero: una skill puede mencionar
// "name:" en su prosa y el grep -m1 original tampoco se lo comia.
function campo(texto, clave) {
  const m = texto.match(new RegExp(`^${clave}:[ \\t]*(.*)$`, 'm'))
  return m ? m[1].trim() : ''
}

// Dos ubicaciones, porque los loop hermanos difieren: `skills/<nombre>.md` (plano) y
// `.claude/skills/<nombre>/SKILL.md` (el formato de Claude Code). Mirar solo una hizo que en
// tesis-loop el REGISTRY se regenerara VACIO y borrara el indice real: un generador que no
// encuentra nada no se distingue de uno que encontro cero.
const planos = (fs.existsSync('skills') ? fs.readdirSync('skills') : [])
  .filter((f) => f.endsWith('.md') && f !== 'REGISTRY.md')
  .map((f) => path.join('skills', f))
const anidados = (() => {
  const base = path.join('.claude', 'skills')
  try {
    return fs.readdirSync(base, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => path.join(base, e.name, 'SKILL.md'))
      .filter((p) => fs.existsSync(p))
  } catch { return [] }
})()
const archivos = [...planos, ...anidados].sort()

const filas = archivos.map((ruta) => {
  let texto = ''
  try { texto = fs.readFileSync(ruta, 'utf8') } catch { /* ilegible */ }
  // En el formato anidado todos los archivos se llaman SKILL.md: identifica la CARPETA.
  const archivo = path.basename(ruta)
  const base = archivo === 'SKILL.md' ? path.basename(path.dirname(ruta)) : archivo.replace(/\.md$/, '')
  const name = campo(texto, 'name') || base
  // `when` y `description` son la misma idea con dos nombres segun el loop.
  const cuando = campo(texto, 'when') || campo(texto, 'description')
  const enlace = path.relative('skills', ruta).split(path.sep).join('/')
  return `| [${name}](${enlace}) | ${cuando} |`
})

fs.mkdirSync('skills', { recursive: true })
fs.writeFileSync(SALIDA, [
  '# Skill Registry',
  '',
  'Indice de skills, cargados por necesidad (no todos en el contexto). Generado por',
  'scripts/loop/skill-sync.js - no lo edites a mano.',
  '',
  '| skill | cuando usarlo |',
  '|---|---|',
  ...filas,
  '',
].join('\n'))

console.log(`skill-sync: ${SALIDA} actualizado (${archivos.length} skills)`)
