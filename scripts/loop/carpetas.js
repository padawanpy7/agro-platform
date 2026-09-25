// El estado de TODAS las carpetas de trabajo en una tabla, de un vistazo.
//
// Por que existe: este workspace trabaja con un worktree por ticket, y para saber "como estamos"
// hay que correr cuatro comandos por carpeta (`status`, dos `rev-list` y `config` del remoto) y
// cruzarlos a mano. Con ocho carpetas son treinta y dos invocaciones a git y una tabla armada de
// memoria, que es justo donde se cuelan los errores: mirar el `status` de una carpeta y atribuirlo
// a otra. La tabla la arma la tool desde el disco, asi que no puede mentir.
//
// Lo que mide cada columna, y por que esa y no otra:
//   SUELTOS  archivos sin commitear. Es lo unico de la tabla que se puede PERDER: lo demas ya
//            esta en un commit. Se separan los NUEVOS (`??`) porque son los que mas duelen -un
//            objeto de base sin versionar existe solo en ese disco-.
//   ADELANTO commits propios que main todavia no tiene: el trabajo del ticket.
//   ATRASO   commits de main que la rama no tiene. Mucho atraso = el merge se va a poner caro.
//   REMOTO   si la rama tiene upstream y cuantos commits faltan pushear. Sin remoto, todo el
//            trabajo commiteado vive en un solo disco igual.
//
// SOLO LEE: no toca ninguna carpeta. Sale 0 siempre salvo `--gate`.
// Uso: node agro.js carpetas [--sueltos] [--gate] [--json]

const path = require('path')
const g = require('../lib/git')

const args = process.argv.slice(2)
const tiene = (n) => args.includes(n)

if (tiene('-h') || tiene('--help')) {
  console.log('Uso: node agro.js carpetas [--sueltos] [--gate] [--json]')
  console.log('  La tabla de estado de cada worktree: sueltos, adelanto, atraso y remoto.')
  console.log('  --sueltos  lista los archivos sin commitear de cada carpeta')
  console.log('  --gate     sale 1 si alguna carpeta tiene archivos NUEVOS sin commitear')
  console.log('  --json     el mismo dato en JSON, para otra tool')
  process.exit(0)
}

// `git worktree list --porcelain` es la unica fuente: si una carpeta no esta ahi, no es un
// worktree de este repo y no nos incumbe.
function worktrees() {
  const salida = g.git('worktree', 'list', '--porcelain').split('\n')
  const lista = []
  let actual = null
  for (const l of salida) {
    if (l.startsWith('worktree ')) {
      actual = { ruta: l.slice(9).trim(), rama: '' }
      lista.push(actual)
    } else if (l.startsWith('branch refs/heads/') && actual) {
      actual.rama = l.slice(18).trim()
    } else if (l.trim() === 'detached' && actual) {
      actual.rama = ''
    }
  }
  return lista
}

const enCarpeta = (ruta, ...cmd) => g.git('-C', ruta, ...cmd)

function medir(wt) {
  const { ruta } = wt
  const rama = wt.rama || '(detached)'
  const estado = enCarpeta(ruta, 'status', '--porcelain')
  const lineas = estado ? estado.split('\n') : []
  const nuevos = lineas.filter((l) => l.startsWith('??'))

  // Sin rama (detached) no hay adelanto/atraso que medir contra main de forma util: se compara
  // el HEAD suelto, que es lo que el dueño ve en `worktree list`.
  const ref = wt.rama || enCarpeta(ruta, 'rev-parse', 'HEAD')
  const adelanto = Number(enCarpeta(ruta, 'rev-list', '--count', `main..${ref}`) || 0)
  const atraso = Number(enCarpeta(ruta, 'rev-list', '--count', `${ref}..main`) || 0)

  const remoto = wt.rama ? enCarpeta(ruta, 'config', '--get', `branch.${wt.rama}.remote`) : ''
  let sinPushear = null
  if (remoto) {
    const n = enCarpeta(ruta, 'rev-list', '--count', `${remoto}/${wt.rama}..${wt.rama}`)
    sinPushear = n === '' ? null : Number(n)
  }

  return {
    carpeta: path.basename(ruta),
    ruta,
    rama,
    sueltos: lineas.length,
    nuevos: nuevos.length,
    archivos: lineas,
    adelanto,
    atraso,
    remoto: remoto || null,
    sinPushear,
    ultimo: enCarpeta(ruta, 'log', '-1', '--date=format:%d/%m %H:%M', '--pretty=%ad'),
  }
}

const filas = worktrees().map(medir)

if (tiene('--json')) {
  console.log(JSON.stringify(filas, null, 2))
  process.exit(0)
}

// El ancho de las dos primeras columnas sale del dato, no de un numero fijo: los nombres de
// carpeta y de rama cambian con cada ticket y una tabla desalineada se lee peor que una lista.
const anchoCarpeta = Math.max(7, ...filas.map((f) => f.carpeta.length))
const anchoRama = Math.max(4, ...filas.map((f) => f.rama.length))
const pad = (s, n) => String(s).padEnd(n)

const textoRemoto = (f) => {
  if (!f.remoto) return 'SIN REMOTO'
  if (f.sinPushear === null) return 'sin upstream'
  return f.sinPushear === 0 ? 'al dia' : `${f.sinPushear} sin pushear`
}
const textoSueltos = (f) => {
  if (f.sueltos === 0) return '-'
  return f.nuevos > 0 ? `${f.sueltos} (${f.nuevos} nuevos)` : String(f.sueltos)
}

console.log(`${pad('CARPETA', anchoCarpeta)}  ${pad('RAMA', anchoRama)}  ${pad('SUELTOS', 15)}  ADEL  ATRAS  ${pad('REMOTO', 15)}  ULTIMO`)
for (const f of filas) {
  console.log(
    `${pad(f.carpeta, anchoCarpeta)}  ${pad(f.rama, anchoRama)}  ${pad(textoSueltos(f), 15)}  ` +
    `${pad(f.adelanto, 4)}  ${pad(f.atraso, 5)}  ${pad(textoRemoto(f), 15)}  ${f.ultimo}`
  )
}

if (tiene('--sueltos')) {
  for (const f of filas.filter((x) => x.sueltos > 0)) {
    console.log(`\n== ${f.carpeta} (${f.rama}) ==`)
    for (const a of f.archivos) console.log(`  ${a}`)
  }
}

// El resumen dice lo que hay que HACER, no repite la tabla.
const conNuevos = filas.filter((f) => f.nuevos > 0)
const sinRemoto = filas.filter((f) => !f.remoto && f.adelanto > 0)
const sinPushear = filas.filter((f) => f.sinPushear > 0)
const atrasadas = filas.filter((f) => f.atraso > 0)

console.log('')
if (conNuevos.length) {
  console.log(`OJO  ${conNuevos.length} carpeta(s) con archivos NUEVOS sin commitear (es lo unico que se puede perder):`)
  for (const f of conNuevos) console.log(`       ${f.carpeta}: ${f.nuevos} nuevo(s) de ${f.sueltos} suelto(s)`)
}
if (sinRemoto.length) console.log(`     ${sinRemoto.length} rama(s) con trabajo propio y SIN remoto: ${sinRemoto.map((f) => f.rama).join(', ')}`)
if (sinPushear.length) console.log(`     ${sinPushear.length} rama(s) con commits sin pushear: ${sinPushear.map((f) => `${f.rama} (${f.sinPushear})`).join(', ')}`)
if (atrasadas.length) console.log(`     ${atrasadas.length} rama(s) atrasadas respecto de main: ${atrasadas.map((f) => `${f.rama} (${f.atraso})`).join(', ')}`)
if (!conNuevos.length && !sinRemoto.length && !sinPushear.length && !atrasadas.length) {
  console.log('Todas las carpetas al dia: sin archivos nuevos sueltos, sin atraso y con todo en el remoto.')
}

if (tiene('--gate') && conNuevos.length) process.exit(1)
