#!/usr/bin/env node
// spell.js -- ortografia es+en sobre LO QUE VE EL USUARIO.
//
// POR QUE EXISTE: el front habla espanol y una palabra mal escrita en una pantalla la ve el
// cliente. El codigo esta en ingles y no se revisa aca; lo que se revisa es el TEXTO.
//
// POR QUE NO ESTA EN `check`: baja cspell con `npx` y necesita red. Meterlo en el gate de cada
// corrida la vuelve lenta y la rompe sin internet. Se corre a mano y antes de mostrar una pantalla.
//
// Uso:  node agro.js spell [rutas...]
//
// Por cada palabra desconocida, EN ESTE ORDEN:
//   1) es un typo -> arreglalo.
//   2) el diccionario no la trae -> usa un SINONIMO que si este.
//   3) recien si no hay sinonimo (nombre propio, jerga del campo) -> agregala a cspell.json.
// El orden importa: agregar al diccionario es la salida facil y la que deja pasar los typos.

const { spawnSync } = require('child_process')
const path = require('path')
const RAIZ = path.resolve(__dirname, '../..')

const args = process.argv.slice(2)
if (args[0] === '--help' || args[0] === '-h') {
  console.log('Uso: node agro.js spell [rutas...]   (default: lo que se muestra en el front)')
  process.exit(0)
}

// SOLO LO QUE VE EL USUARIO, y eso es MENOS de lo que parece.
//
// LA DISTINCION QUE IMPORTA, descubierta al correrlo la primera vez: este repo escribe los
// documentos internos en ESPANOL SIN ACENTOS (convencion ASCII), y el diccionario espaniol los
// exige -- "calibracion" le sale desconocida porque la correcta es "calibracion" con tilde. Apuntar
// este gate a los documentos internos daria cientos de falsos positivos y se apagaria en una semana.
//
// LA REGLA QUE SALE DE AHI, y vale para todo el proyecto:
//   documento interno  -> espaniol sin acentos, estilo ASCII. NO pasa por el spell.
//   texto de pantalla  -> espaniol CORRECTO, con acentos. SI pasa por el spell.
// Un capataz leyendo "calibracion" sin tilde en el telefono ve un producto descuidado. En un
// comentario de SQL no lo ve nadie.
//
// (La tool `ascii` no pelea con esto: convierte tipografia -- guiones, comillas -- y **mantiene los
// acentos**.)
//
// HOY NO HAY NADA QUE REVISAR, y esta bien que lo diga en vez de revisar de mas: el front no
// existe todavia. Se probo apuntarlo a `pantallas.md` y marcaba NOMBRES DE TABLA -- `medicion`,
// `calibracion` -- que son identificadores y no prosa. Un gate que grita sobre identificadores se
// apaga en una semana.
const DEFECTO = [
  'web/**/locales/**/*.json',
  'web/**/messages/**/*.json',
]
const objetivos = args.length ? args : DEFECTO

console.log(`==> spell (es,en): ${objetivos.join(' ')}`)
const r = spawnSync('npx', [
  '-y', '-p', 'cspell@latest', '-p', '@cspell/dict-es-es',
  'cspell', '--no-progress', '--gitignore', '--config', 'cspell.json', ...objetivos,
], { cwd: RAIZ, stdio: 'inherit', shell: false })

if (r.status !== 0) {
  console.log('')
  console.log('Por cada palabra: 1) arregla el typo; 2) si el diccionario no la trae, usa un')
  console.log('SINONIMO que si; 3) SOLO si no hay sinonimo (nombre propio o jerga del campo),')
  console.log('agregala a cspell.json -> "words". El orden importa.')
}
process.exit(r.status ?? 1)
