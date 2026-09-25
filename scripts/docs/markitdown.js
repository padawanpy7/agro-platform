// Convierte un documento (PDF/Word/Excel/PPT/imagen) a markdown con markitdown.
//
// Uso: node agro.js markitdown <entrada> [--out salida.md]
//      (sin --out, escribe <entrada-sin-extension>.md al lado del original)
//
// Existe como tool -y no como una linea de bash a mano- porque el binario es la parte dificil:
// este equipo no tiene Python usable en el PATH (`python3` es el stub de la Microsoft Store, que
// existe, no ejecuta nada y sale 0). El interprete bueno es el portable de ../tools/python-*-embed-*/.
//
// El flujo tipico: un adjunto pesado (PDF, Word, Excel) se convierte a .md y el binario se borra
// (no se versiona lo pesado y re-descargable).

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const RAIZ = process.cwd()
const TOOLS = path.join(path.dirname(RAIZ), 'tools')
const args = process.argv.slice(2)

if (!args.length || args[0] === '--help' || args[0] === '-h') {
  console.log('Uso: node agro.js markitdown <entrada> [--out salida.md]')
  process.exit(args.length ? 0 : 2)
}

const entrada = args[0]
let salida = ''
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--out') salida = args[++i]
  else { console.error(`flag desconocido: ${args[i]}`); process.exit(2) }
}
if (!salida) salida = entrada.replace(/\.[^.\\/]+$/, '') + '.md'

if (!fs.existsSync(entrada)) {
  console.error(`no existe ${entrada}`)
  process.exit(2)
}

function pythonPortable() {
  if (!fs.existsSync(TOOLS)) return null
  const dir = fs.readdirSync(TOOLS).filter((d) => /^python-.*-embed-/.test(d)).sort().pop()
  if (!dir) return null
  const exe = path.join(TOOLS, dir, 'python.exe')
  return fs.existsSync(exe) ? exe : null
}

const py = pythonPortable()
if (!py) {
  console.error('no encontre el Python portable en ../tools/python-*-embed-*/python.exe')
  console.error('  (corré init.sh para bootstrapearlo)')
  process.exit(1)
}

// -o en vez de redirigir: con la redireccion, las figuras que markitdown extrae con pdfminer +
// ImageWriter no encuentran donde escribir.
const r = spawnSync(py, ['-m', 'markitdown', entrada, '-o', salida], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })

if (r.status !== 0) {
  console.error('FALLO: markitdown no pudo convertir')
  console.error(((r.stderr || '') + (r.stdout || '')).trim().split('\n').slice(-8).join('\n'))
  process.exit(1)
}

const kb = fs.existsSync(salida) ? Math.max(1, Math.round(fs.statSync(salida).size / 1024)) : 0
console.log(`OK  ${entrada} -> ${salida} (${kb} KB)`)
