// cierre.js - la compuerta del cierre de sesion: mide si el trabajo quedo guardado de verdad.
//
// Por que existe: el ritual de cierre (AGENTS.md S4) vivia SOLO como prosa, asi que el dueño lo
// dictaba cada vez -"guardar el progreso, commitear, pushear, mergear, guardar"- y aun asi se
// escapaban pasos. El 12/08/2026 un cierre ya dado por bueno tenia: las preguntas abiertas del
// ticket solo en el chat, el README apuntando a una rama borrada y los comandos de prueba de un
// loop que ya no existe. Ninguna de esas tres cosas la ve un `git status`.
//
// SOLO LEE. No commitea, no pushea, no mergea: dice QUE falta y con que comando se arregla, y sale
// 1 si el cierre esta incompleto (sirve de compuerta). Todo lo que mide es local -git y archivos-,
// asi que corre en menos de un segundo y no necesita ni base ni red. Lo que si necesita conexion
// -los page locks de APEX- se recuerda al final, sin pretender chequearlo.
//
// Uso:
//   node agro.js cierre                  la rama actual
//   node agro.js cierre --ticket ICC-99  fuerza el ticket (default: se deduce de la rama)
//   node agro.js cierre --preguntas      declara que la sesion dejo preguntas abiertas

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const g = require('../lib/git')
// Hora LOCAL, no UTC: git y las bitacoras se escriben en local (scripts/lib/fecha-local.js).
const fechaLocal = require('../lib/fecha-local')
const core = require('../lib/cierre-core')
const cambios = require('../lib/carpeta-cambios')

const args = process.argv.slice(2)

if (args.includes('-h') || args.includes('--help')) {
  console.log('Uso: node agro.js cierre [--ticket <CLAVE>] [--preguntas] [--dias N]')
  console.log('Mide si la sesion quedo cerrada: sin cambios sueltos, pusheado, el loop promovido,')
  console.log('el PROGRESO del ticket al dia y sus docs sin comandos muertos. Solo lee. Sale 1 si falta algo.')
  console.log('')
  console.log('Ademas mide los gaps que antes solo encontraba la simulacion de arranque a mano:')
  console.log('  - un dia con commits y sin entrada en la bitacora (ventana --dias, default 7)')
  console.log('  - un "Pendiente / proximo" que nombra fichas ya cerradas o fusionadas')
  console.log('  - una ruta citada que no existe (la cita en pasado avisa, no frena)')
  console.log('  - el N/M que declara el README contra el ledger del ticket')
  console.log('  - caracteres de control en lo que la sesion toco')
  process.exit(0)
}

const flag = (nombre) => {
  const i = args.indexOf(nombre)
  return i >= 0 ? args[i + 1] : null
}

const RAMA = g.ramaActual() || '(detached)'
// `main` cierra el ticket META (ver features.js). El regex pide CLAVE-numero y META no lo
// cumple a proposito: es el unico ticket sin Jira, porque el cliente somos nosotros.
const TICKET = flag('--ticket') || (/^[A-Z]+-\d+$/.test(RAMA) ? RAMA : (RAMA === 'main' ? 'META' : null))
// La lista REAL de tools, del disco. Con esto el chequeo de comandos muertos deja de conocer solo
// los tres patrones de la migracion de julio y caza cualquier `node agro.js <tool>` que ya no exista.
// Si por lo que sea no se puede leer, se pasa null y ese chequeo NO corre -mejor no medirlo que
// inventar un verde-.
const RAIZ = path.join(__dirname, '..', '..')
//
// Los ALIAS entran tambien: son invocaciones validas y NO viven en el disco. `lint` es el nombre de
// uso de `plsql-lint` y esta escrito asi en AGENTS.md, en project.yml y en la cabeza de todos; sin
// esto el gate lo marcaba como tool inexistente. Salio al probar el chequeo contra el repo REAL, no
// contra sus tests: un gate nuevo hay que ejercitarlo con los archivos de verdad.
let TOOLS = null
try {
  TOOLS = new Set(require('../lib/tools-registro').descubrirTools(RAIZ).keys())
  const bf = fs.readFileSync(path.join(RAIZ, 'agro.js'), 'utf8')
  const linea = /const ALIAS = \{([^}]*)\}/.exec(bf)
  if (linea) for (const m of linea[1].matchAll(/(\w[\w-]*)\s*:/g)) TOOLS.add(m[1])
} catch { /* sin lista, no se chequea */ }
if (!TOOLS) console.error('  (no pude leer la lista de tools: el chequeo de comandos inexistentes NO corrio)')
const HOY = fechaLocal.hoy()

const chequeos = []

// --- 1. nada sin commitear ---------------------------------------------------------------------
const sucios = core.parsearStatus(g.gitSalida('status', '--porcelain'))
chequeos.push(core.chequearLimpio(sucios, `${RAMA} (${path.basename(process.cwd())})`))

// --- 2. nada sin pushear -----------------------------------------------------------------------
const tieneRemoto = !!g.git('rev-parse', '--verify', '--quiet', `refs/remotes/origin/${RAMA}`)
const sinPushear = tieneRemoto ? Number(g.git('rev-list', '--count', `origin/${RAMA}..${RAMA}`) || 0) : 0
chequeos.push(core.chequearPusheado(RAMA, sinPushear, tieneRemoto))

// --- 2b. main tambien: una mejora de loop sin pushear no le llega a nadie --------------------
// Se mira el repo, no este worktree: main casi siempre esta en otro (regla del dueño, ver
// [[main-con-commits-se-pushea-siempre]]).
if (RAMA !== 'main' && g.existeRama('main')) {
  const mainSinPushear = Number(g.git('rev-list', '--count', 'origin/main..main') || 0)
  chequeos.push(core.chequearPusheado('main', mainSinPushear, true))
}

// El main a comparar es el MAS ADELANTADO entre el ref local y `origin/main` (25/08/2026).
// `main` vive casi siempre en OTRO worktree, y este no lo puede mover: git no deja checkoutear una
// rama que otro worktree tiene tomada. Si desde aca se promueve algo a main -pusheando a
// `origin/main`-, el ref LOCAL queda viejo hasta que la otra sesion haga `pull`, y el gate acusa
// "sin promover" por archivos que main YA tiene. Medido ese dia: 4 archivos de loop reportados
// como faltantes estando los 4 en origin/main, con el local 6 commits atras.
const MAIN = (() => {
  if (!g.gitOk('rev-parse', '--verify', '--quiet', 'refs/remotes/origin/main')) return 'main'
  if (!g.existeRama('main')) return 'origin/main'
  return Number(g.git('rev-list', '--count', 'main..origin/main') || 0) > 0 ? 'origin/main' : 'main'
})()

// --- 3. al dia con main ------------------------------------------------------------------------
const atraso = RAMA === 'main' ? 0 : Number(g.git('rev-list', '--count', `${RAMA}..${MAIN}`) || 0)
chequeos.push(core.chequearAtraso(RAMA, atraso))

// --- 4. el loop tocado en la rama va a main -------------------------------------------------
// Las dos medidas, cruzadas en el core (ninguna sola sirve; ver el comentario de chequearPromocion).
const tocadosPorLaRama = RAMA === 'main'
  ? []
  : g.git('diff', '--name-only', `${MAIN}...${RAMA}`).split('\n').filter(Boolean)
const difierenHoy = RAMA === 'main'
  ? []
  : g.git('diff', '--name-only', MAIN, RAMA).split('\n').filter(Boolean)
// Se le pasa el diff crudo al core, que decide si hay contenido propio o es solo reordenamiento.
const aportaAlgo = (archivo) => core.aportaContenido(g.gitSalida('diff', MAIN, RAMA, '--', archivo))

// Como esta el checkout de main ANTES de mandar promover. `git worktree list --porcelain` dice
// donde vive main; si no se puede saber, se pasa null y el aviso lo dice en vez de suponer que esta
// limpio.
function estadoDeMain() {
  try {
    const salida = g.gitSalida('worktree', 'list', '--porcelain') || ''
    let ruta = null
    let actual = null
    for (const linea of salida.split('\n')) {
      if (linea.startsWith('worktree ')) actual = linea.slice('worktree '.length).trim()
      if (linea.trim() === 'branch refs/heads/main' && actual) { ruta = actual; break }
    }
    if (!ruta) return null
    const st = spawnSync('git', ['-C', ruta, 'status', '--porcelain'], { encoding: 'utf8' })
    if (st.status !== 0) return null
    const pendientes = core.parsearStatus(st.stdout)
    return { ruta, limpio: !pendientes.length, pendientes }
  } catch { return null }
}

chequeos.push(core.chequearPromocion(RAMA, tocadosPorLaRama, difierenHoy, aportaAlgo, estadoDeMain()))

// --- 5. el PROGRESO del ticket cuenta esta sesion ----------------------------------------------
// La carpeta sale del proyecto, no del codigo (scripts/lib/carpeta-cambios.js): si esto apunta a
// una carpeta que no existe, `carpeta` queda nulo y se SALTEA todo el bloque de chequeos del
// ticket -preguntas, aceptacion, criterio-primero- sin decir una palabra. Verde por no mirar.
const carpeta = TICKET ? cambios.ruta(TICKET) : null
const rutaProgreso = carpeta && fs.existsSync(path.join(carpeta, 'PROGRESO.md'))
  ? path.join(carpeta, 'PROGRESO.md').replace(/\\/g, '/')
  : null

if (!TICKET) {
  chequeos.push({
    id: 'progreso',
    estado: 'aviso',
    titulo: `no se pudo deducir el ticket de la rama "${RAMA}"`,
    detalle: ['pasalo con --ticket <CLAVE> para chequear su PROGRESO y sus docs'],
  })
} else {
  const texto = rutaProgreso ? fs.readFileSync(rutaProgreso, 'utf8') : ''
  const fechas = [...texto.matchAll(/^##\s+(\d{4}-\d{2}-\d{2})/gm)].map((m) => m[1])
  // Se le pasa el CONTENIDO: el chequeo mide que la entrada de hoy DIGA algo, no solo que
  // exista con la fecha correcta.
  chequeos.push(core.chequearProgreso(rutaProgreso, fechas, HOY, texto))
}

// --- 6. los docs del ticket no citan un loop muerto -----------------------------------------
function archivosDeTexto(dir) {
  const salida = []
  const caminar = (d) => {
    let entradas
    try { entradas = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of entradas) {
      const p = path.join(d, e.name)
      // Lista PROPIA, a proposito distinta de la de los gates (estructura-cambio.js): este
      // chequeo mide PROSA (que un .md/.js/.sql no cite una tool muerta), no sintaxis PL/SQL ni
      // convenciones de codigo, asi que el criterio de que carpeta excluir es otro. backup/,
      // app/ y objetos/ son copias verbatim (fuente viva, exports de APEX, snapshots de objetos):
      // su contenido no es prosa nuestra y dispara falsos por todos lados -los gates SI gatean
      // app/ y objetos/ (son PL/SQL/APEX de verdad) y no excluyen node_modules/ (no existe en un
      // change). docs/, entrega/ y PASE_* SI quedan adentro aca: son justamente donde vive la
      // prosa del ticket (el ER, notas del analista) que puede citar una tool que ya no existe.
      if (e.isDirectory()) {
        if (['backup', 'app', 'node_modules', 'objetos'].includes(e.name)) continue
        caminar(p)
      } else if (/\.(md|js|sql)$/.test(e.name)) salida.push(p)
    }
  }
  caminar(dir)
  return salida
}

if (carpeta && fs.existsSync(carpeta)) {
  const hallazgos = {}
  for (const archivo of archivosDeTexto(carpeta)) {
    // HECHO_CUANDO.md queda AFUERA de este chequeo, y es la unica excepcion. Todos los demas docs
    // describen lo que ES; ese describe lo que TIENE QUE LLEGAR A SER, y el loop pide escribirlo
    // ANTES de construir. Un criterio para una tool que todavia no existe es la definicion del
    // trabajo, no una instruccion rota: el 01/09 el gate marco `node agro.js kove-arranque` -escrito
    // esa manana como criterio de HN-ARRANQUE-TRAMO- y exigir que la tool exista primero es
    // exactamente lo contrario de escribir el criterio antes.
    //
    // No se pierde nada: si el criterio nombra una tool que no existe, `aceptacion` lo corre igual
    // y sale 2 -"no se pudo medir"-, que es mas honesto que un aviso de doc.
    if (path.basename(archivo) === 'HECHO_CUANDO.md') continue
    const h = core.buscarComandosObsoletos(fs.readFileSync(archivo, 'utf8'), TOOLS)
    if (h.length) hallazgos[archivo.replace(/\\/g, '/')] = h
  }
  chequeos.push(core.chequearDocs(hallazgos))
}

// --- 7. las preguntas abiertas quedan versionadas ----------------------------------------------
// Se le pasa el CONTENIDO, no un booleano de existencia: el chequeo cuenta las abiertas del
// archivo. `--preguntas` ya no decide nada -era autodeclarado por el agente y decidia el veredicto
// sin que nadie abriera el archivo-; se acepta por compatibilidad y se ignora.
if (carpeta) {
  const ruta = path.join(carpeta, 'PREGUNTAS.md')
  const contenido = fs.existsSync(ruta) ? fs.readFileSync(ruta, 'utf8') : null
  chequeos.push(core.chequearPreguntas(contenido))

  // La regla de parada del ticket. Se corre la tool en vez de repetir su logica aca: es la misma
  // que se usa a mano durante la tanda, asi que el cierre no puede dar un veredicto distinto del
  // que ya viste.
  const ac = spawnSync(process.execPath, ['agro.js', 'aceptacion', '--ticket', TICKET, '--json'],
    { encoding: 'utf8' })
  let veredictoAceptacion = null
  try {
    const i = String(ac.stdout || '').indexOf('{')
    if (i >= 0) veredictoAceptacion = JSON.parse(ac.stdout.slice(i))
  } catch { veredictoAceptacion = null }
  // Sin HECHO_CUANDO la tool sale 1 y no imprime JSON: eso NO es "no se pudo medir", es que no hay
  // regla de parada, y el chequeo tiene que decir eso.
  if (!veredictoAceptacion && ac.status === 1) veredictoAceptacion = { sinCriterios: true }
  chequeos.push(core.chequearAceptacion(veredictoAceptacion))

  // .El criterio se escribio ANTES de construir? Las dos fechas salen de git: la del primer commit
  // que trajo el HECHO_CUANDO y la del primer commit de codigo del ticket. Nada que declarar.
  const primeraFecha = (...rutas) => {
    const r = g.git('log', '--format=%ad', '--date=short', '--reverse', '--', ...rutas)
    return (r || '').split('\n').map((x) => x.trim()).filter(Boolean)[0] || null
  }
  const fechaCriterio = primeraFecha(path.join(carpeta, 'HECHO_CUANDO.md'))
  const fechaCodigo = primeraFecha(
    path.join(carpeta, 'sql'), path.join(carpeta, 'app'), path.join(carpeta, 'tests'),
    path.join(carpeta, 'scripts'))
  const criterioPrimero = core.chequearCriterioAntesDeConstruir({ criterio: fechaCriterio, codigo: fechaCodigo })
  if (criterioPrimero) chequeos.push(criterioPrimero)
}

// --- 14. los modos de falla del loop, de la telemetria que ya escribimos --------------------
// Fuera del bloque del ticket a proposito: los huecos del loop no son de un ticket, y mirarlos
// solo cuando se cierra uno los deja invisibles el resto del tiempo.
{
  const f = spawnSync(process.execPath, ['agro.js', 'fallos', '--json'], { encoding: 'utf8', maxBuffer: g.CAPACIDAD })
  let modos = null
  try { modos = JSON.parse(f.stdout) } catch { modos = null }
  chequeos.push(core.chequearModosDeFalla(modos))
}

// --- Kove: el cierre MIRA lo que hay para entregar, y NO lo mueve -----------------------------
// El 01/09 este barrido corria con `--guardar` en cada cierre. A las 14:18, con el tramo de la
// tarde EN CURSO, paso la tarea de ICC-124 a Entregado: la fila salio de la grilla de hoy, y
// `kove-actividad cerrar` -que busca la fila en esa grilla- se quedo sin donde impactar. A las
// 17:50 no habia nada que cerrar y la actividad hubo que cerrarla a mano.
//
// El orden correcto es CERRAR y despues ENTREGAR, nunca al reves, y quien lo garantiza es
// `kove-jornada` (cierra la actividad, carga las horas y recien ahi entrega). Un cierre del repo
// no tiene forma de saber si el tramo del dia termino: por eso ya no mueve nada.
//
// Decision del dueño (02/09): "eliminar los cron que mueven tareas, ya nos mordio y prefiero no
// tener mas" y "el problema es que pasas a entregado antes de cerrar y ahi se rompe porque ya no
// encontras". La tarea programada de Windows se borro el mismo dia; esto es la otra mitad.
//
// Queda el AVISO, que es lo que de verdad servia: decir cuantas hay para entregar y el comando.
// `entregar` sin `--guardar` es EN SECO: lee la grilla y no toca nada.
if (!args.includes('--sin-kove')) {
  console.log('')
  console.log('==> Kove: que hay para entregar (solo mira, NO mueve)')
  const b = spawnSync(process.execPath, ['agro.js', 'kove-actividad', 'entregar', '--hasta-hoy'],
    { encoding: 'utf8', maxBuffer: g.CAPACIDAD })
  const salida = String(b.stdout || '') + String(b.stderr || '')
  for (const l of salida.trim().split('\n').slice(-12)) if (l.trim()) console.log('   ' + l)
  const nadaQueEntregar = /no hay ninguna tarea vencida para entregar/i.test(salida)
  if (b.status !== 0) {
    chequeos.push({
      id: 'kove-barrido',
      estado: 'aviso',
      titulo: 'no se pudo mirar Kove: puede haber tareas por entregar y no lo sabemos',
      detalle: ['correlo solo para ver el motivo: node agro.js kove-actividad entregar --hasta-hoy'],
    })
  } else if (!nadaQueEntregar) {
    chequeos.push({
      id: 'kove-barrido',
      estado: 'aviso',
      titulo: 'hay tareas para pasar a Entregado, y el cierre NO las mueve',
      detalle: [
        'primero cerra la actividad del tramo, y recien despues entrega:',
        '  node agro.js kove-actividad cerrar <TICKET> --hice "..." --guardar',
        '  node agro.js kove-actividad entregar --hasta-hoy --guardar',
        'entregar antes de cerrar saca la fila de la grilla y la actividad queda sin poder cerrarse.',
      ],
    })
  }
}

// --- 8..12. los gaps que hasta hoy solo encontraba la simulacion a mano ------------------------
// Pedido del dueño (28/08/2026): "lo que busco es que un cierre encuentre gaps y los corrija sin
// que yo le diga nada". Estos cinco chequeos son la parte MEDIBLE de la simulacion de arranque sin
// contexto; lo que sigue necesitando criterio se declara abajo, no se da por bueno.

// La bitacora del ticket son DOS cosas: PROGRESO.md (las dos entradas mas nuevas) y el archivo por
// mes. Mirar solo PROGRESO.md daria rojo desde el tercer dia, cuando la entrada se archiva.
function bitacoraDelTicket(carpetaTicket) {
  const archivos = []
  const vivo = path.join(carpetaTicket, 'PROGRESO.md')
  if (fs.existsSync(vivo)) archivos.push(vivo)
  const archivo = path.join(carpetaTicket, 'progreso')
  if (fs.existsSync(archivo)) {
    for (const e of fs.readdirSync(archivo)) if (/\.md$/i.test(e)) archivos.push(path.join(archivo, e))
  }
  return archivos
}

// Un dia cuenta si tiene commits PROPIOS de la rama que tocaron algo de este ticket o del loop.
//   --first-parent  un merge de una rama de ticket no es trabajo hecho aca
//   --no-merges     medido el 28/08: sin esto, el 19/08 entra a main por 6 merges de GMCC-261
const SEPARADOR = '@@@'

function diasConCommits(rama, desde, carpetaTicket) {
  const salida = g.gitSalida('log', '--first-parent', '--no-merges', rama,
    `--since=${desde}`, '--date=short', '--name-only', `--format=${SEPARADOR}%ad${SEPARADOR}%s`)
  const porDia = new Map()
  let actual = null
  for (const linea of String(salida).split('\n')) {
    if (linea.startsWith(SEPARADOR)) {
      const [, fecha, asunto] = linea.split(SEPARADOR)
      actual = { fecha, asunto, cuenta: false }
      continue
    }
    const archivo = linea.trim()
    if (!actual || !archivo) continue
    const delTicket = carpetaTicket && archivo.startsWith(carpetaTicket.replace(/\\/g, '/') + '/')
    if (!delTicket && !core.archivosDeLoop([archivo]).length) continue
    if (actual.cuenta) continue
    actual.cuenta = true
    const d = porDia.get(actual.fecha) || { fecha: actual.fecha, commits: 0, muestra: actual.asunto }
    d.commits++
    porDia.set(actual.fecha, d)
  }
  return [...porDia.values()].sort((a, b) => a.fecha.localeCompare(b.fecha))
}

const DIAS = Number(flag('--dias') || 7)

if (carpeta && fs.existsSync(carpeta)) {
  // Las bitacoras son las del ticket Y la del change del loop (ver carpetasDeBitacora en
  // cierre-core): un dia de loop cuenta para este ticket y su entrada esta escrita alla.
  const bitacora = core.carpetasDeBitacora(carpeta, cambios.ruta(null)).flatMap(bitacoraDelTicket)
  const fechasEscritas = bitacora.flatMap((a) =>
    [...fs.readFileSync(a, 'utf8').matchAll(/^##\s+(\d{4}-\d{2}-\d{2})/gm)].map((m) => m[1]))

  const desde = new Date(Date.now() - DIAS * 86400000).toISOString().slice(0, 10)
  chequeos.push(core.chequearDiasSinEntrada(diasConCommits(RAMA, desde, carpeta), fechasEscritas, DIAS))

  // Los HN-* viven en el ledger del META, sea cual sea el ticket que los nombre.
  const LEDGER_LOOP = path.join('jira', 'META', 'FEATURES.json')
  let ledgerHN = null
  try {
    const j = JSON.parse(fs.readFileSync(LEDGER_LOOP, 'utf8'))
    ledgerHN = {}
    for (const f of j.features || []) ledgerHN[f.id] = !!f.passes
  } catch { /* sin ledger no se inventa un verde */ }

  const textoProgreso = rutaProgreso ? fs.readFileSync(rutaProgreso, 'utf8') : ''
  if (ledgerHN) {
    chequeos.push(core.chequearPendientesVencidos(core.pendientesDeLaBitacora(textoProgreso), ledgerHN))
  } else {
    chequeos.push({
      id: 'pendientes',
      estado: 'aviso',
      titulo: 'no pude leer el ledger del META: los pendientes NO se cruzaron',
      detalle: [LEDGER_LOOP],
    })
  }

  // Una ruta se resuelve contra la carpeta del DOCUMENTO y contra la raiz: con que una de las dos
  // exista alcanza. Solo contra la raiz da 5 falsos positivos de 5 (medido el 28/08); solo contra
  // el documento rompe toda ruta escrita desde la raiz, que es como se escriben casi todas.
  const docsConRutas = [rutaProgreso, path.join(carpeta, 'README.md')].filter((a) => a && fs.existsSync(a))
  const faltantes = []
  let miradas = 0
  for (const doc of docsConRutas) {
    const base = path.dirname(doc)
    const texto = fs.readFileSync(doc, 'utf8')
    // En el PROGRESO se parte cabecera (instrucciones vivas) de entradas con fecha (historia).
    const { cabecera, entradas } = /PROGRESO\.md$/i.test(doc)
      ? core.partirBitacora(texto)
      : { cabecera: texto, entradas: '' }
    const citas = [
      ...core.rutasCitadas(cabecera),
      ...core.rutasCitadas(entradas, { todoHistorico: true }),
    ]
    for (const cita of citas) {
      miradas++
      if (fs.existsSync(path.join(base, cita.ruta)) || fs.existsSync(path.join(RAIZ, cita.ruta))) continue
      faltantes.push({ ...cita, doc: doc.replace(/\\/g, '/') })
    }
  }
  chequeos.push(core.chequearRutasCitadas(faltantes, miradas))

  // El README declara el estado del ticket y nadie lo cruzaba.
  const rutaReadme = path.join(carpeta, 'README.md')
  let ledgerTicket = null
  try {
    const j = JSON.parse(fs.readFileSync(path.join(carpeta, 'FEATURES.json'), 'utf8'))
    const fs_ = j.features || []
    ledgerTicket = { pasan: fs_.filter((f) => f.passes).length, total: fs_.length }
  } catch { /* el ticket puede no tener ledger: es valido */ }
  if (fs.existsSync(rutaReadme)) {
    chequeos.push(core.chequearReadmeVsLedger(
      core.estadoDeclarado(fs.readFileSync(rutaReadme, 'utf8')), ledgerTicket))
  }
}

// Los caracteres de control se buscan en lo que ESTA SESION toco: los commits de hoy mas lo suelto.
// El 21/08 una ruta de Windows escrita desde un script quedo con un BACKSPACE adentro y ningun gate
// lo vio -no se ve al leer el archivo-.
{
  const deHoy = g.gitSalida('log', '--first-parent', '--no-merges', RAMA,
    `--since=${HOY}`, '--name-only', '--format=').split('\n')
  // `git status --porcelain` COLAPSA una carpeta nueva entera en una sola linea ("?? carpeta/"), asi
  // que sus archivos serian invisibles. Se expande a mano: es justo el caso de un ticket recien
  // creado, donde el texto se escribio desde un script y es donde aparecio el backspace.
  const expandir = (a) => {
    if (!fs.existsSync(a) || !fs.statSync(a).isDirectory()) return [a]
    return fs.readdirSync(a, { withFileTypes: true })
      .flatMap((e) => (e.name === 'node_modules' ? [] : expandir(path.join(a, e.name))))
  }
  const tocados = [...new Set([...deHoy, ...sucios].map((a) => a.trim()).filter(Boolean).flatMap(expandir))]
    .filter((a) => /\.(md|js|json|sql|ya?ml|txt)$/i.test(a))
    .filter((a) => fs.existsSync(a))
  const hallazgos = {}
  for (const a of tocados) {
    const h = core.caracteresDeControl(fs.readFileSync(a, 'utf8'))
    if (h.length) hallazgos[a.replace(/\\/g, '/')] = h
  }
  chequeos.push(core.chequearCaracteresDeControl(hallazgos, tocados.length))
}

// --- salida ------------------------------------------------------------------------------------
const MARCA = { ok: 'OK   ', falta: 'FALTA', aviso: 'AVISO' }

console.log(`== cierre de ${RAMA}${TICKET ? ` (ticket ${TICKET})` : ''} ==\n`)
for (const c of chequeos) {
  console.log(`  ${MARCA[c.estado]}  ${c.titulo}`)
  for (const d of c.detalle) console.log(`           ${d}`)
}

const r = core.resumir(chequeos)
console.log(`\n  ${r.ok} ok, ${r.faltan} falta/n, ${r.avisos} aviso/s`)

// Lo que esta tool NO puede ver, y por eso no simula ver.
console.log('\n  Esto no lo mide (necesita la BD, o criterio):')
console.log('    - page locks de APEX .......... node agro.js apex-lock mias')
console.log('    - el repo contra la base ...... node agro.js db-drift <sql>  /  node agro.js apex-drift <export>')
console.log('    - el ledger del ticket ........ node agro.js features' + (TICKET ? ` ${TICKET}` : ''))
console.log('    - lo aprendido a memory/ y al playbook, y corregir lo que quedo falso')
console.log('    - los transcripts de subagente de esta sesion, antes de que Temp los limpie:')
console.log('        node agro.js traza --archivar')
console.log('      (traza los lee para reconstruir el arbol de delegacion; sin archivar, el')
console.log('       insumo dura lo que dure Temp -ver jira/META/design-traza.md-)')
// Este es el unico que caza un archivo que MIENTE. Los chequeos de arriba miden que los
// documentos existan y esten versionados, no que lo que dicen siga siendo cierto. Va ULTIMO y
// con mayusculas porque es el que mas se saltea, y con el pedido explicito de REPORTARLO: sin el
// aviso, el dueno no tiene forma de saber si se corrio (pedido del dueno, 21/08/2026).
console.log('')
console.log('    >> SIEMPRE, sin que te lo pidan: SIMULAR UN ARRANQUE SIN CONTEXTO.')
console.log('       De la simulacion, el gate YA MIDE: los dias sin entrada, los pendientes que')
console.log('       nombran fichas ya cerradas, las rutas que no existen, el N/M del README y los')
console.log('       caracteres de control. Lo que NO mide y hay que leer a ojo:')
console.log('         - lo que solo se entiende habiendo estado en la conversacion')
console.log('         - una entrada que dice lo CONTRARIO de lo que paso (el texto, no las cifras)')
console.log('         - una decision que se tomo en el chat y nunca bajo a PREGUNTAS.md')
console.log('       Despues DECIR QUE SE ENCONTRO, aunque sea "nada".')
console.log('       Detalle y que suele aparecer: memory/playbooks/lead.md, seccion del cierre.')

if (!r.completo) {
  console.log('\nEl cierre esta INCOMPLETO: arregla lo que dice FALTA y volve a correr.')
  process.exit(1)
}
console.log('\nCierre completo.')
