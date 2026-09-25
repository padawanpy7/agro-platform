// El navegador COMPARTIDO del loop: un solo Chromium para todas las tools.
//
// El problema que resuelve. En el repo de origen habia varios modulos de sesion, cada uno con su
// `chromium.launch()`. Como cada tool es un proceso aparte, eso es un Chromium nuevo por
// invocacion: una tool que spawnea varias tools por corrida levantaba un navegador por cada una,
// uno detras del otro, para hablar con la misma app.
//
// Medido en esta maquina (11/08), por invocacion y de proceso a proceso:
//
//   | | propio (`launch`) | compartido (`connect`) |
//   |---|---|---|
//   | armar el browser | ~3,1 s | ~0,9 s |
//   | reloj de la tool  | ~5,8 s | ~2,8 s |
//
// Lo que NO cambia es el resto: node arranca y `require('playwright')` se paga igual en cada
// proceso (~1,9 s). Esto se lleva el Chromium, no el arranque de node.
//
// Como funciona: el primer pedido levanta un `chromium.launchServer()` en un proceso suelto, que
// anota su `wsEndpoint` en `work/navegador/endpoint.json`; los demas se CONECTAN a ese. El
// servidor se apaga solo cuando hace rato que nadie lo usa (ver `navegador-core.debeApagarse`).
//
// Lo importante para quien llame a esto: **`browser.close()` sigue siendo correcto en los dos
// casos**. Sobre un browser conectado, Playwright cierra los contexts de ESE cliente y se
// desconecta; no toca el servidor ni a los otros clientes (verificado 11/08 con dos clientes en
// paralelo: A cerro y B siguio navegando). Por eso los cuatro modulos de sesion no tuvieron que
// cambiar su forma de cerrar.
//
// Interruptores (.env o ambiente):
//   AGRO_NAVEGADOR=0          apaga el compartido: cada tool abre el suyo, como antes.
//   AGRO_NAVEGADOR_AUTO=0     no levanta el servidor solo; usa el que haya y si no, uno propio.
//   AGRO_NAVEGADOR_TTL_MIN=N  minutos sin clientes antes de que el servidor se apague (default 20).
//
// `propio:true` (por invocacion, no por env var): TODO CALL SITE QUE ESCRIBE EN UN SISTEMA REAL
// pide su browser propio con `abrirContexto({ propio: true }, ...)` en vez de tocar
// `AGRO_NAVEGADOR=0` -esa env var apaga el compartido para TODA la sesion, lecturas incluidas-.
//
// Por que la regla es "escribe" y no "los que ya fallaron": en el repo de origen la muestra
// confirmada eran 3 fallos de flujos de escritura, que SOLO anduvieron con el compartido apagado
// -causa raiz nunca diagnosticada-, pero esos 3 son la MUESTRA, no la lista completa de lo que
// puede fallar.
//
// REVISADA Y CONFIRMADA midiendo. La duda era legitima: los 3 fallos se atribuyeron al compartido
// cuando el compartido NO ANDABA NUNCA (`detached` mataba su Chromium), asi que la evidencia que
// fundaba la regla estaba viciada y quedo anotado revisarla. Se midio abriendo contextos de las
// dos formas, dos rondas de 4 y 6: **propio p50 194-343 ms, compartido p50 20-212 ms**. El
// compartido ahorra **0,13 a 0,17 s por corrida**, no los ~2,2 s que decia este mismo comentario
// -ese numero salio de medir con el compartido roto-.
//
// O sea que devolver los flujos de escritura al compartido compra 0,15 s en tools que tardan 10 a
// 28 s -0,6% de la corrida- a cambio de reabrir un fallo cuya causa raiz nunca se supo, en el medio
// de una escritura sobre un sistema real. La regla se queda.
//
// Lectura y exports siguen en el compartido. Ahi el ahorro es el mismo por corrida, pero son
// muchas mas corridas y ninguna arriesga una escritura a medio hacer.

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const core = require('./navegador-core')

const RAIZ = path.join(__dirname, '..', '..')

// Mismo fallback que `agro.js` (que lo fija al arrancar CUALQUIER tool, agro.js:110-112): sin esto,
// quien entra SIN pasar por `agro.js` (un test, un `node -e`, un script suelto) mira el cache
// default vacio de Playwright y cree que faltan los browsers, cuando en realidad estan ahi.
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = core.rutaBrowsersPorDefecto(RAIZ)
}

const DIR = path.join(RAIZ, 'work', 'navegador')
const ENDPOINT = path.join(DIR, 'endpoint.json')
const CLIENTES = path.join(DIR, 'clientes')
const LOCK = path.join(DIR, 'arrancando.lock')
const DAEMON = path.join(__dirname, 'navegador-daemon.js')

const depurar = (msg) => { if (process.env.AGRO_NAVEGADOR_DEBUG === '1') console.error('[navegador] ' + msg) }

const compartirActivo = () => process.env.AGRO_NAVEGADOR !== '0'
const autoArranqueActivo = () => process.env.AGRO_NAVEGADOR_AUTO !== '0'
const ttlMs = () => Number(process.env.AGRO_NAVEGADOR_TTL_MIN || core.TTL_MIN_DEFAULT) * 60000

function leerEndpoint() {
  try { return JSON.parse(fs.readFileSync(ENDPOINT, 'utf8')) } catch { return null }
}

// `process.kill(pid, 0)` no manda ninguna señal: solo pregunta si el proceso existe. Funciona
// igual en Windows, que es donde corre esto.
function estaVivo(pid) {
  if (!pid) return false
  try { process.kill(pid, 0); return true } catch { return false }
}

function limpiarEndpoint() {
  try { fs.rmSync(ENDPOINT, { force: true }) } catch { /* ya no esta */ }
}

// --- registro de clientes -------------------------------------------------------------------
// Cada proceso conectado deja su pid. El servidor lo lee para saber si le sirve a alguien: sin
// esto, apagarlo por tiempo mataria una corrida larga de e2e en la mitad.

const rutaCliente = (pid) => path.join(CLIENTES, `${pid}.json`)

function anotarCliente() {
  try {
    fs.mkdirSync(CLIENTES, { recursive: true })
    fs.writeFileSync(rutaCliente(process.pid), JSON.stringify({
      pid: process.pid, tool: process.argv[1] ? path.basename(process.argv[1], '.js') : null,
      desde: new Date().toISOString(),
    }))
  } catch { /* si no se puede anotar, el servidor lo dara por muerto: se pierde el reuso, no el trabajo */ }
}

function borrarCliente() {
  try { fs.rmSync(rutaCliente(process.pid), { force: true }) } catch { /* ya no esta */ }
}

function pidsClientes() {
  try {
    return fs.readdirSync(CLIENTES)
      .map((f) => Number(path.basename(f, '.json')))
      .filter((n) => Number.isInteger(n) && n > 0)
  } catch { return [] }
}

// --- arranque del servidor ------------------------------------------------------------------

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

// Dos tools que arrancan a la vez encuentran las dos "no hay servidor" y levantan una cada una: la
// segunda pisa el endpoint de la primera y deja un Chromium huerfano sin nadie que lo apague.
// `mkdir` es atomico en los dos sistemas: el que lo logra arranca, el otro espera el endpoint.
function tomarLock() {
  try { fs.mkdirSync(LOCK); return true } catch { return false }
}

function soltarLock() {
  try { fs.rmSync(LOCK, { recursive: true, force: true }) } catch { /* ya no esta */ }
}

function lockAbandonado() {
  try { return Date.now() - fs.statSync(LOCK).mtimeMs > 60000 } catch { return false }
}

async function esperarEndpoint(tope = 30000) {
  const hasta = Date.now() + tope
  while (Date.now() < hasta) {
    const e = leerEndpoint()
    if (e && e.ws && estaVivo(e.pid)) return e
    await dormir(200)
  }
  return null
}

const INTENTO = path.join(DIR, 'ultimo-intento')

function marcarIntento() {
  try { fs.writeFileSync(INTENTO, new Date().toISOString()) } catch { /* best-effort */ }
}

function ultimoIntento() {
  try { return fs.statSync(INTENTO).mtimeMs } catch { return 0 }
}

// Levanta el servidor en un proceso SUELTO (`detached` + `unref`): tiene que sobrevivir a la tool
// que lo arranco, que es justamente de lo que se trata.
//
// `esperar` es la decision que hace que esto valga la pena o no. Medido el 11/08: esperar a que el
// servidor este listo hace que la PRIMERA tool tarde 10,4 s contra 5,5 s abriendo el suyo -paga el
// arranque de otro node, el de playwright y el del Chromium antes de empezar-. O sea que la
// optimizacion empeoraba la primera corrida de cada sesion, que es la que uno mira. Con
// `esperar:false` se lanza el servidor y se sigue de largo con un browser propio: la primera tool
// cuesta lo mismo que antes y la SEGUNDA ya encuentra el servidor listo. Esperar solo tiene
// sentido cuando lo que se pidio es justamente levantarlo (`node agro.js navegador arrancar`).
async function arrancarServidor({ headless = true, esperar = true } = {}) {
  fs.mkdirSync(DIR, { recursive: true })

  if (!tomarLock()) {
    if (lockAbandonado()) { soltarLock(); tomarLock() }
    else {
      depurar('otro proceso esta arrancando el servidor')
      return esperar ? esperarEndpoint(30000) : null
    }
  }

  // EL LOCK NO SE SUELTA ACA: lo suelta el daemon cuando ya anoto su endpoint.
  //
  // Soltarlo al terminar el spawn no serializa nada, y eso dejo cuatro daemons vivos en la prueba
  // del 11/08: como no se espera al servidor (`esperar:false`), el lock duraba milisegundos, la
  // tool siguiente lo encontraba libre y spawneaba OTRO daemon; el segundo pisaba el endpoint y el
  // primero quedaba corriendo para siempre, sin que nadie supiera que existia. La ventana que hay
  // que cubrir no es "mientras spawneo" sino "hasta que haya un endpoint anotado".
  // Si el daemon muere antes de anotarlo, el lock queda viejo y `lockAbandonado()` lo libera.
  try {
    marcarIntento()
    // Se arranca por `cmd /c start "" /b`, NO con `detached: true`. Medido el 14/08, cambiando una
    // sola cosa por vez y con el lanzador ya muerto al medir:
    //
    //   detached: true            -> el chromium del daemon MUERE a los ~15 s
    //   cmd /c start "" /b        -> vivo a los 30 s, y aceptando conexiones (86/22/17 ms)
    //
    // `detached: true` es DETACHED_PROCESS en Windows: deja al daemon sin consola, el Chromium se
    // crea la suya, y cuando esa se va el Chromium sale limpio (codigo 0). `start /b` arranca el
    // proceso sin ventana nueva y desprendido del lanzador, que es lo que hacia falta, sin dejarlo
    // sin consola. (`windowsHide` no tenia nada que ver: se probo en true y en false, y moria
    // igual.) El titulo vacio de `start ""` no es adorno: sin el, `start` toma la primera cadena
    // entrecomillada como TITULO de ventana en vez de como el programa a ejecutar.
    //
    // Lo que se pierde asi es el stdio heredado: `start /b` no pasa nuestros handles, y el log
    // quedaba VACIO. Por eso el daemon ahora escribe `servidor.log` el mismo (navegador-daemon.js).
    const hijo = spawn('cmd', ['/c', 'start', '', '/b', process.execPath, DAEMON], {
      // LA PESTAÑA DE CONSOLA DEL CHROMIUM NO SE ARREGLA DESDE ACA: la pide el Chromium, no
      // nosotros, y ningun flag nuestro la tapa. El arreglo real es de la maquina -poner
      // "Aplicacion de terminal predeterminada" en "Host de la consola de Windows" en vez de
      // Windows Terminal, que muestra una pestaña por cada consola-. Ver docs/setup.md.
      //
      // `detached` NO va: era exactamente lo que mataba al Chromium (ver arriba). `cmd` termina
      // solito apenas hace el `start`, asi que no hay nada que desprender de este lado.
      windowsHide: true,
      stdio: 'ignore',
      env: { ...process.env, AGRO_NAVEGADOR_HEADLESS: headless ? '1' : '0' },
      cwd: RAIZ,
    })
    hijo.unref()
    // El pid de `hijo` es el del `cmd` intermedio, que muere en el acto: NO es el del servidor.
    // Decir "servidor lanzado (pid N)" con ese numero manda a mirar un proceso que ya no existe.
    // El pid real del daemon lo anota el propio daemon en el endpoint y en servidor.log.
    depurar('servidor lanzado (su pid queda en endpoint.json)')
    return esperar ? await esperarEndpoint(30000) : null
  } catch (e) {
    soltarLock() // no llego a arrancar: el lock no lo va a soltar nadie
    throw e
  }
}

// --- la API que usan los modulos de sesion --------------------------------------------------

// Devuelve un Browser de Playwright, compartido si se puede y propio si no. Las opciones son las
// mismas de `chromium.launch()`; se agrega `browser.bfCompartido` para que quien quiera pueda
// contarlo o informarlo.
async function abrir({ propio: propioPedido, ...opciones } = {}) {
  const { chromium } = require('playwright')
  const quiere = { headless: opciones.headless !== false }

  const endpoint = leerEndpoint()
  const decision = core.decidir({
    endpoint,
    quiere,
    compartir: compartirActivo(),
    autoArranque: autoArranqueActivo(),
    // "Vivo" es el daemon Y SU CHROMIUM. Mirar solo el pid de node es lo que hacia que el
    // compartido se autodestruyera: si el Chromium moria, el node seguia vivo, esto decia
    // "conectar", la conexion daba ECONNREFUSED y `descartarServidor()` mataba al daemon; la
    // corrida siguiente levantaba otro y otra vez. Que un pid exista no prueba que el servicio
    // atienda. `navegadorPid` ya se guardaba en el endpoint justamente para esto.
    vivo: endpoint
      ? estaVivo(endpoint.pid) && (!endpoint.navegadorPid || estaVivo(endpoint.navegadorPid))
      : true,
    propio: Boolean(propioPedido),
  })
  depurar(`${decision.accion}: ${decision.motivo}`)
  if (decision.limpiar) limpiarEndpoint()

  // No se espera al servidor: se lo deja arrancando para las tools que vengan y esta corrida sigue
  // con su propio browser (el porque, en `arrancarServidor`). Si un arranque anterior fracaso hace
  // menos de un minuto, ni se intenta: seria spawnear un proceso que ya sabemos que muere.
  if (decision.accion === 'arrancar') {
    if (core.puedeIntentarArranque({ ultimoIntento: ultimoIntento(), ahora: Date.now() })) {
      await arrancarServidor({ headless: quiere.headless, esperar: false })
    } else {
      depurar('hubo un intento de arranque hace menos de un minuto y no dejo endpoint: no reintento')
    }
  }

  const destino = decision.accion === 'conectar' ? endpoint : null

  if (destino && destino.ws) {
    try {
      // `slowMo` SI viaja por conexion (a diferencia de headless), asi que `--lento` sigue andando
      // contra un servidor compartido.
      const browser = await chromium.connect(destino.ws, {
        slowMo: opciones.slowMo || 0,
        timeout: Number(process.env.AGRO_NAVEGADOR_TIMEOUT_MS || 20000),
      })
      browser.bfCompartido = true
      anotarCliente()
      const limpiar = () => borrarCliente()
      browser.on('disconnected', limpiar)
      process.once('exit', limpiar)
      return browser
    } catch (e) {
      // Un servidor que no contesta NO puede dejar sin navegador a la tool: se descarta y se sigue
      // con uno propio. Es el modo de fallo mas probable (la maquina se suspendio, alguien mato el
      // Chromium) y tiene que ser invisible.
      // Se DESCARTA, no solo se borra el endpoint: el proceso de node sigue vivo aunque su Chromium
      // se haya muerto, y sin esto se queda dando vueltas hasta que vence el TTL.
      depurar('no pude conectarme al compartido (' + e.message.split('\n')[0] + '): abro uno propio')
      descartarServidor()
    }
  }

  const browser = await chromium.launch(opciones)
  browser.bfCompartido = false
  return browser
}

// Da un browser Y su primer context, con reintento propio si el compartido resulto estar podrido.
//
// Por que no alcanza con `abrir()`. Un servidor puede estar VIVO como proceso y tener el Chromium
// muerto: la conexion se establece igual -el que escucha el websocket es el proceso de node- y el
// error recien aparece en `newContext`, con el mensaje "Target page, context or browser has been
// closed", que no dice nada de un navegador compartido. Le paso a `envx-explorar` el 11/08: el
// Chromium del servidor se cayo (su proceso de red y su GPU murieron) y la tool siguiente heredo
// un error que parecia suyo. La unidad que puede fallar es "browser + context", asi que esa es la
// unidad que se reintenta.
async function abrirContexto(opcionesBrowser = {}, opcionesContexto = {}) {
  const browser = await abrir(opcionesBrowser)
  try {
    return { browser, context: await browser.newContext(opcionesContexto) }
  } catch (e) {
    // Un browser PROPIO que no puede dar un context es un problema de verdad (falta el binario, no
    // hay memoria): se propaga tal cual, sin disfrazarlo de reintento.
    if (!browser.bfCompartido) throw e
    depurar('el compartido no pudo dar un context (' + e.message.split('\n')[0] + '): abro uno propio')
    try { await browser.close() } catch { /* ya estaba roto */ }
    descartarServidor()

    const { chromium } = require('playwright')
    const propio = await chromium.launch(opcionesBrowser)
    propio.bfCompartido = false
    return { browser: propio, context: await propio.newContext(opcionesContexto) }
  }
}

// Un servidor con el Chromium muerto no se arregla solo: si solo se borra el endpoint, el proceso
// queda dando vueltas hasta que vence el TTL y la proxima tool paga de nuevo el arranque.
function descartarServidor() {
  const e = leerEndpoint()
  limpiarEndpoint()
  if (e && e.pid && estaVivo(e.pid)) {
    try { process.kill(e.pid) } catch { /* se fue solo */ }
  }
}

// Estado legible: lo que usa la tool `navegador estado` y lo que conviene mirar antes de culpar al
// compartido de algo.
function estado() {
  const endpoint = leerEndpoint()
  // Mismo criterio que `abrir`: un daemon con el Chromium muerto NO esta vivo, por mas que su
  // proceso de node exista. Decir que si era mentirle a quien viene a mirar por que no anda.
  const vivo = endpoint
    ? estaVivo(endpoint.pid) && (!endpoint.navegadorPid || estaVivo(endpoint.navegadorPid))
    : false
  const clientes = pidsClientes().filter(estaVivo)
  return {
    activo: compartirActivo(),
    autoArranque: autoArranqueActivo(),
    ttlMin: ttlMs() / 60000,
    servidor: endpoint ? { ...endpoint, vivo } : null,
    clientes,
  }
}

// Apaga el servidor y VERIFICA que el Chromium se haya ido con el.
//
// El chequeo no es paranoia: en Windows `process.kill` termina el proceso sin correr su handler de
// SIGTERM, asi que el `servidor.close()` ordenado del daemon no se ejecuta. El Chromium igual se
// apaga -pierde el pipe con su padre- pero eso es un comportamiento heredado, no algo que este
// escrito en ningun lado: si algun dia deja de pasar, el sintoma seria un navegador comiendo
// memoria en silencio. Aca se mira y, si quedo, se lo mata tambien.
async function parar() {
  const endpoint = leerEndpoint()
  if (!endpoint) return { paro: false, motivo: 'no hay servidor anotado' }
  if (!estaVivo(endpoint.pid)) {
    limpiarEndpoint()
    return { paro: false, motivo: 'el servidor anotado ya no corria (endpoint limpiado)' }
  }
  try { process.kill(endpoint.pid) } catch { /* se fue solo entre el chequeo y el kill */ }
  limpiarEndpoint()

  let huerfano = false
  if (endpoint.navegadorPid) {
    await dormir(1500)
    if (estaVivo(endpoint.navegadorPid)) {
      huerfano = true
      try { process.kill(endpoint.navegadorPid) } catch { /* justo se fue */ }
    }
  }
  return { paro: true, pid: endpoint.pid, navegadorPid: endpoint.navegadorPid, huerfano }
}

module.exports = {
  abrir, abrirContexto, estado, parar, arrancarServidor, descartarServidor,
  DIR, ENDPOINT, CLIENTES, estaVivo, pidsClientes, leerEndpoint, ttlMs,
}
