const { test } = require('node:test')
const assert = require('node:assert')
const path = require('node:path')
const {
  decidir, clientesVivos, debeApagarse, puedeIntentarArranque, TTL_MIN_DEFAULT,
  propioParaExplorador, rutaBrowsersPorDefecto,
} = require('./navegador-core')

const servidor = (extra = {}) => ({ ws: 'ws://127.0.0.1:1234/abc', pid: 999, headless: true, ...extra })

test('sin servidor anotado, lo levanta', () => {
  const r = decidir({ endpoint: null, quiere: { headless: true } })
  assert.equal(r.accion, 'arrancar')
})

test('con servidor vivo y compatible, se conecta', () => {
  const r = decidir({ endpoint: servidor(), quiere: { headless: true }, vivo: true })
  assert.equal(r.accion, 'conectar')
})

test('AGRO_NAVEGADOR=0 abre el propio y lo dice', () => {
  const r = decidir({ endpoint: servidor(), compartir: false })
  assert.equal(r.accion, 'propio')
  assert.match(r.motivo, /AGRO_NAVEGADOR=0/)
})

// Los flujos de escritura piden su browser propio POR INVOCACION, sin tocar AGRO_NAVEGADOR (que
// apagaria el compartido para toda la sesion, lecturas incluidas).
test('se pide propio explicitamente: abre el suyo aunque el compartido este vivo y compatible', () => {
  const r = decidir({ endpoint: servidor(), quiere: { headless: true }, vivo: true, propio: true })
  assert.equal(r.accion, 'propio')
  assert.doesNotMatch(r.motivo, /AGRO_NAVEGADOR/)
})

test('sin pedir propio, el camino normal (lectura) sigue eligiendo el compartido', () => {
  const r = decidir({ endpoint: servidor(), quiere: { headless: true }, vivo: true, propio: false })
  assert.equal(r.accion, 'conectar')
})

// La regresion que importa: que agregar `propio` no saque de un tiron a TODAS las lecturas del
// compartido. Sin pasar la clave (como hacen hoy los call sites de solo lectura), el default tiene
// que seguir siendo `propio:false`.
test('sin la clave propio en el objeto (default real de un call site de lectura), conecta', () => {
  const r = decidir({ endpoint: servidor(), quiere: { headless: true }, vivo: true })
  assert.equal(r.accion, 'conectar')
})

// La distincion importa: un endpoint podrido hay que BORRARLO. Si se lo trata igual que "no hay
// servidor", el archivo sobrevive y cada corrida vuelve a intentar contra un puerto muerto.
test('un endpoint anotado pero muerto se limpia antes de arrancar otro', () => {
  const r = decidir({ endpoint: servidor(), vivo: false })
  assert.equal(r.accion, 'arrancar')
  assert.equal(r.limpiar, true)
})

test('sin auto-arranque no levanta nada: abre el propio', () => {
  const r = decidir({ endpoint: null, autoArranque: false })
  assert.equal(r.accion, 'propio')
})

test('sin auto-arranque y con endpoint muerto, igual lo limpia', () => {
  const r = decidir({ endpoint: servidor(), vivo: false, autoArranque: false })
  assert.equal(r.accion, 'propio')
  assert.equal(r.limpiar, true)
})

// headless se fija al LANZAR el servidor y no se puede cambiar por conexion: un pedido headed
// (--headed, para mirar que pasa en pantalla) contra un servidor headless tiene que abrir el suyo.
test('pedir headed contra un servidor headless abre el propio', () => {
  const r = decidir({ endpoint: servidor({ headless: true }), quiere: { headless: false }, vivo: true })
  assert.equal(r.accion, 'propio')
  assert.match(r.motivo, /headless.*headed/)
})

test('pedir headless contra un servidor headed abre el propio', () => {
  const r = decidir({ endpoint: servidor({ headless: false }), quiere: { headless: true }, vivo: true })
  assert.equal(r.accion, 'propio')
})

// Y NO arranca un segundo servidor: dos servidores compartidos se pisan el archivo de endpoint y
// uno queda huerfano, sin nadie que lo apague.
test('el pedido incompatible nunca levanta un segundo servidor', () => {
  const r = decidir({ endpoint: servidor({ headless: true }), quiere: { headless: false }, vivo: true })
  assert.notEqual(r.accion, 'arrancar')
})

test('headless es el default cuando no se pide nada', () => {
  assert.equal(decidir({ endpoint: servidor({ headless: true }), quiere: {}, vivo: true }).accion, 'conectar')
  assert.equal(decidir({ endpoint: servidor({ headless: false }), quiere: {}, vivo: true }).accion, 'propio')
})

test('clientesVivos filtra los pids que ya no existen', () => {
  const vivo = (pid) => pid === 2
  assert.deepEqual(clientesVivos([1, 2, 3], vivo), [2])
})

// Las dos condiciones son AND: con un cliente conectado NO se apaga aunque haya pasado el TTL. Un
// spec de e2e pasa los 20 minutos sin problema y apagarle el browser lo mata en la mitad.
test('con clientes conectados no se apaga aunque venza el TTL', () => {
  assert.equal(debeApagarse({ clientesVivos: 1, ultimoUso: 0, ahora: 99e6, ttlMs: 1000 }), false)
})

test('sin clientes y vencido el TTL, se apaga', () => {
  assert.equal(debeApagarse({ clientesVivos: 0, ultimoUso: 0, ahora: 2000, ttlMs: 1000 }), true)
})

// Apagarse apenas se va el ultimo cliente tira justo el arranque que la proxima tool iba a reusar,
// que es todo el punto de esto.
test('sin clientes pero recien usado, sigue arriba', () => {
  assert.equal(debeApagarse({ clientesVivos: 0, ultimoUso: 1000, ahora: 1500, ttlMs: 1000 }), false)
})

test('el TTL default son 20 minutos', () => {
  assert.equal(TTL_MIN_DEFAULT, 20)
})

// Sin esto, un servidor que NO puede arrancar (browsers sin bajar) hace que cada tool spawnee un
// proceso que muere, para siempre.
test('no se reintenta el arranque si el anterior fracaso recien', () => {
  assert.equal(puedeIntentarArranque({ ultimoIntento: 1000, ahora: 2000, esperaMs: 60000 }), false)
})

test('pasada la espera, se vuelve a intentar', () => {
  assert.equal(puedeIntentarArranque({ ultimoIntento: 1000, ahora: 70000, esperaMs: 60000 }), true)
})

// `ultimoIntento` vale 0 cuando el archivo no existe, y `ahora` es un Date.now() de verdad: la
// resta da millones de ms, asi que "nunca intente" siempre habilita el intento.
test('sin intentos previos, se intenta', () => {
  assert.equal(puedeIntentarArranque({ ultimoIntento: 0, ahora: 1770000000000 }), true)
})

// Un explorador de paginas SOLO LEE por default; `--click` es la unica escritura posible (el
// propio codigo de la tool avisa "ESCRIBE en la pantalla SI ese link hace algo"). No es ambiguo,
// es CONDICIONAL: se pide propio si y solo si se pidio --click.
test('propioParaExplorador: sin --click, no pide propio (solo lee)', () => {
  assert.equal(propioParaExplorador(undefined), false)
})

test('propioParaExplorador: con --click, pide propio (puede escribir)', () => {
  assert.equal(propioParaExplorador('Nueva Solicitud'), true)
})

// Mismo fallback que `agro.js` (agro.js:110-112): si nadie fijo PLAYWRIGHT_BROWSERS_PATH, los
// browsers estan en `tools/playwright-browsers`, HERMANA del repo (no adentro).
test('rutaBrowsersPorDefecto cuelga de tools/, hermana de la raiz del repo', () => {
  const raiz = path.join('C:', 'repos', 'agro-platform')
  assert.equal(rutaBrowsersPorDefecto(raiz), path.join('C:', 'repos', 'tools', 'playwright-browsers'))
})
