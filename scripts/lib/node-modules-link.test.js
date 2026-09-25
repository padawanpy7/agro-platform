const { test } = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const nm = require('./node-modules-link')

// Estos tests NO crean ningun junction real: `enlazar`/`desenlazar` aceptan `esEnlace`,
// `existsSync`, `symlinkSync`, `rmdirSync` inyectados (mismo patron que ya tenian `ejecutar`/
// `symlinkSync` para el timeout de mklink), asi que la logica se prueba en memoria. Antes creaban
// un junction real de verdad, y eso era justo lo que disparaba la alerta de 360 Total Security
// cada vez que corria la suite (`node.exe` creando un enlace) - ver ICC-134/node-modules-link.js.
const SANDBOX_RAIZ = path.join(__dirname, '..', '..', 'work')

function rutas() {
  const principal = path.join('C:', 'fake', 'principal')
  const carpeta = path.join('C:', 'fake', 'worktree')
  return { principal, carpeta, origen: path.join(principal, 'node_modules'), destino: path.join(carpeta, 'node_modules') }
}

test('enlazar crea el link con symlinkSync cuando no hay nada en destino', () => {
  const { principal, carpeta, origen, destino } = rutas()
  let creado = false
  let llamadas = 0
  const r = nm.enlazar(carpeta, principal, {
    existsSync: (p) => p === origen || (creado && p === destino),
    esEnlace: (p) => creado && p === destino,
    symlinkSync: (o, d, tipo) => { llamadas++; assert.strictEqual(o, origen); assert.strictEqual(d, destino); assert.strictEqual(tipo, 'junction'); creado = true },
  })
  assert.ok(r.ok, r.motivo)
  assert.strictEqual(r.estado, 'enlazado')
  assert.strictEqual(llamadas, 1)
})

test('enlazar dos veces es idempotente (no vuelve a llamar symlinkSync)', () => {
  const { principal, carpeta, origen, destino } = rutas()
  const r = nm.enlazar(carpeta, principal, {
    existsSync: (p) => p === origen || p === destino,
    esEnlace: (p) => p === destino,
    symlinkSync: () => { throw new Error('no deberia llamarse: ya estaba enlazado') },
  })
  assert.ok(r.ok)
  assert.match(r.estado, /ya estaba/)
})

test('enlazar no pisa un node_modules propio, y lo dice', () => {
  const { principal, carpeta, origen, destino } = rutas()
  const r = nm.enlazar(carpeta, principal, {
    existsSync: (p) => p === origen || p === destino,
    esEnlace: () => false,
    symlinkSync: () => { throw new Error('no deberia llamarse: hay un node_modules propio') },
  })
  assert.strictEqual(r.ok, false)
  assert.match(r.motivo, /PROPIO/)
})

test('sin node_modules en el principal, lo dice en vez de enlazar a la nada', () => {
  const { principal, carpeta } = rutas()
  const r = nm.enlazar(carpeta, principal, {
    existsSync: () => false,
    esEnlace: () => false,
    symlinkSync: () => { throw new Error('no deberia llamarse: no hay node_modules en el principal') },
  })
  assert.strictEqual(r.ok, false)
  assert.match(r.motivo, /npm ci/)
})

// LA PROPIEDAD QUE IMPORTA: sacar el enlace usa `rmdirSync` (borrado NO recursivo de un junction),
// nunca un borrado recursivo que seguiria el enlace y se llevaria puestos los paquetes de verdad.
test('desenlazar llama rmdirSync (no un borrado recursivo) sobre un destino que es un enlace', () => {
  const { carpeta, destino } = rutas()
  let llamadoCon = null
  let borrado = false
  const r = nm.desenlazar(carpeta, {
    esEnlace: (p) => p === destino && !borrado,
    existsSync: (p) => p === destino && !borrado,
    rmdirSync: (p) => { llamadoCon = p; borrado = true },
  })
  assert.strictEqual(r, true)
  assert.strictEqual(llamadoCon, destino)
})

test('desenlazar no toca nada si el destino NO es un enlace', () => {
  const r = nm.desenlazar(rutas().carpeta, {
    esEnlace: () => false,
    rmdirSync: () => { throw new Error('no deberia llamarse: no es un enlace') },
  })
  assert.strictEqual(r, false)
})

// Unico test que SIGUE tocando disco real, a proposito: crea una carpeta PROPIA de verdad (nunca
// un junction) para confirmar que `esEnlace` real la distingue de un enlace y `desenlazar` la deja
// intacta. No dispara la alerta: no hay ningun enlace de por medio, solo un directorio comun.
test('desenlazar (fs real) no toca un node_modules propio de verdad', () => {
  const base = fs.mkdtempSync(path.join(SANDBOX_RAIZ, 'bf-nm-'))
  try {
    const carpeta = path.join(base, 'worktree')
    fs.mkdirSync(path.join(carpeta, 'node_modules', 'suyo'), { recursive: true })
    assert.strictEqual(nm.desenlazar(carpeta), false)
    assert.deepEqual(fs.readdirSync(path.join(carpeta, 'node_modules')), ['suyo'])
  } finally { fs.rmSync(base, { recursive: true, force: true }) }
})

// El mecanismo que le importa a ICC-134: `intentarJunction` corre `mklink /J` en un proceso aparte
// y lo mata si no responde a tiempo, en vez de dejarlo colgado (`fs.symlinkSync` es sincrono: si el
// syscall se cuelga -antivirus mediante- no hay forma de cortarlo desde este mismo proceso). Se
// prueba con un `ejecutar` que tarda de mas A PROPOSITO (un `cmd` real que hace ping por 30s, NUNCA
// mklink) para no depender de que el antivirus de esta maquina este bloqueando junctions justo ahora
// -y sin crear ningun enlace: `ping` no crea nada.
// El caso spawnea `cmd` (ping de Windows) a proposito. En Linux no existe y el spawn da ENOENT
// antes de que el timeout pueda dispararse: no es que el codigo falle, es que el caso no aplica.
// Se SALTEA declarandolo, que no es lo mismo que borrarlo -en Windows tiene que seguir corriendo-.
test('intentarJunction mata el proceso si no responde a tiempo', { skip: process.platform !== 'win32' && 'caso de Windows: `cmd` no existe en esta plataforma' }, () => {
  const ejecutarLento = (comando, args, opciones) =>
    require('child_process').spawnSync('cmd', ['/c', 'ping', '-n', '30', '127.0.0.1'], opciones)
  const t0 = Date.now()
  const r = nm.intentarJunction('origen', 'destino', 300, ejecutarLento)
  const tardo = Date.now() - t0
  assert.strictEqual(r.error.code, 'ETIMEDOUT')
  // Lo que se afirma es "NO espero al ping entero", no "tardo poco": el ETIMEDOUT de arriba ya
  // dice que lo mato. El limite se afloja de 3 s a 15 s (la mitad del ping) porque 3 s es una
  // carrera contra la maquina y no contra el codigo: medido el 17/08, esto tardo 3774 ms en 1 de
  // cada 15 corridas de `check` -que lanza los gates EN PARALELO, asi que el spawn+kill compite
  // con gitleaks y el spell-. Un gate que falla 1 de cada 15 es peor que uno que falla siempre:
  // se le echa la culpa al azar y se lo vuelve a correr. Si el kill dejara de funcionar, esto
  // tardaria los 30 s del ping y seguiria fallando.
  assert.ok(tardo < 15000, `tardo ${tardo}ms: no se mato el proceso, se espero al ping entero`)
})

// enlazar() en si: se inyecta un `symlinkSync` que falla con EPERM (como el que mide ICC-134) y un
// `ejecutar` que devuelve rapido, para probar la logica -motivo accionable, rapido- sin esperar a
// que el antivirus real se tome su tiempo (eso es flaky por naturaleza: midio entre 700ms y 32s el
// mismo intento, misma maquina, un minuto de diferencia). Se inyecta -no se mockea `fs`- porque
// `test-js` corre todos los scripts/lib/*.test.js en UN SOLO proceso (--test-isolation=none): tocar
// `fs.symlinkSync` global se filtraria a los tests de otros archivos que corren en paralelo ahi.
test('enlazar con el intento bloqueado (EPERM) prueba mklink una vez y dice que es el antivirus', () => {
  const { principal, carpeta, origen, destino } = rutas()
  let llamadasSymlinkSync = 0
  const symlinkSyncQueDaEPERM = () => { llamadasSymlinkSync++; throw Object.assign(new Error('EPERM: operation not permitted'), { code: 'EPERM' }) }
  const ejecutarQueFallaRapido = () => ({ error: null, status: 1, stderr: 'Acceso denegado.' })
  const t0 = Date.now()
  const r = nm.enlazar(carpeta, principal, {
    existsSync: (p) => p === origen,
    esEnlace: () => false,
    symlinkSync: symlinkSyncQueDaEPERM,
    ejecutar: ejecutarQueFallaRapido,
  })
  const tardo = Date.now() - t0
  assert.strictEqual(r.ok, false)
  assert.strictEqual(llamadasSymlinkSync, 1, 'no tendria que reintentar sobre el mismo EPERM')
  assert.match(r.motivo, /EPERM/)
  assert.match(r.motivo, /antivirus/)
  assert.ok(tardo < 500, `tardo ${tardo}ms, no deberia depender de ningun timeout real`)
})

// Y si lo que falla es el `mklink /J` de respaldo por timeout (no EPERM de entrada), el motivo
// tiene que mencionar el timeout, no un EPERM que nunca paso.
test('enlazar con el mklink de respaldo bloqueado (timeout) dice que no respondio', () => {
  const { principal, carpeta, origen, destino } = rutas()
  const symlinkSyncQueFallaDistinto = () => { throw Object.assign(new Error('no relacionado'), { code: 'EACCES' }) }
  const ejecutarQueNuncaResponde = () => ({ error: Object.assign(new Error('spawnSync mklink ETIMEDOUT'), { code: 'ETIMEDOUT' }) })
  const r = nm.enlazar(carpeta, principal, {
    existsSync: (p) => p === origen,
    esEnlace: () => false,
    msTimeout: 250,
    symlinkSync: symlinkSyncQueFallaDistinto,
    ejecutar: ejecutarQueNuncaResponde,
  })
  assert.strictEqual(r.ok, false)
  assert.match(r.motivo, /no respondio.*250ms/)
  assert.match(r.motivo, /antivirus/)
})

// --- instalar(): npm ci por carpeta, en vez del junction. Se inyecta `ejecutar` (mismo patron):
// nunca corre un npm ci real en un test unitario (tarda segundos y pega a la red/cache de npm).
test('instalar corre npm ci en la carpeta y cuenta los paquetes que quedaron', () => {
  const base = fs.mkdtempSync(path.join(SANDBOX_RAIZ, 'bf-nm-'))
  try {
    fs.mkdirSync(path.join(base, 'node_modules', 'marked'), { recursive: true })
    fs.mkdirSync(path.join(base, 'node_modules', '.bin'), { recursive: true })
    fs.writeFileSync(path.join(base, 'node_modules', '.package-lock.json'), '{}')
    let llamada = null
    const r = nm.instalar(base, {
      ejecutar: (cmd, args, opciones) => { llamada = { cmd, args, opciones }; return { status: 0, stdout: '', stderr: '' } },
    })
    assert.ok(r.ok, r.motivo)
    assert.strictEqual(r.paquetes, 1, 'cuenta node_modules sin .bin ni .package-lock.json')
    assert.strictEqual(llamada.opciones.cwd, base)
    assert.ok(llamada.args.includes('ci'))
  } finally { fs.rmSync(base, { recursive: true, force: true }) }
})

test('instalar informa el motivo si npm ci falla', () => {
  const base = fs.mkdtempSync(path.join(SANDBOX_RAIZ, 'bf-nm-'))
  try {
    const r = nm.instalar(base, {
      ejecutar: () => ({ status: 1, stdout: '', stderr: 'npm ERR! code ENOTFOUND\nnpm ERR! sin red' }),
    })
    assert.strictEqual(r.ok, false)
    assert.match(r.motivo, /ENOTFOUND/)
  } finally { fs.rmSync(base, { recursive: true, force: true }) }
})

test('instalar informa el motivo si el proceso de npm ni pudo arrancar', () => {
  const base = fs.mkdtempSync(path.join(SANDBOX_RAIZ, 'bf-nm-'))
  try {
    const r = nm.instalar(base, {
      ejecutar: () => ({ error: Object.assign(new Error('spawn npm ENOENT'), { code: 'ENOENT' }) }),
    })
    assert.strictEqual(r.ok, false)
    assert.match(r.motivo, /ENOENT/)
  } finally { fs.rmSync(base, { recursive: true, force: true }) }
})

// --- estaDesactualizado(): aviso barato, sin gate nuevo. Compara el `.package-lock.json` que npm
// deja DENTRO de node_modules (refleja lo instalado) contra el `package-lock.json` de la raiz.
test('estaDesactualizado detecta un node_modules mas viejo que el lockfile', () => {
  const base = fs.mkdtempSync(path.join(SANDBOX_RAIZ, 'bf-nm-'))
  try {
    const carpeta = path.join(base, 'worktree')
    fs.mkdirSync(path.join(carpeta, 'node_modules'), { recursive: true })
    fs.writeFileSync(path.join(carpeta, 'node_modules', '.package-lock.json'), '{}')
    fs.writeFileSync(path.join(base, 'package-lock.json'), '{}')
    const vieja = new Date(Date.now() - 60000)
    fs.utimesSync(path.join(carpeta, 'node_modules', '.package-lock.json'), vieja, vieja)
    assert.strictEqual(nm.estaDesactualizado(carpeta, base), true)
  } finally { fs.rmSync(base, { recursive: true, force: true }) }
})

test('estaDesactualizado dice que no cuando el node_modules es mas nuevo que el lockfile', () => {
  const base = fs.mkdtempSync(path.join(SANDBOX_RAIZ, 'bf-nm-'))
  try {
    const carpeta = path.join(base, 'worktree')
    fs.mkdirSync(path.join(carpeta, 'node_modules'), { recursive: true })
    fs.writeFileSync(path.join(base, 'package-lock.json'), '{}')
    const vieja = new Date(Date.now() - 60000)
    fs.utimesSync(path.join(base, 'package-lock.json'), vieja, vieja)
    fs.writeFileSync(path.join(carpeta, 'node_modules', '.package-lock.json'), '{}')
    assert.strictEqual(nm.estaDesactualizado(carpeta, base), false)
  } finally { fs.rmSync(base, { recursive: true, force: true }) }
})

test('estaDesactualizado devuelve null si no puede comparar (falta algun archivo)', () => {
  const base = fs.mkdtempSync(path.join(SANDBOX_RAIZ, 'bf-nm-'))
  try {
    assert.strictEqual(nm.estaDesactualizado(path.join(base, 'worktree'), base), null)
  } finally { fs.rmSync(base, { recursive: true, force: true }) }
})
