// ssh-ro.js - runner SSH de SOLO LECTURA contra los servidores de las bases.
//
// Por que existe: DIR_CAJA (`/archivos_aplicacion/caja`) vive en el disco del servidor, no en la
// base. Leerlo solo con consultas a la base es indirecto: no ve permisos, ni fechas, ni el
// listado del directorio, y un archivo binario hay que adivinarlo. Con acceso SSH se mira el
// archivo tal cual.
//
// Credenciales: las MISMAS de la base (`LDAP_USUARIO` / `LDAP_CONTRASENA` del `.env`), y el host sale del
// DSN de la base elegida. No se agrega ningun secreto nuevo al repo.
//
// SOLO LECTURA, y esto no es una convencion: `scripts/lib/ssh-ro-core.js` valida por lista blanca
// antes de mandar nada, y rechaza redirecciones, encadenamientos, sustitucion de comandos,
// interpretes y todo binario que pueda escribir. Ver ahi el detalle y sus tests.
//
// Uso:
//   node agro.js ssh-ro --base replica "ls -la /archivos_aplicacion/caja"
//   node agro.js ssh-ro --base replica --caja "cat capd35_imdx.txt"   (--caja = prefija DIR_CAJA)
//
// OJO: `--caja` NO hace `cd`. Antepone DIR_CAJA solo a los argumentos que TERMINAN en .txt/.sh/.log
// (ver la regex mas abajo), asi que `--caja "ls -la 12082026"` o `--caja "ls -lat"` listan el HOME
// del usuario, no DIR_CAJA, y contestan "No such file or directory" para algo que si existe. Para
// carpetas y listados, pasa la ruta absoluta.
//   node agro.js ssh-ro --base replica --probar             (solo verifica la conexion)

const path = require('path')
const fs = require('fs')
const { revisar } = require(path.join(__dirname, '..', 'lib', 'ssh-ro-core.js'))

const DIR_CAJA = '/archivos_aplicacion/caja'
const PUERTO = 22
const TIMEOUT_MS = Number(process.env.SSH_TIMEOUT_MS || 20000)

function cargarEnv() {
  const raiz = path.join(__dirname, '..', '..')
  const archivo = path.join(raiz, '.env')
  if (!fs.existsSync(archivo)) return
  for (const linea of fs.readFileSync(archivo, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(linea)
    if (!m) continue
    const valor = m[2].trim().replace(/^["']|["']$/g, '')
    if (!(m[1] in process.env)) process.env[m[1]] = valor
  }
}

function parsearArgs(argv) {
  const args = { base: 'replica', comando: '', caja: false, probar: false }
  const sueltos = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--base') { args.base = argv[++i]; continue }
    if (a === '--caja') { args.caja = true; continue }
    if (a === '--probar') { args.probar = true; continue }
    sueltos.push(a)
  }
  args.comando = sueltos.join(' ').trim()
  return args
}

// El host sale del DSN de la base: `10.10.17.48:1521/replica` -> `10.10.17.48`.
function hostDeLaBase(base) {
  const clave = 'ORA_DSN_' + String(base).toUpperCase()
  const dsn = process.env[clave]
  if (!dsn) throw new Error(`no hay ${clave} en el .env (bases conocidas: las ORA_DSN_* definidas)`)
  return dsn.split(':')[0].split('/')[0].trim()
}

function ejecutar({ host, usuario, password, comando }) {
  const { Client } = require('ssh2')
  return new Promise((resolve, reject) => {
    const conn = new Client()
    let salida = ''
    let error = ''
    const temporizador = setTimeout(() => {
      conn.end()
      reject(new Error(`timeout de ${TIMEOUT_MS} ms conectando o ejecutando en ${host}`))
    }, TIMEOUT_MS)

    conn.on('ready', () => {
      conn.exec(comando, (err, stream) => {
        if (err) { clearTimeout(temporizador); conn.end(); return reject(err) }
        stream.on('close', (code) => {
          clearTimeout(temporizador)
          conn.end()
          resolve({ salida, error, code })
        })
        stream.on('data', (d) => { salida += d.toString('utf8') })
        stream.stderr.on('data', (d) => { error += d.toString('utf8') })
      })
    })
    conn.on('error', (e) => { clearTimeout(temporizador); reject(e) })
    conn.connect({
      host, port: PUERTO, username: usuario, password,
      readyTimeout: TIMEOUT_MS,
      // El servidor es viejo: sin esto el handshake falla por algoritmos no negociados.
      algorithms: {
        kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1',
          'diffie-hellman-group1-sha1', 'diffie-hellman-group-exchange-sha256'],
        serverHostKey: ['ssh-rsa', 'rsa-sha2-256', 'rsa-sha2-512', 'ssh-ed25519', 'ecdsa-sha2-nistp256'],
      },
    })
  })
}

async function main() {
  cargarEnv()
  const args = parsearArgs(process.argv.slice(2))

  const usuario = (process.env.LDAP_USUARIO || '').trim()
  const password = process.env.LDAP_CONTRASENA || ''
  if (!usuario || !password) {
    console.error('faltan LDAP_USUARIO / LDAP_CONTRASENA en el .env (son las mismas credenciales de la base)')
    process.exit(2)
  }

  let host
  try { host = hostDeLaBase(args.base) } catch (e) { console.error(e.message); process.exit(2) }

  let comando = args.probar ? 'pwd' : args.comando
  if (!comando) {
    console.error('falta el comando. Ej: node agro.js ssh-ro --base replica "ls -la /archivos_aplicacion/caja"')
    process.exit(2)
  }

  const veredicto = revisar(comando)
  if (!veredicto.ok) {
    console.error(`guard read-only: rechazado -> ${veredicto.motivo}`)
    console.error(`comando: ${comando}`)
    console.error('Este runner es SOLO LECTURA a proposito (scripts/lib/ssh-ro-core.js).')
    process.exit(3)
  }

  // `--caja` solo antepone el directorio a los argumentos que son rutas relativas: no se usa `cd`
  // porque encadenar con `;` o `&&` es justo lo que el guard prohibe.
  if (args.caja) comando = comando.replace(/(^|\s)(\.\/)?([A-Za-z0-9_][^\s|]*\.(txt|sh|log))/g, `$1${DIR_CAJA}/$3`)

  try {
    const r = await ejecutar({ host, usuario, password, comando })
    if (r.salida) process.stdout.write(r.salida)
    if (r.error) process.stderr.write(r.error)
    if (args.probar) console.log(`\n[OK] conexion SSH a ${usuario}@${host} (base ${args.base})`)
    process.exit(r.code === 0 ? 0 : 1)
  } catch (e) {
    console.error(`fallo la conexion SSH a ${usuario}@${host}: ${e.message}`)
    process.exit(1)
  }
}

main()
