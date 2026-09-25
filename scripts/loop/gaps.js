// gaps.js - convierte los modos de falla del loop en fichas del ledger.
//
// Uso: node agro.js gaps [--escribir] [--dias N] [--minimo N] [--json]
//
// SIN `--escribir` solo muestra que fichas propondria: es un informe y sale 0.
// CON `--escribir` las agrega a jira/META/FEATURES.json, en rojo.
//
// Por que existe: el pedido era "que un cierre encuentre gaps Y LOS CORRIJA sin que yo le diga
// nada". Encontrarlos ya lo hace `fallos`. Lo que se perdia es el paso del medio: el hallazgo
// aparece en una corrida, nadie lo anota, y vuelve a aparecer a la semana. Esto lo anota.
//
// LO QUE NO HACE, a proposito: aplicar el arreglo. El paper del que sale esta idea valida cada
// cambio automatico contra un conjunto de tareas apartado antes de aplicarlo; nosotros no tenemos
// ese conjunto, y sin el "corregir solo" es cambiar el loop a ciegas. La ficha la escribe la
// maquina; que se haga, lo decide una persona.
//
// Y NUNCA toca una ficha que ya existe: una ficha es el registro de por que se decidio algo.

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const core = require('../lib/gaps-core')
const cambios = require('../lib/carpeta-cambios')

const RAIZ = process.cwd()

// DONDE VIVE EL LEDGER DEL LOOP. Las DOS piezas -la carpeta de cambios y cual de ellos es el del
// loop- salen del proyecto, no del codigo: estaban clavadas y llevar la tool a otro repo la
// dejaba buscando una carpeta que ahi no existe. Detalle en scripts/lib/carpeta-cambios.js.
const LEDGER = path.join(RAIZ, cambios.archivoDelLoop('FEATURES.json'))
const argv = process.argv.slice(2)

if (argv.includes('--help') || argv.includes('-h')) {
  console.log('Uso: node agro.js gaps [--escribir] [--dias N] [--minimo N] [--json]')
  console.log('')
  console.log('Propone fichas para los modos de falla repetidos del loop. Sin --escribir solo')
  console.log('las muestra. Nunca toca una ficha que ya existe.')
  process.exit(0)
}

// El informe sale de `fallos`, no de una copia de su logica: si las dos difirieran, el cierre y
// esto dirian cosas distintas sobre el mismo log.
const pasar = []
for (const f of ['--dias', '--minimo']) {
  const i = argv.indexOf(f)
  if (i >= 0 && argv[i + 1]) pasar.push(f, argv[i + 1])
}
const r = spawnSync(process.execPath, ['agro.js', 'fallos', '--json', ...pasar], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
let informe = null
try { informe = JSON.parse(r.stdout) } catch { informe = null }
if (!informe) {
  console.error('no pude leer el informe de `fallos`: sin el no hay nada que fichar (no es un OK)')
  process.exit(2)
}

let ledger = null
try { ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8')) } catch { ledger = null }
if (!ledger || !Array.isArray(ledger.features)) {
  console.error(`no pude leer ${path.relative(RAIZ, LEDGER)}: no se contra que deduplicar (no es un OK)`)
  process.exit(2)
}

// La lista REAL de tools, del disco: una falla de una tool que ya se podo no se propone. Si no se
// puede leer se pasa null y NO se filtra -mejor proponer de mas que descartar por no saber-.
let tools = null
try { tools = new Set(require('../lib/tools-registro').descubrirTools(RAIZ).keys()) } catch { /* sin lista, no se filtra */ }

const cands = core.candidatas(informe, ledger.features.map((f) => f.id), { tools })

if (argv.includes('--json')) {
  console.log(JSON.stringify(cands, null, 2))
  process.exit(0)
}

console.log('==> gaps del loop -> fichas')
console.log(core.informe(cands))

if (!cands.fichas.length) process.exit(0)

if (!argv.includes('--escribir')) {
  console.log('')
  for (const c of cands.fichas) {
    console.log(`--- ${c.id}`)
    console.log(`    ${c.descripcion}`)
  }
  console.log('')
  console.log('Para agregarlas al ledger (en rojo, sin tocar ninguna existente): node agro.js gaps --escribir')
  process.exit(0)
}

// Se escribe sobre lo leido recien y se agrega al final: el orden del ledger es historico y
// reordenarlo haria ilegible cualquier diff.
ledger.features.push(...cands.fichas)
fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n')
console.log('')
console.log(`escritas ${cands.fichas.length} ficha(s) en ${path.relative(RAIZ, LEDGER).replace(/\\/g, '/')}, todas en rojo.`)
console.log('Leelas antes de trabajarlas: la maquina vio el sintoma, no la causa.')
