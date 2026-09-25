// El chequeo que corre el implementer AL TERMINAR una tarea: format, lint, build, secretos y
// audit de dependencias.
//
// Uso: node agro.js check [--todos] [--serie] [ruta...]
//   sin nada    gatea SOLO lo que cambio contra main (lo commiteado en la rama + lo que esta
//               sin commitear). Es el modo de trabajo: esperar tres minutos y medio por un
//               cambio de dos archivos hace que el gate se saltee.
//   --todos     el repo entero (lo que hacia siempre hasta el 10/08)
//   ruta...     gatea esas rutas y nada mas
//   --serie     uno detras de otro, para leer la salida sin mezclar cuando algo falla raro
//
// DOS PRINCIPIOS que no se negocian:
//   1. Un gate que NO PUEDE CORRER no es un gate que pasa. Si falta la herramienta, esto falla
//      ruidoso; nunca se saltea en silencio.
//   2. Si no se pudo determinar QUE cambio, se gatea TODO. Ante la duda, de mas.

const fs = require('fs')
const path = require('path')
const { spawn, spawnSync, execFileSync } = require('child_process')
const { veredicto: veredictoFinal } = require('../lib/check-veredicto')

const RAIZ = process.cwd()
const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.log('Uso: node agro.js check [--todos] [--serie] [ruta...]')
  console.log('  sin nada   solo lo que cambio contra main')
  console.log('  --todos    el repo entero')
  console.log('  --serie    un gate por vez (para leer la salida sin mezclar)')
  process.exit(0)
}

const TODOS = args.includes('--todos')
const SERIE = args.includes('--serie')
const RUTAS = args.filter((a) => !a.startsWith('--'))

// --- que se gatea -----------------------------------------------------------------------------
const CAPACIDAD = 64 * 1024 * 1024
// stderr a 'pipe': el helper ya convierte el fallo en null y el llamador decide. Sin esto, git
// escribe su `fatal:` en la salida del gate y se lee como si el gate estuviera roto. Medido el
// 17/08, despues de la reescritura de historia: el puntero de gitleaks apuntaba a un commit que
// dejo de existir y el `merge-base --is-ancestor` imprimia "fatal: Not a valid commit name ..."
// arriba de todo, cuando el fallback a escaneo completo estaba funcionando exactamente como debe.
const git = (...a) => {
  try {
    return execFileSync('git', a, { encoding: 'utf8', maxBuffer: CAPACIDAD, stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  } catch { return null }
}

// SIN trim. `git status --porcelain` codifica el estado en las DOS PRIMERAS COLUMNAS, y la de
// working tree es la segunda: una linea modificada empieza con espacio (" M archivo"). Un .trim()
// se come ese espacio, el slice(3) queda corrido un caracter y el path sale mordido
// ("emory/playbooks/db.md") -que despues no existe y se descarta en silencio-. Resultado: el
// PRIMER archivo modificado nunca se gateaba.
const gitCrudo = (...a) => {
  try { return execFileSync('git', a, { encoding: 'utf8', maxBuffer: CAPACIDAD }) } catch { return null }
}

// Lo commiteado en la rama MAS lo que todavia no se commiteo: las dos cosas son "mi cambio".
// Un `git diff main` solo se olvida de lo que estas escribiendo ahora, que es justo lo que
// queres gatear.
function cambiados() {
  const base = git('merge-base', 'main', 'HEAD')
  const partes = [
    base ? git('diff', '--name-only', base, 'HEAD') : null,
    gitCrudo('status', '--porcelain'),
  ]
  if (partes.some((p) => p === null)) return null // sin git no se puede saber: se gatea todo
  const archivos = new Set()
  for (const l of (partes[0] || '').split('\n')) if (l.trim()) archivos.add(l.trim())
  for (const l of (partes[1] || '').split('\n')) {
    const f = l.slice(3).trim()
    if (f) archivos.add(f.includes(' -> ') ? f.split(' -> ')[1] : f)
  }
  return [...archivos].filter((f) => fs.existsSync(f))
}

let alcance
if (RUTAS.length) alcance = { modo: 'rutas', archivos: RUTAS }
else if (TODOS) alcance = { modo: 'todo', archivos: null }
else {
  const c = cambiados()
  alcance = c === null
    ? { modo: 'todo', archivos: null, motivo: 'no pude preguntarle a git que cambio' }
    : { modo: 'cambios', archivos: c }
}

const conExt = (exts) => (alcance.archivos || []).filter((f) => exts.some((e) => f.toLowerCase().endsWith(e)))
const PY_TS = alcance.archivos ? conExt(['.py', '.ts', '.tsx', '.js', '.jsx']) : null
const PROSA = alcance.archivos ? conExt(['.md']) : null

console.log(`==> check: ${alcance.modo === 'todo'
  ? 'el repo ENTERO' + (alcance.motivo ? ` (${alcance.motivo})` : '')
  : `${alcance.archivos.length} archivo(s) ${alcance.modo === 'rutas' ? 'pedidos' : 'cambiados contra main'}` +
    ` -> ${PY_TS.length} de codigo, ${PROSA.length} .md`}`)
if (alcance.modo === 'cambios' && !alcance.archivos.length) {
  console.log('    (no cambio nada: no hay nada que gatear. Usa --todos para el repo entero.)')
}

// --- los gates ----------------------------------------------------------------------------
// Cada uno declara como corre y como se juzga. `saltea` explica POR QUE no corre, cuando no corre:
// un gate ausente sin motivo escrito se lee como un gate que paso.
function comandoDe(clave) {
  let yml = ''
  try { yml = fs.readFileSync('project.yml', 'utf8') } catch { return '' }
  const bloque = yml.split(/^commands:\s*$/m)[1]
  if (!bloque) return ''
  const m = bloque.split(/^\S/m)[0].match(new RegExp(`^\\s+${clave}:\\s*(.*)$`, 'm'))
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : ''
}

function buscarGitleaks() {
  if (!spawnSync('gitleaks', ['version'], { encoding: 'utf8' }).error) return 'gitleaks'
  const tools = path.join(path.dirname(RAIZ), 'tools')
  if (!fs.existsSync(tools)) return null
  const dir = fs.readdirSync(tools).filter((d) => d.startsWith('gitleaks-')).sort().pop()
  const exe = dir && path.join(tools, dir, 'gitleaks.exe')
  return exe && fs.existsSync(exe) ? exe : null
}

const bf = (...a) => ({ cmd: process.execPath, args: ['agro.js', ...a] })

function armarGates() {
  const gates = []
  const gl = buscarGitleaks()

  // Nunca se saltea: cuesta leer tres archivos y mide lo que TODA tarea paga al arrancar. Si se
  // saltea cuando "no cambio nada", el dia que crece nadie se entera.
  gates.push({ nombre: 'presupuesto de docs', ...bf('presupuesto') })

  // Tampoco se saltea, y por el mismo motivo que el presupuesto: lo que rompe la memoria no es el
  // commit que la toca, es cualquier commit que MUEVE un archivo que un hecho citaba. El 31/08
  // mover uno dejo 8 punteros rotos -uno dentro de un script que corre- y al encender el gate
  // aparecieron otros 40. Lee 262 archivos de texto: son milisegundos.
  gates.push({ nombre: 'memoria (hechos)', ...bf('hechos') })

  // Los gates del STACK se declaran en `project.yml` (bloque `commands:`), no se clavan aca. Asi
  // el dia que exista codigo del agro se prenden llenando el yml, y mientras tanto el gate dice
  // "no hay comando declarado" en vez de dar verde por no haber mirado nada. Reemplazan a los tres
  // gates de Oracle del repo de origen (`lint` de SQL, `plsql-compila`, `plsql-test`), que se
  // sacaron el 25/09/2026 junto con sus tools.
  for (const [clave, nombre] of [['lint', 'lint'], ['build', 'build'], ['test', 'tests del stack']]) {
    const cmd = comandoDe(clave)
    gates.push(cmd
      ? { nombre, cmd, args: [], shell: true }
      : { nombre, instant: true, saltea: `sin comando '${clave}' en project.yml` })
  }

  // Nunca se saltea, aunque el cambio no toque scripts/lib/: es la unica forma de que los tests
  // que antes SOLO corrian si un humano tipeaba `node --test` a mano corran de verdad en cada
  // `check`. Un gate salteable por "no cambio nada de lib" es el mismo agujero que dejo pasar un
  // test falso verde a main. Corre scripts/lib/*.test.js: unidad pura, sin BD ni navegador.
  gates.push({ nombre: 'tests del loop (test-js)', ...bf('test-js') })

  // gitleaks no es por archivo: escanea HISTORIA. En modo completo son 845 commits / 34 MB y 36 s,
  // y pagarlos por un cambio de dos archivos es lo que hace que uno deje de correr el gate.
  // `merge-base(main,HEAD)` solo acota algo parado en una RAMA que diverge de main: parado EN
  // main (que es como se trabaja la mayor parte del tiempo en este repo) da HEAD mismo, y el
  // rango sale vacio de casualidad -o completo si el calculo fallara-, sin ahorrar nada de forma
  // sostenida. Por eso el rango sale de un PUNTERO propio: el ultimo commit que efectivamente se
  // escaneo (con exito, se pise donde se pise), guardado en disco -no versionado, mismo patron
  // que `metrics/tool-usage.log`- y actualizado despues de cada corrida que gitleaks termina.
  // `protect` cubre aparte lo que todavia no se commiteo.
  const { decidirRango } = require('../lib/gitleaks-rango')
  const puntero = leerPunteroGitleaks()
  const punteroEsAncestro = !!puntero && git('merge-base', '--is-ancestor', puntero, 'HEAD') !== null
  const decisionRango = decidirRango({ todos: TODOS, puntero, punteroEsAncestro })
  const argsGl = decisionRango.completo
    ? ['detect', '--no-banner', '--redact']
    : ['detect', '--no-banner', '--redact', '--log-opts', decisionRango.rango]

  gates.push(gl
    ? { nombre: 'secretos (gitleaks)', cmd: gl, args: argsGl,
      juzgar: (salida, status) => status === 0 ? { ok: true }
        : /FTL/i.test(salida) ? { ok: false, nota: 'gitleaks no pudo correr' }
          : { ok: false, nota: `POSIBLE SECRETO (exit ${status})` } }
    : { nombre: 'secretos (gitleaks)', roto: 'no esta instalado. Bajalo (portable, sin admin) a ' +
        '../tools/gitleaks-<version>/ desde https://github.com/gitleaks/gitleaks/releases' })

  // Complementa a gitleaks: sus reglas por defecto no atrapan un LITERAL bajo una clave que
  // suena a credencial en un archivo de config (ICC visto el 05/08, ver secretos-literales.js).
  // Acotado a lo que cambio, igual que lint/build: si no toco ningun .json/.env/.yml, no hay
  // nada nuevo que mirar.
  // Marcadores de conflicto y JSON roto. Nunca se saltea por "no cambio nada": lo que rompe un
  // merge son justo los archivos compartidos, y el que mergea no siempre es el que los toco.
  // Paso dos veces el 26/08 sobre FEATURES.json y PROGRESO.md del META, y no lo cazo nada.
  const integridad = require('../lib/integridad-archivos')
  const VERSIONADOS = alcance.archivos || (git('ls-files') || '').split('\n').filter(Boolean)
  gates.push({
    nombre: 'conflictos y json roto',
    instant: true,
    ...juzgarIntegridad(integridad, VERSIONADOS),
  })

  const secretosLiterales = require('../lib/secretos-literales')
  const CONFIG = alcance.archivos
    ? conExt(secretosLiterales.EXTENSIONES)
    : (git('ls-files') || '').split('\n')
      .filter((f) => secretosLiterales.EXTENSIONES.some((e) => f.toLowerCase().endsWith(e)))
  gates.push({
    nombre: 'secretos (config literal)',
    instant: true,
    saltea: alcance.archivos && !CONFIG.length ? 'ningun archivo de config cambio' : null,
    ...juzgarSecretosLiterales(secretosLiterales, CONFIG),
  })

  // Solo si cambio el lockfile: auditar dependencias que no se tocaron es tiempo regalado.
  const lockCambio = !alcance.archivos || alcance.archivos.some((f) => /package(-lock)?\.json$/.test(f))
  if (fs.existsSync('package-lock.json')) {
    const cli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
    gates.push({
      nombre: 'npm audit',
      cmd: fs.existsSync(cli) ? process.execPath : 'npm',
      args: fs.existsSync(cli) ? [cli, 'audit', '--omit=dev'] : ['audit', '--omit=dev'],
      shell: !fs.existsSync(cli),
      saltea: lockCambio ? null : 'no cambio package-lock.json',
    })
  }

  const format = comandoDe('format')
  if (format) gates.push({ nombre: 'format', cmd: format, args: [], shell: true })

  // Regla 2.8: fija versiones, no rangos abiertos. Nunca se saltea (leer un JSON no cuesta nada)
  // y no spawnea proceso: es un guard de regresion contra un `^`/`~` que vuelva a colarse.
  const pkg = (() => { try { return JSON.parse(fs.readFileSync('package.json', 'utf8')) } catch { return null } })()
  gates.push(pkg
    ? { nombre: 'rangos abiertos (package.json)', instant: true, ...juzgarRangosAbiertos(pkg) }
    : { nombre: 'rangos abiertos (package.json)', roto: 'no se pudo leer package.json' })

  return gates
}

function juzgarRangosAbiertos(pkg) {
  const hallazgos = require('../lib/deps-fijas').rangosAbiertos(pkg)
  if (!hallazgos.length) return { status: 0, salida: '' }
  const salida = hallazgos.map((h) => `${h.campo}.${h.nombre}: "${h.version}" no es una version exacta`).join('\n')
  return { status: 1, salida }
}

// El puntero de gitleaks: NO versionado (mismo patron que metrics/tool-usage.log), sobrevive
// entre corridas en esta maquina. Sin el (clon nuevo) `gitleaks-rango.js` cae a la completa sola.
const RUTA_PUNTERO_GITLEAKS = path.join('metrics', 'gitleaks-ultimo-commit.txt')

function leerPunteroGitleaks() {
  try {
    const v = fs.readFileSync(RUTA_PUNTERO_GITLEAKS, 'utf8').trim()
    return v || null
  } catch { return null }
}

function escribirPunteroGitleaks(sha) {
  try {
    fs.mkdirSync(path.dirname(RUTA_PUNTERO_GITLEAKS), { recursive: true })
    fs.writeFileSync(RUTA_PUNTERO_GITLEAKS, sha + '\n')
  } catch { /* si no se pudo guardar, la proxima corrida vuelve a la completa: no rompe nada */ }
}

function juzgarIntegridad(lib, archivos) {
  const conContenido = (archivos || [])
    .filter((f) => fs.existsSync(f) && fs.statSync(f).isFile())
    // Los binarios no se leen como texto: un .xlsx tiene bytes que parecen cualquier cosa.
    .filter((f) => !/[.](xlsx|png|jpg|jpeg|gif|pdf|zip|docx|ico|woff2?)$/i.test(f))
    .map((ruta) => ({ ruta, contenido: fs.readFileSync(ruta, 'utf8') }))
  const h = lib.hallazgos(conContenido)
  if (!h.length) return { status: 0, salida: '' }
  return { status: 1, salida: h.map((x) => `${x.archivo}: ${x.detalle}`).join('\n') }
}

function juzgarSecretosLiterales(lib, archivos) {
  const conContenido = (archivos || []).filter((f) => fs.existsSync(f))
    .map((ruta) => ({ ruta, contenido: fs.readFileSync(ruta, 'utf8') }))
  const hallazgos = lib.hallazgos(conContenido)
  if (!hallazgos.length) return { status: 0, salida: '' }
  const salida = hallazgos.map((h) =>
    `${h.archivo}:${h.linea} clave "${h.clave}": valor literal (no vacio, no plantilla) - posible secreto versionado`).join('\n')
  return { status: 1, salida }
}

// --- correrlos --------------------------------------------------------------------------------
// Tope por gate. Sin esto, uno que se cuelga cuelga el check entero y no hay forma de saber cual:
// el 10/08 la maquina se suspendio con gitleaks corriendo y el gate quedo "trabajando" 14 horas.
// Un gate que no termina es un gate que FALLA, igual que uno que no puede correr.
const TOPE_MS = Number(process.env.CHECK_TIMEOUT_MS) || 10 * 60 * 1000

function correr(gate) {
  return new Promise((resolve) => {
    if (gate.roto) return resolve({ gate, status: 2, salida: '', roto: true })
    if (gate.saltea) return resolve({ gate, salteado: true })
    if (gate.instant) return resolve({ gate, status: gate.status, salida: gate.salida || '', ms: 0 })
    const t0 = Date.now()
    const p = spawn(gate.cmd, gate.args, { cwd: RAIZ, shell: !!gate.shell })
    let salida = ''
    let cerrado = false
    const listo = (r) => { if (!cerrado) { cerrado = true; clearTimeout(reloj); resolve(r) } }
    const reloj = setTimeout(() => {
      p.kill()
      listo({ gate, status: 2, salida, ms: Date.now() - t0, colgado: true })
    }, TOPE_MS)
    p.stdout.on('data', (d) => { salida += d })
    p.stderr.on('data', (d) => { salida += d })
    p.on('error', (e) => listo({ gate, status: 2, salida: String(e.message), ms: Date.now() - t0 }))
    p.on('close', (status) => listo({ gate, status, salida, ms: Date.now() - t0 }))
  })
}

;(async () => {
  const gates = armarGates()
  console.log(`    ${SERIE ? 'en serie' : 'en paralelo'}: ${gates.map((g) => g.nombre).join(', ')}\n`)

  const arranque = Date.now()
  const resultados = []
  if (SERIE) { for (const g of gates) resultados.push(await correr(g)) }
  else resultados.push(...await Promise.all(gates.map(correr)))

  // Se imprime en orden FIJO aunque hayan terminado mezclados: una salida que cambia de orden
  // entre corridas no se puede diffear ni leer de memoria.
  let fallo = 0
  let verdes = 0
  const salteoAlcance = []
  const salteoEntorno = []
  for (const r of resultados) {
    const n = r.gate.nombre
    if (r.salteado) {
      console.log(`·  ${n}: salteado (${r.gate.saltea})`)
      ;(r.gate.porEntorno ? salteoEntorno : salteoAlcance).push(n)
      continue
    }
    if (r.roto) { console.log(`✗  ${n}: FALLO - ${r.gate.roto}`); fallo = 1; continue }
    if (r.colgado) {
      console.log(`✗  ${n}: FALLO - no termino en ${TOPE_MS / 1000} s, lo corte. ` +
        'Correlo solo para ver que pasa, o subi el tope con CHECK_TIMEOUT_MS.')
      fallo = 1
      continue
    }

    // gitleaks corrio de punta a punta (limpio o con hallazgo, no importa): lo de ahi para atras
    // ya se miro, la proxima corrida arranca desde HEAD. Si no corrio (no instalado/colgado/error
    // de spawn), el puntero queda como estaba y la proxima corrida reintenta desde el mismo lugar.
    if (n === 'secretos (gitleaks)' && (r.status === 0 || r.status === 1)) {
      const head = git('rev-parse', 'HEAD')
      if (head) escribirPunteroGitleaks(head)
    }

    const v = r.gate.juzgar ? r.gate.juzgar(r.salida, r.status) : { ok: r.status === 0 }
    if (v.ok) { verdes++; console.log(`OK ${n}  (${(r.ms / 1000).toFixed(1)} s)`); continue }

    fallo = 1
    console.log(`✗  ${n}: FALLO${v.nota ? ' - ' + v.nota : ` (exit ${r.status})`}  (${(r.ms / 1000).toFixed(1)} s)`)
    const cuerpo = r.salida.trim().split('\n')
    for (const l of cuerpo.slice(-15)) console.log(`      ${l}`)
    if (cuerpo.length > 15) console.log(`      ... (${cuerpo.length - 15} lineas mas; corré el gate solo para verlas)`)
  }

  console.log(`\n${(Date.now() - arranque) / 1000} s en total`)
  // La ultima linea es la que lee el que cierra la tanda: dice cuantos corrieron y cuantos no, y
  // solo dice "todo verde" cuando corrieron TODOS. La logica vive en el core y se prueba sola.
  const fin = veredictoFinal({ verdes, fallaron: fallo, alcance: salteoAlcance, entorno: salteoEntorno })
  console.log(fin.linea)
  for (const l of fin.detalle || []) console.log(l)
  if (!fin.ok) process.exit(1)
})()
