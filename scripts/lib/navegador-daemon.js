// El proceso que sostiene el Chromium compartido. No se invoca a mano: lo lanza
// `navegador.arrancarServidor()` (o `node agro.js navegador arrancar`).
//
// Es a proposito lo mas chico posible -levantar el servidor, anotar el endpoint, apagarse cuando
// ya no le sirve a nadie-: todo lo que tenga reglas vive en `navegador-core.js`, que se testea.

const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')
const core = require('./navegador-core')

const RAIZ = path.join(__dirname, '..', '..')
const DIR = path.join(RAIZ, 'work', 'navegador')
const ENDPOINT = path.join(DIR, 'endpoint.json')
const CLIENTES = path.join(DIR, 'clientes')
const LOCK = path.join(DIR, 'arrancando.lock')

// El lock lo toma quien spawnea este proceso y lo suelta ESTE, recien cuando hay endpoint anotado:
// esa es la ventana que hay que serializar (ver `arrancarServidor` en navegador.js).
const soltarLock = () => { try { fs.rmSync(LOCK, { recursive: true, force: true }) } catch { /* ya no esta */ } }

const leerEndpoint = () => { try { return JSON.parse(fs.readFileSync(ENDPOINT, 'utf8')) } catch { return null } }

const HEADLESS = process.env.AGRO_NAVEGADOR_HEADLESS !== '0'
const TTL_MS = Number(process.env.AGRO_NAVEGADOR_TTL_MIN || core.TTL_MIN_DEFAULT) * 60000
const LATIDO_MS = 15000

// El daemon escribe SU PROPIO log, no por stdout heredado. Antes se lanzaba con
// `stdio: ['ignore', log, log]` y el archivo lo abria quien lo spawneaba; desde que se arranca por
// `start /b` -para que el Chromium no se muera, ver navegador.js- esos handles NO se heredan y el
// log quedaba vacio. Escribiendo el archivo aca, el log existe con cualquier forma de arranque, que
// es lo que uno quiere de un log: no depender de quien te lanzo.
const ARCHIVO_LOG = path.join(DIR, 'servidor.log')
function log(msg) {
  const linea = `${new Date().toISOString().slice(0, 19)} ${msg}`
  console.log(linea)
  try {
    fs.mkdirSync(DIR, { recursive: true })
    fs.appendFileSync(ARCHIVO_LOG, linea + '\n')
  } catch { /* si no se puede escribir el log, el servidor igual tiene que arrancar */ }
}

function estaVivo(pid) {
  try { process.kill(pid, 0); return true } catch { return false }
}

function pidsClientes() {
  try {
    return fs.readdirSync(CLIENTES)
      .map((f) => Number(path.basename(f, '.json')))
      .filter((n) => Number.isInteger(n) && n > 0)
  } catch { return [] }
}

// Un cliente que se murio sin desconectarse deja su archivo. Si no se barre, el servidor cree para
// siempre que tiene clientes y no se apaga nunca.
function barrerClientesMuertos() {
  for (const pid of pidsClientes()) {
    if (!estaVivo(pid)) {
      try { fs.rmSync(path.join(CLIENTES, `${pid}.json`), { force: true }) } catch { /* ya no esta */ }
    }
  }
}

async function main() {
  fs.mkdirSync(CLIENTES, { recursive: true })

  // Segundo cinturon contra los daemons duplicados (el primero es el lock, que suelta este
  // proceso mas abajo). Si cuando arranco ya hay un servidor vivo anotado, no hay nada que hacer:
  // levantar otro Chromium para pisarle el endpoint deja al anterior corriendo sin dueño.
  const anotado = leerEndpoint()
  if (anotado && anotado.pid !== process.pid && estaVivo(anotado.pid)) {
    log(`ya habia un servidor vivo (pid ${anotado.pid}): me voy sin levantar nada`)
    soltarLock()
    process.exit(0)
  }

  const servidor = await chromium.launchServer({ headless: HEADLESS })
  // El pid del Chromium se anota para poder VERIFICAR que se fue. En Windows, `process.kill` es un
  // TerminateProcess: no corre el handler de SIGTERM de mas abajo, asi que el cierre ordenado del
  // servidor nunca se ejecuta. En la practica el Chromium se apaga igual (se le corta el pipe con
  // su proceso padre), pero eso hay que MIRARLO, no suponerlo: sin este pid, `parar` no tiene
  // forma de saber si dejo un navegador huerfano comiendo memoria.
  const navegadorPid = servidor.process() ? servidor.process().pid : null
  fs.writeFileSync(ENDPOINT, JSON.stringify({
    ws: servidor.wsEndpoint(),
    pid: process.pid,
    navegadorPid,
    headless: HEADLESS,
    ttlMin: TTL_MS / 60000,
    creado: new Date().toISOString(),
  }, null, 2) + '\n')
  soltarLock()
  log(`servidor arriba (pid ${process.pid}, headless=${HEADLESS}, ttl=${TTL_MS / 60000} min)`)

  const apagar = async (motivo) => {
    log('apagando: ' + motivo)
    try { fs.rmSync(ENDPOINT, { force: true }) } catch { /* ya no esta */ }
    try { await servidor.close() } catch { /* ya cerrado */ }
    process.exit(0)
  }

  // Un `kill` sin manejar deja el endpoint escrito apuntando a un puerto muerto, y la proxima tool
  // se come el timeout de conexion antes de caer a su browser propio.
  process.on('SIGTERM', () => apagar('SIGTERM'))
  process.on('SIGINT', () => apagar('SIGINT'))

  let ultimoUso = Date.now()
  setInterval(() => {
    barrerClientesMuertos()
    const vivos = core.clientesVivos(pidsClientes(), estaVivo)
    if (vivos.length) ultimoUso = Date.now()
    if (core.debeApagarse({ clientesVivos: vivos.length, ultimoUso, ahora: Date.now(), ttlMs: TTL_MS })) {
      apagar(`${TTL_MS / 60000} min sin clientes`)
    }
  }, LATIDO_MS)
}

main().catch((e) => {
  soltarLock() // si no, ninguna tool puede volver a intentarlo hasta que el lock se haga viejo
  // Va por `log` y no por console.error a proposito: arrancado con `start /b` nadie lee stderr, y
  // este es JUSTO el mensaje que hace falta cuando el compartido "no anda y no se sabe por que".
  log('el servidor no arranco: ' + e.message)
  process.exit(1)
})
