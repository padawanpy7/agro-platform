// Pasa la prosa a ASCII: em/en dash, comillas tipograficas, flechas, ellipsis. MANTIENE los
// acentos y la enie del español -no es "sacar todo lo no-ASCII", es sacar lo que se cuela al
// copiar y pegar de un PDF o de un chat-.
//
// Uso: node agro.js ascii [--check|--fix] [rutas...]     (default: --check sobre .)
//
// Portado de bash+python el 10/08. Lo hacia `scripts/_ascii.py` a traves de `_python.sh`; son
// diecisiete reemplazos de texto, asi que no hay motivo para arrastrar un interprete entero.
// De paso desaparece el modo de fallo que el propio .sh documentaba: llamar a `python3` pelado
// hacia que el stub de la Microsoft Store abortara el gate y saliera 0, o sea verde en falso.

const fs = require('fs')
const path = require('path')

const REEMPLAZOS = [
  ['—', '-'],   // em dash
  ['–', '-'],   // en dash
  ['‒', '-'],   // figure dash
  ['―', '-'],   // horizontal bar
  ['→', '->'],  // flecha derecha
  ['←', '<-'],  // flecha izquierda
  ['“', '"'], ['”', '"'], ['„', '"'],
  ['‘', "'"], ['’', "'"], ['‚', "'"],
  ['…', '...'],
  [' ', ' '],   // espacio duro
  ['•', '-'],   // bullet
  ['·', '-'],   // punto medio
  ['✓', 'OK'], ['✅', 'OK'], ['❌', 'X'],
]

// Extendido el 29/09/2026: el repo dejo de ser solo documentos. El guion largo se cuela igual en
// un comentario de SQL o en el texto de una pantalla, y ahi molesta mas -- en una terminal o en un
// `psql` sale como basura.
//
// `.js` NO ENTRA, y la razon es que esta herramienta se rompio a si misma al intentarlo: su propia
// tabla de reemplazos CONTIENE los caracteres que reemplaza, asi que se auto-convirtio y dejo de
// parsear. Los scripts del loop tampoco son nuestros para reformatear.
const EXTENSIONES = ['.md', '.yml', '.yaml', '.sql', '.sh', '.py', '.html', '.ts', '.tsx']

// `crudo` NO SE TOCA: son capturas VERBATIM de sitios externos, o sea evidencia. Convertirles la
// tipografia es editar la fuente, y despues no se puede distinguir lo que decia el original de lo
// que le hicimos nosotros. `diagramas` tampoco: viene copiado de infra-platform y se re-copia, asi
// que editarlo aca solo crea deriva.
const PODAR = new Set(['node_modules', '.git', '.venv', 'crudo', 'diagramas'])

function convertir(s) {
  for (const [de, a] of REEMPLAZOS) s = s.split(de).join(a)
  return s
}

function juntar(destino, acc = []) {
  let st
  try { st = fs.statSync(destino) } catch { return acc }
  if (!st.isDirectory()) { acc.push(destino); return acc }
  for (const e of fs.readdirSync(destino, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!PODAR.has(e.name)) juntar(path.join(destino, e.name), acc)
    } else if (EXTENSIONES.includes(path.extname(e.name).toLowerCase())) {
      acc.push(path.join(destino, e.name))
    }
  }
  return acc
}

const args = process.argv.slice(2)
if (args[0] === '--help' || args[0] === '-h') {
  console.log('Uso: node agro.js ascii [--check|--fix] [rutas...]   (default: --check sobre .)')
  process.exit(0)
}

let modo = '--check'
const destinos = []
for (const a of args) {
  if (a === '--fix' || a === '--check') modo = a
  else destinos.push(a)
}
if (!destinos.length) destinos.push('.')

const archivos = destinos.flatMap((d) => juntar(d))

let n = 0
const tocados = []
for (const f of archivos) {
  let src
  try { src = fs.readFileSync(f, 'utf8') } catch { continue }
  const res = convertir(src)
  if (res === src) continue
  n++
  tocados.push(path.relative(process.cwd(), f))
  if (modo === '--fix') fs.writeFileSync(f, res)
}

console.log(`${modo === '--fix' ? 'convertidos' : 'a convertir'}: ${n}`)
// Un gate que dice "1 a convertir" y no dice CUAL no sirve para nada: manda a buscar a mano.
for (const t of tocados) console.log(`  ${t}`)
if (n && modo === '--check') console.log('  arreglalo con: node agro.js ascii --fix')

// --check AHORA FALLA (29/09/2026). Antes salia 0 siempre y por eso nunca se pudo enchufar a
// `check`: era un informe que nadie leia -- el "techo que nadie mide" de AGENTS.md §7.
//
// El comentario anterior justificaba no fallar asi: "rompe corridas por un guion largo en un
// documento del analista". ESA PREOCUPACION ERA CORRECTA y quedo resuelta por otro lado: `crudo`
// -- las capturas verbatim de sitios externos -- esta en PODAR, junto con `diagramas`, que viene
// copiado de otro repo. O sea que lo unico que este gate mira ya es lo que escribimos nosotros, y
// sobre lo nuestro si corresponde fallar.
if (n && modo === '--check') process.exit(1)
