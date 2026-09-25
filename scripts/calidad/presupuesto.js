// presupuesto.js - mide los documentos que se leen en CADA arranque contra su tope.
//
// Uso: node agro.js presupuesto [--json] [--reorg] [--sin-delta] [--max N]
//
// Sale con 1 si alguno se paso. Rompe a proposito: la regla "AGENTS lean, max 500 lineas" estaba
// escrita desde el dia uno y el 12/08 el archivo tenia 892. Nadie la incumplio por descuido -se
// incumple porque agregar una linea tiene premio visible (no repetir un error) y sacarla no tiene
// ninguno-. Un aviso mas no cambia ese incentivo; un gate si.
//
// Que hacer cuando salta, en orden:
//   1. .aplica a TODA tarea? Si no, va a una skill, a un playbook o al aprendizajes.md del ticket.
//   2. .ya lo hace cumplir una tool? Entonces el texto es un duplicado que se va a pudrir.
//   3. .se puede GENERAR en vez de escribir? (un indice de tools no deberia escribirse a mano)
//   4. .sigue siendo cierto? Medirlo, no suponerlo.

const fs = require('fs')
const { spawnSync } = require('child_process')
const path = require('path')
const core = require('../lib/presupuesto-docs')

const RAIZ = process.cwd()
const argv = process.argv.slice(2)

const lineasDe = (rel) => {
  const abs = path.join(RAIZ, rel)
  if (!fs.existsSync(abs)) return null
  return fs.readFileSync(abs, 'utf8').split('\n').length
}

// La lista de documentos sale de `project.yml` si el proyecto la declara, y si no del default del
// core. Antes estaba clavada con los nombres de ESTE proyecto -apex.md, kove.md, el PROGRESO del
// META-, asi que llevar la tool a otro repo arrastraba nuestros archivos: medidos como
// "no existe" y sin medir los suyos. El presupuesto es del proyecto; la tool solo lo hace cumplir.
function leerPresupuesto(texto) {
  const doc = require('yaml').parse(texto)
  const lista = doc && doc.presupuesto
  if (!Array.isArray(lista) || !lista.length) return null
  return lista.map((x) => ({
    archivo: x.archivo,
    tope: Number(x.tope),
    porque: x.porque || '',
    ...(Number.isFinite(Number(x.maxCrecimiento)) ? { maxCrecimiento: Number(x.maxCrecimiento) } : {}),
  }))
}

// Si el proyecto no declara su presupuesto, esto NO cae a una lista de otro proyecto ni da verde:
// frena con codigo 2. Medir los archivos de otro repo es peor que no medir -los da por "no existe"
// y no mira ni uno de los propios-, y un gate que no encuentra su material y pasa es la familia de
// bugs que este loop ya tiene documentada.
function presupuestoDelProyecto() {
  const yml = path.join(RAIZ, 'project.yml')
  let lista = null
  try { if (fs.existsSync(yml)) lista = leerPresupuesto(fs.readFileSync(yml, 'utf8')) } catch { lista = null }
  if (lista) return lista
  console.error('project.yml no declara `presupuesto:`: no hay techos que medir (no es un OK).')
  console.error('Declara ahi los documentos que se leen en cada arranque, con su `tope` y su `porque`.')
  process.exit(2)
}

// El presupuesto TAL COMO estaba en la base de comparacion, para saber si un techo subio en este
// cambio. Si no se puede leer -sin git, o un project.yml que todavia no lo declaraba- se devuelve
// vacio y la comparacion no corre: se dice, no se inventa.
function presupuestoDeLaBase(base) {
  if (!base) return []
  try {
    const r = spawnSync('git', ['show', `${base}:project.yml`], { encoding: 'utf8' })
    if (r.status !== 0) return []
    return leerPresupuesto(r.stdout) || []
  } catch { return [] }
}

const PRESUPUESTO = presupuestoDelProyecto()
const medidos = PRESUPUESTO.map((p) => ({ archivo: p.archivo, lineas: lineasDe(p.archivo) }))
const r = core.evaluar(medidos, PRESUPUESTO)

if (argv.includes('--json')) {
  console.log(JSON.stringify(r, null, 2))
} else {
  console.log('==> presupuesto de los documentos de arranque')
  console.log(core.informe(r))
  if (!r.ok) {
    console.log('')
    console.log('Se lee TODO esto en cada tarea. Hay DOS salidas, y la segunda es legitima:')
    console.log('')
    console.log('A) SACAR contenido, en orden:')
    console.log('  1. lo que no aplica a toda tarea -> skill / playbook / aprendizajes del ticket')
    console.log('  2. lo que ya hace cumplir una tool -> el texto es un duplicado que se pudre')
    console.log('  3. lo que se puede generar -> generarlo (ej. el indice de tools)')
    console.log('  4. lo que ya no es cierto -> medirlo y corregirlo')
    console.log('')
    console.log('B) SUBIR el techo, si el contenido que hace falta de verdad no entra:')
    console.log('  editar su `tope` en project.yml Y reescribir su `porque`. Subirlo sin decir por')
    console.log('  que no pasa. Nunca lo elijas en medio de un merge: ahi se poda mal y se sube peor.')
  }
}

let salida = r.ok ? 0 : 1
// --- el delta: cuanto CRECIO cada documento en lo que todavia no esta en el remoto --------------
//
// La BASE es el merge-base con `origin/main`, y el diff va hasta el WORKTREE (no hasta HEAD): asi
// mide lo mismo antes y despues de commitear, que es lo que hace que el gate no se pueda saltear
// commiteando primero. Parado en main con todo pusheado, la base ES el HEAD y entonces mide lo
// suelto, que es exactamente lo que estas por commitear.
//
// Sin git -o sin remoto- el delta NO corre y se dice. No se inventa un verde.
function baseDeComparacion() {
  const ref = ['origin/main', 'main'].find((r) =>
    spawnSync('git', ['rev-parse', '--verify', '--quiet', r], { encoding: 'utf8' }).status === 0)
  if (!ref) return null
  const mb = spawnSync('git', ['merge-base', ref, 'HEAD'], { encoding: 'utf8' })
  if (mb.status !== 0) return null
  return mb.stdout.trim() || null
}

function crecimientoDesde(base) {
  const r = spawnSync('git', ['diff', '--numstat', base, '--', ...PRESUPUESTO.map((p) => p.archivo)],
    { encoding: 'utf8' })
  if (r.status !== 0) return null
  return String(r.stdout).split('\n').filter(Boolean).map((l) => {
    const [mas, menos, archivo] = l.split('\t')
    // Un binario viene con "-": no se mide en lineas.
    if (mas === '-' || menos === '-') return null
    return { archivo: archivo.replace(/\\/g, '/'), crecio: Number(mas) - Number(menos) }
  }).filter(Boolean)
}

// `--max N` pisa el maximo de crecimiento para ESTA corrida. Sin el, cada documento usa el suyo
// (`maxCrecimiento` en el presupuesto) y, si no tiene, el default del proyecto. Un `--max` con
// basura FRENA con codigo 2 en vez de caer al default en silencio: un gate que se ablanda solo
// porque le pasaste mal un flag es peor que no tenerlo.
const maxDeLaCorrida = (() => {
  const i = argv.indexOf('--max')
  if (i < 0) return undefined
  const n = Number(argv[i + 1])
  if (!Number.isFinite(n) || n < 0) {
    console.error(`--max necesita un numero >= 0: recibi "${argv[i + 1]}"`)
    process.exit(2)
  }
  return n
})()

if (!argv.includes('--sin-delta')) {
  console.log('')
  console.log('==> crecimiento contra origin/main (el detalle va al archivo hermano)')
  const base = baseDeComparacion()
  const medidos = base ? crecimientoDesde(base) : null

  if (!medidos) {
    console.log('  ·  sin git o sin base: el delta NO se midio')
  } else if (argv.includes('--reorg')) {
    const d = core.evaluarDelta(medidos, { tope: maxDeLaCorrida, presupuesto: PRESUPUESTO })
    console.log(core.informeDelta({ ...d, excedidos: [] }))
    console.log('  (--reorg: es una reorganizacion, el crecimiento no frena)')
  } else {
    const d = core.evaluarDelta(medidos, { tope: maxDeLaCorrida, presupuesto: PRESUPUESTO })
    console.log(core.informeDelta(d))
    if (!d.ok) {
      console.log('')
      console.log('Un aprendizaje nuevo entra como UNA fila de indice y el detalle nace en el hermano:')
      console.log('  db.md -> db-hechos.md / db-consultas.md      apex.md -> apex-recetas.md / apex-hechos.md')
      console.log('  kove.md -> kove-hechos.md                     MEMORY.md -> memory/hechos/<nombre>.md')
      console.log('Si de verdad estas reorganizando (moviendo secciones), repetí con --reorg.')
      salida = 1
    }
  }
}

// --- .subio algun techo en este cambio? ---------------------------------------------------------
// Subir un techo es una salida valida (ver el mensaje de arriba), pero tiene un precio: decir por
// que. Se compara el project.yml de AHORA contra el de la base; si un tope crecio y su `porque`
// quedo igual, esto rompe.
{
  const base = baseDeComparacion()
  const s = core.evaluarSubidas(PRESUPUESTO, presupuestoDeLaBase(base))
  if (s.subidas.length) {
    console.log('')
    console.log('==> techos que subieron en este cambio')
    console.log(core.informeSubidas(s))
    if (!s.ok) salida = 1
  }
}

process.exit(salida)
