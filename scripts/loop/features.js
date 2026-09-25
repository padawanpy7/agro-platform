// Estado del ledger POR TICKET (<carpeta_cambios>/<TICKET>/FEATURES.json).
//
// El ledger no es global: cada ticket tiene el suyo, para no mezclar tareas. Detecta el ticket por
// la RAMA actual (una tarea = una rama), asi no se reporta el ledger de otra.
//
// Uso: node agro.js features             -> el ledger del ticket de la rama actual
//      node agro.js features <TICKET>    -> el de ese ticket
//      node agro.js features <ruta.json> -> ese archivo (compatibilidad)
//      node agro.js features --all       -> resumen de todos los changes con ledger
//      node agro.js features --gate      -> sale 1 si quedan fichas pendientes (para HECHO_CUANDO)
//
// SIN --gate esto es un INFORME y sale 0 siempre, incluso sin ledger. Con --gate es una compuerta.
// La distincion importo el 31/08: un HECHO_CUANDO pedia `features --gate` cuando el flag no
// existia, asi que "--gate" se leyo como NOMBRE DE TICKET, no encontro su ledger, imprimio un
// mensaje amable y salio 0. El criterio pasaba sin medir nada: un falso verde en el archivo que
// justamente existe para que no los haya.

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const cambios = require('../lib/carpeta-cambios')

const args = process.argv.slice(2)
const arg = args[0] || ''

if (arg === '--help' || arg === '-h') {
  console.log('Uso: node agro.js features [<TICKET> | <ruta.json> | --all | --gate [<TICKET>]]')
  console.log('Sin --gate es un informe y sale 0. Con --gate sale 1 si quedan fichas pendientes,')
  console.log('y 2 si no hay ledger que medir (que no es lo mismo que estar al dia).')
  process.exit(0)
}

// Un flag que la tool no conoce NO se puede tomar como nombre de ticket: asi es como "--gate" se
// convirtio en un falso verde. Cualquier argumento que empiece con "--" y no sea de los conocidos
// frena con 2.
const CONOCIDOS = new Set(['--all', '--gate', '--help', '-h'])
for (const a of args) {
  if (a.startsWith('-') && !CONOCIDOS.has(a)) {
    console.error(`no conozco la bandera "${a}". Uso: node agro.js features [<TICKET> | <ruta.json> | --all | --gate]`)
    process.exit(2)
  }
}

const GATE = args.includes('--gate')

// El orden en que se muestran las pendientes: lo critico arriba. Una categoria desconocida cae al
// final en vez de romper el orden.
const PESO = { critico: 0, alto: 1, resiliencia: 2, medio: 3, observabilidad: 4, rendimiento: 5, bajo: 6, calidad: 7 }

function reportar(ruta) {
  let d
  try { d = JSON.parse(fs.readFileSync(ruta, 'utf8')) } catch (e) {
    console.log('FEATURES.json invalido:', e.message)
    return 1
  }
  const fes = d.features || []
  const ok = fes.filter((x) => x.passes)

  // POSPUESTA: ni hecha ni pendiente de hoy. Nace del 24/08: dos fichas (ENVX, PASE-PROD) que no
  // se van a trabajar hasta que vuelva una tarea que las pida, y que en la lista de pendientes
  // eran ruido en cada arranque.
  //
  // Es un estado aparte y NO se cuenta como passing a proposito: darlas por buenas seria mentirle
  // al proximo, que lee este ledger para saber que falta. Se muestran en una linea, con el motivo,
  // para que "pospuesta" no se confunda con "olvidada".
  const pospuestas = fes.filter((x) => !x.passes && x.pospuesta)
  // CERRADA SIN IMPLEMENTAR: el dueño cerro el ticket con la ficha sin hacer y no se retoma (14/09:
  // los tickets sin carpeta de trabajo pasaron a historia). Tampoco es passing: no se hizo.
  const cerradas = fes.filter((x) => !x.passes && !x.pospuesta && x.cerrada_sin_implementar)
  // ARCHIVADA: no se trabaja hasta toparse con el problema (14/09: el backlog del loop entero, por
  // decision del dueño; la lista legible vive en ARCHIVADAS.md al lado del ledger). Se queda en el
  // ledger y no en otro archivo para que `gaps` no la vuelva a crear y los ids citados sigan
  // existiendo. Solo se cuenta: 51 lineas en cada arranque serian el ruido que se quiso sacar.
  const archivadas = fes.filter((x) => !x.passes && !x.pospuesta && !x.cerrada_sin_implementar && x.archivada)
  const pend = fes.filter((x) => !x.passes && !x.pospuesta && !x.cerrada_sin_implementar && !x.archivada)

  console.log(`FEATURES: ${ok.length}/${fes.length} passing` +
    (pospuestas.length ? `  (${pospuestas.length} pospuesta/s, no cuentan)` : '') +
    (cerradas.length ? `  (${cerradas.length} cerrada/s sin implementar, no cuentan)` : '') +
    (archivadas.length ? `  (${archivadas.length} archivada/s, no cuentan)` : ''))

  pend.sort((a, b) => (PESO[a.categoria] ?? 9) - (PESO[b.categoria] ?? 9))
  for (const x of pend.slice(0, 8)) {
    const desc = String(x.descripcion || '').split('. ')[0].slice(0, 100)
    console.log(`  [ ] ${x.id || '?'} (${x.categoria || ''}): ${desc}`)
  }
  if (pend.length > 8) console.log(`  ... y ${pend.length - 8} mas incompletas`)

  for (const x of pospuestas) {
    const p = x.pospuesta === true ? {} : x.pospuesta
    console.log(`  [~] ${x.id || '?'} POSPUESTA${p.desde ? ` (${p.desde})` : ''}: ${p.motivo || 'sin motivo escrito'}`)
  }
  // Con --gate el codigo de salida ES el veredicto: 1 si queda algo pendiente. Sin --gate sigue
  // siendo un informe y sale 0, que es como lo usan el lead y el reporte de arranque.
  return GATE && pend.length ? 1 : 0
}

function ramaActual() {
  try {
    return execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim()
  } catch { return '' }
}

if (arg === '--all') {
  const base = cambios.carpeta()
  let hubo = false
  const changes = fs.existsSync(base) ? fs.readdirSync(base).sort() : []
  for (const c of changes) {
    const f = path.join(base, c, 'FEATURES.json')
    if (!fs.existsSync(f)) continue
    hubo = true
    console.log(`== ${c} ==`)
    reportar(f)
  }
  if (!hubo) console.log(`no hay ningun ${base}/*/FEATURES.json (los tickets chicos pueden no tener ledger)`)
  process.exit(0)
}

// Compatibilidad: si el argumento es un archivo que existe, se usa tal cual.
if (arg && fs.existsSync(arg) && fs.statSync(arg).isFile()) {
  process.exit(reportar(arg))
}

// Parado en `main` el ticket es META: la mejora de las herramientas es una tarea como
// cualquier otra y tiene su propio ledger (<carpeta_cambios>/META/). Antes esto contestaba
// "no se detecto el ticket" y el backlog del loop vivia como prosa en el reporte del lead.
const LOOP = cambios.delLoop()
// El ticket es el primer argumento que NO sea una bandera: 'features --gate ICC-83' tiene que
// mirar ICC-83 y no caer a la rama actual.
const posicional = args.find((a) => !a.startsWith('-')) || ''
const rama = posicional || ramaActual()
const ticket = rama === 'main' ? LOOP : rama
if (!ticket) {
  console.log('no se detecto el ticket (rama actual vacia); pasa uno: node agro.js features <TICKET>')
  process.exit(0)
}

// Con barra normal a proposito: fs la acepta en Windows y la ruta que se imprime se puede pegar
// en un comando. path.join la volveria `<carpeta>\...`, que no sirve para eso.
const archivo = `${cambios.carpeta()}/${ticket}/FEATURES.json`
if (!fs.existsSync(archivo)) {
  const msg = `sin ledger para '${ticket}' (${archivo} no existe). Una tarea chica puede no tener ledger; los grandes lo crean.`
  if (GATE) {
    // Como compuerta, "no hay que medir" NO es "esta al dia".
    console.error(msg)
    process.exit(2)
  }
  console.log(msg)
  process.exit(0)
}
console.log(`Ticket: ${ticket}`)
process.exit(reportar(archivo))
