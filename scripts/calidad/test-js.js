// Corre la suite de UNIDAD del loop (scripts/lib/*.test.js): logica pura, sin BD, sin
// navegador y sin red. Cierra el hueco medido por el dueño: node --test solo corria si un
// humano lo tipeaba a mano, package.json todavia tenia el stub por default
// ("no test specified") y check.js no lo invocaba en ningun lado -un test que nadie corre es lo
// mismo que no tener tests, y asi llego un test falso verde a main sin que ningun gate lo note.
//
// NO CONFUNDIR con los tests que corren CONTRA infraestructura real (base de datos, navegador):
// esos necesitan .env y conectividad y viven en `project.yml -> commands.test` cuando el
// proyecto los declare. Esto corre los tests de JS del loop (scripts/lib/*.test.js), sin
// credenciales ni conectividad -por eso, y solo esto, entra en `check`, que tiene que poder
// correr en una maquina sin credenciales (AGENTS.md §10).
//
// Uso: node agro.js test-js
//
// Que NO entra: los tests end-to-end que necesitan navegador o base de datos real. Esa division
// es la politica del proyecto (AGENTS §10): estaticos en check, infraestructura real en el
// verifier.
//
// --test-isolation=none (node 24): sin esto, el runner arranca UN PROCESO POR ARCHIVO -medido
// (work/loop-tests-en-check.md): ~700ms de arranque por archivo, 37 archivos, ~25s de puro
// spawn contra ~5s de trabajo real de los 470+ asserts. Con el flag los 37 archivos corren
// adentro del MISMO proceso: 470 tests, mismo resultado (comparado test por test, dos formas de
// correr, cero diferencias), 5x mas rapido. El precio es que comparten proceso: un test que
// ensuciara env/cwd/require.cache/un modulo con estado global podria pasar solo y fallar en
// grupo. Ninguno de los `scripts/lib/*.test.js` de hoy toca eso (sin `process.env`, sin
// `process.chdir`, sin `require.cache`, sin `mock.`, sin hooks `before`/`after`); si mañana
// alguno lo necesita, aislalo aparte en vez de forzar este modo.

const fs = require('fs')
const { spawnSync } = require('child_process')

const RAIZ = process.cwd()
const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.log('Uso: node agro.js test-js')
  console.log('  corre `node --test` sobre scripts/lib/*.test.js: unidad pura, sin BD ni navegador.')
  console.log('  no confundir con los tests que corren contra infraestructura real (BD, navegador).')
  process.exit(0)
}

const archivos = fs.globSync('scripts/lib/*.test.js', { cwd: RAIZ })
if (!archivos.length) {
  console.error('FALLO: no encontre ningun scripts/lib/*.test.js')
  process.exit(2)
}

console.log(`==> test-js: ${archivos.length} archivo(s) en scripts/lib/\n`)

// --test-isolation=none es de node 24. En 22 el flag no existe y node aborta con "bad option",
// asi que se detecta antes de usarlo en vez de asumirlo (portado de infra-platform, 25/09/2026).
const soportaIsolation = spawnSync(process.execPath, ['--test-isolation=none', '-e', '0']).status === 0
const flags = soportaIsolation ? ['--test-isolation=none', '--test'] : ['--test']
if (!soportaIsolation) console.log('  (node ' + process.version + ' sin --test-isolation: un proceso por archivo, mas lento)')

const r = spawnSync(process.execPath, [...flags, ...archivos], { cwd: RAIZ, stdio: 'inherit' })
process.exit(r.status === null ? 2 : r.status)
