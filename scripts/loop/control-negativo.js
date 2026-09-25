// control-negativo.js - corre TODOS los controles negativos del repo y exige que cada compuerta
// sepa ponerse ROJA.
//
// Uso: node agro.js control-negativo [--listar]
//
// Por que existe: los controles negativos ya estaban -uno por gate, en
// `jira/META/scripts/*-control-negativo.js`- pero sueltos: habia que acordarse de
// cual existe y correrlo a mano. Un control que nadie corre no protege nada, igual que el gate que
// viene a probar.
//
// Un gate verde no prueba que mire: prueba que no encontro nada, que es distinto. Los tests de
// unidad prueban la REGLA; esto prueba la MEDIDA contra el repo real, que es donde los gates se
// rompen -un `git diff` mal armado, un archivo leido del lugar equivocado- sin que ningun test se
// entere.
//
// Cada control MODIFICA archivos versionados mientras corre y los restaura al terminar; por eso
// esto se niega a arrancar con el arbol sucio en lo que ellos tocan.

const fs = require('fs')
const path = require('path')
const { execFileSync, spawnSync } = require('child_process')
const cambios = require('../lib/carpeta-cambios')
const dispatcher = require('../lib/dispatcher')

const RAIZ = process.cwd()
const argv = process.argv.slice(2)

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`Uso: node ${dispatcher.nombre()} control-negativo [--listar]`)
  console.log('  corre cada control negativo del repo y exige que su compuerta de rojo.')
  console.log('  --listar  dice cuales hay, sin correrlos.')
  console.log('  sale 1 si alguno fallo, 2 si no puede correr con seguridad.')
  process.exit(0)
}

// Se descubren del filesystem, no de una lista escrita: una lista se desincroniza el dia que
// alguien agrega un control y se olvida de anotarlo.
const DIR = path.join(RAIZ, cambios.archivoDelLoop('scripts'))

function controles() {
  try {
    return fs.readdirSync(DIR)
      .filter((f) => f.endsWith('-control-negativo.js'))
      .sort()
      .map((f) => ({ nombre: f.replace('-control-negativo.js', ''), ruta: path.join(DIR, f) }))
  } catch { return [] }
}

const lista = controles()

if (!lista.length) {
  console.error(`no hay ningun *-control-negativo.js en ${cambios.archivoDelLoop('scripts')}/`)
  console.error('Eso NO es un OK: es que ninguna compuerta esta probada en rojo.')
  process.exit(2)
}

if (argv.includes('--listar')) {
  console.log(`==> ${lista.length} control(es) negativo(s):`)
  for (const c of lista) console.log(`  ${c.nombre}  (${path.relative(RAIZ, c.ruta)})`)
  process.exit(0)
}

// Si el arbol esta sucio no se puede distinguir "lo ensucie yo" de "ya estaba", y la restauracion
// de cada control pisaria trabajo sin commitear.
let sucios = ''
try {
  sucios = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8', cwd: RAIZ }).trim()
} catch {
  console.error('sin git: estos controles necesitan poder restaurar lo que modifican')
  process.exit(2)
}
if (sucios) {
  console.error('hay cambios sin commitear: los controles reescriben archivos y despues los')
  console.error('restauran, y con el arbol sucio no hay a que volver.')
  console.error(`  ${sucios.split('\n').length} archivo(s). Commitealos o guardalos antes.`)
  process.exit(2)
}

// Sin dependencias instaladas, los gates que las usan fallan por eso y no por lo que el control
// mide: se avisa antes, para no leer un rojo prestado como si fuera un hallazgo.
if (!fs.existsSync(path.join(RAIZ, 'node_modules'))) {
  console.log('AVISO: no hay node_modules. Los gates que dependan de un paquete van a fallar')
  console.log('       por eso, no por lo que este control mide. Corre `npm install` primero.\n')
}

const fallaron = []
for (const c of lista) {
  console.log(`\n==> ${c.nombre}`)
  const r = spawnSync(process.execPath, [c.ruta], { cwd: RAIZ, encoding: 'utf8' })
  const salida = ((r.stdout || '') + (r.stderr || '')).trim()
  if (salida) console.log(salida.split('\n').map((l) => `  ${l}`).join('\n'))
  if (r.status !== 0) fallaron.push(c.nombre)
}

console.log('')
console.log(`${lista.length - fallaron.length}/${lista.length} compuertas supieron ponerse rojas`)
if (fallaron.length) {
  console.log(`fallaron: ${fallaron.join(', ')}`)
  console.log('Una compuerta que no sabe dar rojo no es una compuerta: es decoracion.')
  process.exit(1)
}
