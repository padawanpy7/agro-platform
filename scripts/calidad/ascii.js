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

const EXTENSIONES = ['.md', '.yml', '.yaml']
const PODAR = new Set(['node_modules', '.git'])

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
for (const f of archivos) {
  let src
  try { src = fs.readFileSync(f, 'utf8') } catch { continue }
  const res = convertir(src)
  if (res === src) continue
  n++
  if (modo === '--fix') fs.writeFileSync(f, res)
}

console.log(`${modo === '--fix' ? 'convertidos' : 'a convertir'}: ${n}`)
console.log('Convierte em/en dash, comillas tipograficas, flechas, ellipsis -> ASCII. ' +
  'Mantiene acentos y enie del espaniol.')

// --check no falla: es informativo, igual que antes. Lo que gatea la prosa es el humano que lee
// el numero; convertirlo en error rompe corridas por un guion largo en un documento del analista.
