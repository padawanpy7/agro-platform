#!/usr/bin/env node
// agro.js - el punto de entrada UNICO del loop.  `node agro.js <tool> [argumentos]`
//
// Por que existe: hasta el 10/08 cada tool era un wrapper .sh que resolvia node, cargaba el
// entorno y hacia `exec node scripts/<area>/<tool>.js`. Eso costaba un proceso de shell entero
// por invocacion (~650-1500 ms en Git Bash sobre Windows) y, sobre todo, dejaba las
// preocupaciones transversales -el .env, la telemetria, el manejo de errores- repartidas entre
// 56 archivos de bash y 4 copias de la misma expresion regular.
//
// Aca hay UN proceso y UN lugar donde:
//   - se ubica la raiz del repo y se hace cd (todas las tools asumen que corren desde ahi),
//   - se carga el .env (antes lo parseaba cada lib por su cuenta),
//   - se registra el uso Y el resultado de cada corrida (metrics/), con duracion,
//   - un error termina en un mensaje legible con su codigo de salida, no en un stack pelado.
//
// Las tools NO se tocaron para esto: las 35 corren su logica al requerirse y leen
// `process.argv.slice(2)`, asi que se reescribe argv antes de cargarlas y ven exactamente lo
// mismo que veian cuando las lanzaba el .sh.

const fs = require('fs')
const path = require('path')

const RAIZ = __dirname
process.chdir(RAIZ)

// --- .env -------------------------------------------------------------------------------
// Una sola copia: antes vivia repetida en cuatro tools, o sea cuatro lugares donde arreglar el
// mismo bug. Lo que ya viene en el ambiente gana, para poder pisar una variable en una corrida
// puntual sin editar el archivo.
function cargarEnv() {
  const archivo = path.join(RAIZ, '.env')
  if (!fs.existsSync(archivo)) return
  for (const linea of fs.readFileSync(archivo, 'utf8').split('\n')) {
    const m = linea.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  alias()
}

// Las rutas y URLs por entorno viven en `entornos.yml`; lo que ya viene en el ambiente gana. Las
// CREDENCIALES no se derivan ni se aliasan: van en `.env` con su nombre real. El bloque anterior
// derivaba usuarios, DSN y workspaces de Oracle/APEX/Kove del banco y se saco el 25/09/2026 junto
// con esas tools.
function alias() {
  let entornos
  try { entornos = require('./scripts/lib/entornos') } catch { return }
  try {
    const apps = entornos.leer().apps || {}
    for (const [variable, valor] of Object.entries(apps.env || {})) {
      if (valor && !process.env[variable]) process.env[variable] = String(valor)
    }
  } catch { /* sin entornos.yml se sigue con lo que haya en .env */ }
}

// El registro vive en lib/ porque lo comparte tool-usage: "que tools hay" tiene que contestarse
// en UN solo lugar, o la lista del dispatcher y la del contador se desincronizan.
const { descubrirTools: descubrir, areaDe } = require('./scripts/lib/tools-registro')
const descubrirTools = () => descubrir(RAIZ)

// Nombres de uso que no coinciden con el nombre del archivo. Vacio hoy: el unico alias que habia
// (`lint` -> `plsql-lint`) apuntaba a una tool que ya no existe, y un alias a la nada hace que el
// dispatcher diga "no conozco la tool" sobre un nombre que SI esta en project.yml.
const ALIAS = {}

// --- telemetria --------------------------------------------------------------------------
// Dos archivos a proposito:
//   tool-usage.log  el contador historico, DOS columnas. No se le agregan campos: lo parsea
//                   tool-usage.sh y sumarle columnas rompe el contador de meses anteriores.
//   tool-runs.log   lo nuevo: como TERMINO cada corrida y cuanto tardo. Sin esto, "optimizar
//                   las tools" se hace a ojo -se sabia cuantas veces se usa cada una, nunca
//                   cuanto cuesta-.
const METRICAS = path.join(RAIZ, 'metrics')

function registrar(archivo, linea) {
  try {
    fs.mkdirSync(METRICAS, { recursive: true })
    fs.appendFileSync(path.join(METRICAS, archivo), linea + '\n')
  } catch { /* la telemetria NUNCA hace fallar al tool */ }
}

const sello = () => new Date().toISOString().slice(0, 19)

function ayuda(tools) {
  console.log('Uso: node agro.js <tool> [argumentos]\n')
  const porArea = new Map()
  for (const [nombre, ruta] of tools) {
    const area = areaDe(ruta)
    if (!porArea.has(area)) porArea.set(area, [])
    porArea.get(area).push(nombre)
  }
  for (const area of [...porArea.keys()].sort()) {
    console.log(`  ${area}`)
    console.log('    ' + porArea.get(area).sort().join('  '))
  }
  console.log('\n  node agro.js <tool> --help    la ayuda de esa tool')
  console.log('  AGRO_DEBUG=1                  stack completo cuando algo revienta')
}

// Un nombre que no existe casi siempre es un dedazo: se ofrece el candidato mas parecido en vez
// de un "no existe" pelado que obliga a ir a buscar la lista.
function parecido(nombre, tools) {
  const cand = [...tools.keys()]
  const exacto = cand.filter((t) => t.includes(nombre) || nombre.includes(t))
  return exacto.length ? exacto : cand.filter((t) => t[0] === nombre[0])
}

function main() {
  const tools = descubrirTools()
  const [nombre, ...args] = process.argv.slice(2)

  if (!nombre || nombre === '--help' || nombre === '-h') { ayuda(tools); process.exit(nombre ? 0 : 2) }

  const ruta = tools.get(ALIAS[nombre] || nombre)
  if (!ruta) {
    console.error(`no conozco la tool "${nombre}".`)
    const cerca = parecido(nombre, tools)
    if (cerca.length) console.error('¿quisiste decir? ' + cerca.slice(0, 5).join(', '))
    console.error('la lista completa: node agro.js')
    process.exit(2)
  }

  cargarEnv()

  // Los browsers viven fuera del repo (mismo patron portable que el resto de las tools). Antes lo
  // exportaba cada .sh de navegador por separado; aca se pone una vez y lo ven todas.
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(path.dirname(RAIZ), 'tools', 'playwright-browsers')
  }

  registrar('tool-usage.log', `${sello()}\t${nombre}`)

  // Quien lanzo esta corrida. Se hereda por el entorno: los hijos que spawnea una tool (check
  // spawnea `node agro.js lint`, `test-js`, ...) ven aca el nombre del padre. Sin esto, el
  // ranking de "donde se va el tiempo" cuenta dos veces lo mismo y manda a optimizar la tool
  // equivocada.
  const padre = process.env.AGRO_TOOL_PADRE || ''
  process.env.AGRO_TOOL_PADRE = nombre

  const arranque = Date.now()
  let cerrado = false
  const cerrar = (codigo, detalle) => {
    if (cerrado) return
    cerrado = true
    // Los campos se aplanan: el log es UNA LINEA POR CORRIDA y un argumento con saltos -un SELECT
    // pasado con -e, que es lo mas comun de `db-sql`- rompia esa promesa en silencio. Medido el
    // 31/08 al agrupar los fallos por primera vez: 194 de 4.077 lineas eran pedazos de SQL
    // sueltos, sin fecha ni tool, y el agrupador los leia como una tool llamada "select".
    const plano = (v) => String(v == null ? '' : v).replace(/[\t\r\n]+/g, ' ').trim()
    registrar('tool-runs.log',
      [sello(), nombre, codigo, Date.now() - arranque, plano(args.join(' ')), plano(detalle), padre].join('\t'))
  }

  const fallar = (e) => {
    const msg = (e && e.message) || String(e)
    console.error(`\n✗ ${nombre}: ${msg}`)
    if (process.env.AGRO_DEBUG === '1' && e && e.stack) console.error(e.stack)
    else if (e && e.stack) console.error('   (AGRO_DEBUG=1 para ver el stack)')
    cerrar(1, msg.split('\n')[0].slice(0, 200))
    process.exit(1)
  }

  // Las tools son async y muchas no atrapan nada: sin esto un `await` que revienta sale como
  // "UnhandledPromiseRejection" con un stack de node adentro y sin decir que tool fue.
  process.on('uncaughtException', fallar)
  process.on('unhandledRejection', fallar)

  // PEDIR AYUDA NO ES UN ERROR. Casi todas las tools imprimen su "Uso:" y salen con 2 cuando les
  // faltan argumentos, y `--help` cae por ese mismo camino: el que pide ayuda la recibe, pero el
  // shell -y el log- ven un fallo. Medido el 31/08 al agrupar `tool-runs.log`: 53 corridas de
  // ocho tools distintas contadas como fallo eran gente pidiendo ayuda. Se corrige aca, en el
  // dispatcher, y no tool por tool: es una convencion del loop, no de cada script.
  const pidioAyuda = args.includes('--help') || args.includes('-h')
  process.on('exit', (codigo) => {
    if (pidioAyuda && codigo !== 0) {
      cerrar(0, 'ayuda')
      process.exitCode = 0
      return
    }
    cerrar(codigo)
  })

  // La tool tiene que ver el argv que veia cuando la lanzaba el .sh: `process.argv[1]` su propia
  // ruta y de ahi en adelante SUS argumentos. Sin esto, `slice(2)` le devuelve su propio nombre
  // como primer argumento.
  process.argv = [process.argv[0], ruta, ...args]

  try { require(ruta) } catch (e) { fallar(e) }
}

main()
