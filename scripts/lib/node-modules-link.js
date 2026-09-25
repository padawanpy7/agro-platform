// `node_modules` de cada worktree se instala con `npm ci` (determinista desde el lockfile): cada
// carpeta nace con exactamente los paquetes fijados, nunca atrasada respecto del principal. Antes
// se enlazaba con un JUNCTION de Windows al `node_modules` del principal para no pagar la
// instalacion (35 MB), pero eso se atrasaba -la carpeta de ICC-13 tenia su copia del 30/07 con 40
// paquetes contra los 47 del principal, sin `marked` ni `ssh2`, y `md-a-pdf`/`ssh-ro` no corrian
// ahi sin decir por que- y ademas 360 Total Security intercepta la CREACION del enlace en esta
// maquina -su alerta dice textual "The following program is creating file link to bypass security
// software", con `node.exe` como origen-: el bloqueo es intermitente, en TODA la maquina, cuesta
// 30 a 100s por intento, y ningun timeout lo puede acotar porque el hilo queda parado dentro del
// minifiltro de kernel del antivirus (medido: un `spawnSync` con timeout de 1ms tardo igual 32s).
//
// `enlazar()` sigue en el modulo, pero como FALLBACK EXPLICITO, no como camino normal: si
// `npm ci` no puede correr (ej. sin red), `task-start.js` lo intenta para que la carpeta al menos
// arranque viendo los paquetes del principal, avisando que puede tardar por el motivo de arriba.
// Nunca es el default ni corre en silencio.
//
// EL FILO DEL JUNCTION SIGUE VIVO mientras queden carpetas viejas enlazadas asi (o alguien use el
// fallback): un borrado recursivo que no mira si esta parado sobre un enlace **entra y borra el
// destino**. El `node_modules` del principal se vacio DOS VECES el 11/08 (16:16 y 17:13, la
// segunda al borrar un worktree). Por eso `desenlazar()` existe y hay que llamarlo ANTES de borrar
// cualquier worktree, tenga o no un `node_modules` propio.

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

function esEnlace(destino, lstatSync = fs.lstatSync) {
  try { return lstatSync(destino).isSymbolicLink() } catch { return false }
}

// Cuanto esperar al `mklink /J` de respaldo antes de darlo por perdido. Uno que se puede crear es
// instantaneo (medido: decenas de ms); esto es solo para no quedarse esperando de mas si esta
// bloqueado (12/08, ICC-134).
//
// OJO, esto NO es una garantia de "falla en como mucho este tiempo": si lo que bloquea el junction
// es un antivirus con el hilo parado dentro de un minifiltro del kernel, `TerminateProcess` (que es
// lo que usa `timeout` de `spawnSync` en Windows) pide la muerte del proceso pero esa muerte no se
// efectiviza hasta que el kernel devuelve el control; se midio un `spawnSync` con timeout de 1ms
// tardando igual 32s. El timeout acota el caso comun (bloqueo a nivel proceso); el caso "el
// antivirus tiene el hilo adentro" no se puede cortar desde aca: hace falta una excepcion del
// antivirus para esta carpeta.
const TIMEOUT_JUNCTION_MS = Number(process.env.AGRO_JUNCTION_TIMEOUT_MS || 5000)

function intentarJunction(origen, destino, msTimeout, ejecutar = spawnSync) {
  return ejecutar('cmd', ['/c', 'mklink', '/J', destino, origen], { encoding: 'utf8', timeout: msTimeout })
}

function normalizarFalloMklink(resultado, msTimeout) {
  if (resultado.error && resultado.error.code === 'ETIMEDOUT') {
    return { code: 'ETIMEDOUT', message: `mklink no respondio en ${msTimeout}ms` }
  }
  if (resultado.error) return { code: resultado.error.code, message: resultado.error.message }
  if (resultado.stderr && resultado.stderr.trim()) return { code: 'EFALLO', message: resultado.stderr.trim() }
  return { code: 'EFALLO', message: 'mklink /J no lo creo' }
}

// El motivo prioriza el diagnostico mas accionable, no el ultimo intento: un EPERM nativo o un
// timeout de mklink dicen ALGO (probablemente antivirus); un stderr generico de mklink (que corre
// igual aunque el nativo ya haya dado EPERM, por ICC-130) no debe tapar ese diagnostico.
function motivoDeFalla(ultimoNativo, ultimoMklink) {
  if (ultimoMklink && ultimoMklink.code === 'ETIMEDOUT') {
    return `no enlazo: ${ultimoMklink.message} (algo bloquea la creacion del junction, ej. un ` +
      'antivirus escaneando la carpeta - no es falta de permisos)'
  }
  if (ultimoNativo && ultimoNativo.code === 'EPERM') {
    return `no enlazo (EPERM): en esta maquina eso suele ser un antivirus bloqueando la creacion ` +
      `del junction, no falta de permisos - ${ultimoNativo.message}`
  }
  if (ultimoMklink) return `no enlazo: ${ultimoMklink.message}`
  if (ultimoNativo) return `no enlazo: ${ultimoNativo.message}`
  return 'no enlazo: mklink /J no lo creo'
}

// FALLBACK EXPLICITO (ver cabecera): enlaza `<carpeta>/node_modules` al del principal. Devuelve
// que paso, sin tirar: quien llama decide si es fatal. `opciones.esEnlace`/`existsSync` se pueden
// inyectar (ademas de `symlinkSync`/`ejecutar`, que ya se inyectaban para el timeout de mklink) para
// probar la logica entera sin tocar el disco.
//
// Sobre un worktree recien creado el junction falla a veces (11/08, ICC-130: fallo en la corrida
// que creo la carpeta y salio bien en la siguiente, misma maquina y mismos permisos), asi que se
// reintenta y se cae a `mklink /J` (con timeout) antes de rendirse. Si el primer intento da EPERM
// no se reintenta con `fs.symlinkSync` -es la misma llamada, con la misma carpeta bloqueada, y
// reintentarla solo duplica la espera (ICC-134)- pero se prueba una vez el `mklink /J` de todos
// modos: ICC-130 midio que a veces uno falla y el otro no, en la misma corrida.
function enlazar(carpeta, raiz, opciones = {}) {
  const msTimeout = opciones.msTimeout || TIMEOUT_JUNCTION_MS
  const ejecutar = opciones.ejecutar || spawnSync
  const symlinkSync = opciones.symlinkSync || fs.symlinkSync
  const existsSync = opciones.existsSync || fs.existsSync
  const chequearEnlace = opciones.esEnlace || esEnlace
  const destino = path.join(carpeta, 'node_modules')
  const origen = path.join(raiz, 'node_modules')

  if (!existsSync(origen)) return { ok: false, motivo: `no hay node_modules en ${raiz} (corre npm ci ahi)` }
  if (chequearEnlace(destino)) return { ok: true, estado: 'ya estaba enlazado' }
  if (existsSync(destino)) return { ok: false, motivo: 'ya hay un node_modules PROPIO (no se pisa: usá --rehacer)' }

  let ultimoNativo = null
  for (let intento = 1; intento <= 2 && !existsSync(destino) && (!ultimoNativo || ultimoNativo.code !== 'EPERM'); intento++) {
    try { symlinkSync(origen, destino, 'junction') } catch (e) { ultimoNativo = e }
  }

  let ultimoMklink = null
  if (!existsSync(destino)) {
    const resultado = intentarJunction(origen, destino, msTimeout, ejecutar)
    if (!existsSync(destino)) ultimoMklink = normalizarFalloMklink(resultado, msTimeout)
  }

  if (existsSync(destino)) {
    return { ok: true, estado: (ultimoNativo || ultimoMklink) ? 'enlazado (el primer intento fallo)' : 'enlazado' }
  }
  return { ok: false, motivo: motivoDeFalla(ultimoNativo, ultimoMklink), origen, destino }
}

// Saca el enlace SIN tocar lo que apunta. `fs.unlinkSync` sobre un junction falla en Windows
// (EPERM: es un directorio) y `fs.rmSync` sin `recursive` tampoco; `rmdir` sobre un junction borra
// el enlace y deja el destino intacto, que es exactamente lo que hace falta.
//
// Devuelve `false` si NO era un enlace: ahi no hay nada que desenlazar y borrar seria borrar
// paquetes de verdad. `opciones` inyecta `esEnlace`/`existsSync`/`rmdirSync`/`ejecutar` para
// probar esta propiedad -que nunca se ejecuta un borrado recursivo- sin crear un junction real.
function desenlazar(carpeta, opciones = {}) {
  const chequearEnlace = opciones.esEnlace || esEnlace
  const existsSync = opciones.existsSync || fs.existsSync
  const rmdirSync = opciones.rmdirSync || fs.rmdirSync
  const ejecutar = opciones.ejecutar || spawnSync
  const destino = path.join(carpeta, 'node_modules')
  if (!chequearEnlace(destino)) return false
  try { rmdirSync(destino) } catch { ejecutar('cmd', ['/c', 'rmdir', destino], { encoding: 'utf8' }) }
  return !existsSync(destino)
}

// Ubica el `npm` que corre esta misma instalacion de node, igual que hace `check.js` para
// `npm audit`: en vez de confiar en que `npm`/`npm.cmd` esten en el PATH de la shell que invoco al
// loop (no siempre estan, `docs/setup.md`), se corre `npm-cli.js` directo con `process.execPath`.
function comandoNpm(args) {
  const cli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
  return fs.existsSync(cli)
    ? { cmd: process.execPath, args: [cli, ...args], shell: false }
    : { cmd: 'npm', args, shell: true }
}

function contarPaquetes(carpeta) {
  const nm = path.join(carpeta, 'node_modules')
  if (!fs.existsSync(nm)) return 0
  return fs.readdirSync(nm).filter((n) => n !== '.bin' && n !== '.package-lock.json').length
}

// Instala `<carpeta>/node_modules` desde su `package-lock.json` con `npm ci`: determinista, nunca
// atrasado (a diferencia de una copia o de enlazar al principal). Es el camino NORMAL (ver
// cabecera); `enlazar()` es el fallback si esto no puede correr.
function instalar(carpeta, opciones = {}) {
  const ejecutar = opciones.ejecutar || spawnSync
  const { cmd, args, shell } = comandoNpm(['ci'])
  const t0 = Date.now()
  const resultado = ejecutar(cmd, args, { cwd: carpeta, encoding: 'utf8', shell, maxBuffer: 16 * 1024 * 1024 })
  const ms = Date.now() - t0

  if (resultado.error) return { ok: false, motivo: resultado.error.message, ms }
  if (resultado.status !== 0) {
    const salida = ((resultado.stdout || '') + (resultado.stderr || '')).trim()
    return { ok: false, motivo: salida.split('\n').slice(-5).join('\n') || `npm ci salio con exit ${resultado.status}`, ms }
  }
  return { ok: true, ms, paquetes: contarPaquetes(carpeta) }
}

// Aviso barato (no un gate nuevo): compara el `.package-lock.json` que `npm` deja DENTRO de
// `node_modules` -refleja exactamente lo que se instalo la ultima vez- contra el
// `package-lock.json` de la raiz del worktree. Si el lockfile es mas nuevo, la carpeta quedo
// atrasada (alguien agrego una dependencia y esta carpeta nunca corrio `npm ci` de nuevo).
// `null` si no se puede comparar (falta alguno de los dos archivos): no es "esta al dia", es "no se
// sabe", y quien llama decide que hacer con eso.
function estaDesactualizado(carpeta, raiz) {
  const lock = path.join(raiz, 'package-lock.json')
  const propio = path.join(carpeta, 'node_modules', '.package-lock.json')
  if (!fs.existsSync(lock) || !fs.existsSync(propio)) return null
  return fs.statSync(propio).mtimeMs < fs.statSync(lock).mtimeMs
}

module.exports = { enlazar, desenlazar, esEnlace, intentarJunction, instalar, estaDesactualizado }
