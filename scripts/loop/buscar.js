// Busca texto en las sesiones PASADAS y devuelve el contexto, no el archivo entero.
//
// Por que existe: la pregunta "que decidimos sobre X" hoy se contesta abriendo PROGRESO, los
// playbooks y los ledgers y leyendolos. Eso es justo lo que hace lenta a una sesion: cada
// respuesta que no esta indexada se paga metiendo archivos al contexto. El material ya esta en
// disco -Claude Code escribe cada sesion en ~/.claude/projects/<proyecto>/<sesion>.jsonl, y este
// repo tiene 230 transcripts en 17 carpetas, una por worktree- pero nadie lo lee para BUSCAR:
// `metricas` los recorre solo para medir tiempos.
//
// La idea es de Hermes (Nous Research), que indexa las sesiones con FTS5 para "recall entre
// sesiones". Aca no hace falta el indice: 349 MB se barren en segundos y un indice es un archivo
// mas que se desactualiza. Si algun dia deja de alcanzar, ahi se agrega.
//
// Que devuelve: una linea por coincidencia con la fecha, quien hablo, el ticket (sale del nombre
// de la carpeta del proyecto, que es el worktree) y el fragmento. Nunca el mensaje entero: el
// punto es NO volcar tokens al contexto.
//
// SOLO LEE. Ni escribe ni toca el repo.
// Uso: node agro.js buscar <texto> [--ticket X] [--desde AAAA-MM-DD] [--yo|--claude] [--ancho N] [--max N]

const fs = require('fs')
const path = require('path')

const { PROYECTOS } = require('../lib/transcripts')

const args = process.argv.slice(2)
const tiene = (n) => args.includes(n)
const flag = (n, def) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : def }

if (!args.length || tiene('-h') || tiene('--help')) {
  console.log('Uso: node agro.js buscar <texto> [--ticket X] [--desde AAAA-MM-DD] [--yo] [--claude] [--ancho N] [--max N]')
  console.log('  Busca en las sesiones pasadas y muestra el fragmento, no el archivo.')
  console.log('  --ticket   solo las sesiones de ese worktree (ICC-13, GMCC-261, main...)')
  console.log('  --desde    solo mensajes desde esa fecha')
  console.log('  --yo       solo lo que escribio el dueño;  --claude  solo lo que contesto el agente')
  console.log('  --ancho    caracteres de contexto alrededor del match (default 140)')
  console.log('  --max      tope de coincidencias (default 30)')
  console.log(`  Lee ${PROYECTOS}. Solo lectura.`)
  process.exit(0)
}

const texto = args.filter((a, i) => !a.startsWith('--') && !String(args[i - 1] || '').startsWith('--')).join(' ').trim()
if (!texto) {
  console.error('falta el texto a buscar. Ver --help.')
  process.exit(2)
}

const soloTicket = flag('--ticket', null)
const desde = flag('--desde', null)
const ancho = Number(flag('--ancho', 140))
const max = Number(flag('--max', 30))
const soloYo = tiene('--yo')
const soloClaude = tiene('--claude')

// Sin tildes y en minuscula de los dos lados: en un repo que escribe en español, buscar "digito"
// y no encontrar "dígito" es el caso normal, no el raro. La comparacion se hace siempre sobre la
// forma normalizada; lo que se IMPRIME es el texto original.
const normalizar = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const aguja = normalizar(texto)

// El nombre de la carpeta del proyecto es la ruta del worktree con los separadores cambiados:
// "C--bffamiliar-bf-db-workspace-ICC-13" -> ICC-13. La carpeta del principal queda como "main",
// que es la rama que tiene chequeada.
function ticketDe(carpeta) {
  const m = carpeta.match(/bf-db-workspace-(.+)$/i)
  if (!m) return /bf-db-workspace$/i.test(carpeta) ? 'main' : carpeta
  return m[1]
}

function* transcripts() {
  if (!fs.existsSync(PROYECTOS)) return
  for (const carpeta of fs.readdirSync(PROYECTOS)) {
    const ticket = ticketDe(carpeta)
    if (soloTicket && ticket.toLowerCase() !== soloTicket.toLowerCase()) continue
    const dir = path.join(PROYECTOS, carpeta)
    let entradas = []
    try { entradas = fs.readdirSync(dir, { withFileTypes: true }) } catch { continue }
    for (const e of entradas) {
      if (e.isFile() && e.name.endsWith('.jsonl')) { yield { archivo: path.join(dir, e.name), ticket }; continue }
      // Cada sesion puede tener una carpeta <sesion>/subagents/ con el transcript de cada
      // subagente. Ahi vive trabajo real -lo que midio o encontro un especialista- y quedaba
      // afuera de la busqueda por leer un solo nivel: 155 de los 230 transcripts del repo.
      if (!e.isDirectory()) continue
      const sub = path.join(dir, e.name, 'subagents')
      let hijos = []
      try { hijos = fs.readdirSync(sub) } catch { continue }
      for (const f of hijos) if (f.endsWith('.jsonl')) yield { archivo: path.join(sub, f), ticket, subagente: true }
    }
  }
}

// De un mensaje sacamos SOLO el texto humano: el `text` del asistente y el content del usuario
// cuando es string. Los tool_result quedan afuera a proposito -son volcados de comandos, ruido
// para esta busqueda- y son la mayor parte de los 349 MB.
function textoDe(j) {
  const c = j.message && j.message.content
  if (typeof c === 'string') return c
  if (Array.isArray(c)) return c.filter((x) => x && x.type === 'text').map((x) => x.text).join('\n')
  return ''
}

const limpio = (s) => String(s).replace(/\s+/g, ' ').trim()

const hallazgos = []
let leidos = 0

for (const { archivo, ticket, subagente } of transcripts()) {
  let contenido
  try { contenido = fs.readFileSync(archivo, 'utf8') } catch { continue }
  leidos++
  // El barrido cuesta menos que parsear: si la aguja no esta en el archivo, no hay JSON que leer.
  if (!normalizar(contenido).includes(aguja)) continue

  for (const linea of contenido.split('\n')) {
    if (!linea.trim()) continue
    // Un transcript se escribe mientras la sesion vive: la ultima linea puede estar a medias.
    let j
    try { j = JSON.parse(linea) } catch { continue }
    if (j.type !== 'user' && j.type !== 'assistant') continue
    if (soloYo && j.type !== 'user') continue
    if (soloClaude && j.type !== 'assistant') continue
    // Un `user` con tool_result no lo escribio una persona: es la salida de un comando.
    if (j.type === 'user' && typeof (j.message && j.message.content) !== 'string') continue
    if (desde && String(j.timestamp || '') < desde) continue

    const t = textoDe(j)
    if (!t) continue
    const donde = normalizar(t).indexOf(aguja)
    if (donde < 0) continue

    const ini = Math.max(0, donde - Math.floor(ancho / 2))
    hallazgos.push({
      fecha: String(j.timestamp || '').slice(0, 16).replace('T', ' '),
      quien: j.type === 'user' ? 'IMDX  ' : (subagente ? 'agente' : 'claude'),
      ticket,
      sesion: path.basename(archivo, '.jsonl').slice(0, 8),
      frag: (ini > 0 ? '...' : '') + limpio(t.slice(ini, ini + ancho)) + (ini + ancho < t.length ? '...' : ''),
    })
  }
}

hallazgos.sort((a, b) => (a.fecha < b.fecha ? 1 : -1))

// Leer CERO transcripts no es "no encontre nada": es que no hay donde buscar. Los dos se leian
// igual -"sin coincidencias"- y no son lo mismo.
//
// No es hipotetico: ese registro -251 archivos, 422 MB al 31/08- vive FUERA del repo, en
// `~/.claude/projects/`, en un solo disco, y en carpetas **cuyo nombre sale de la RUTA del repo**.
// Mover o renombrar el repo lo deja huerfano, que es exactamente lo que ya paso con `memory/` y por
// lo que la memoria se mudo adentro de git. 422 MB no se pueden versionar, asi que lo unico que
// queda es que, cuando falte, se diga en voz alta.
if (!leidos) {
  console.error(`no hay ningun transcript que buscar${soloTicket ? ` para ${soloTicket}` : ''}.`)
  console.error(`Tendrian que estar en ${PROYECTOS}, en una carpeta por worktree.`)
  console.error('Ese registro vive FUERA del repo y su carpeta se llama como la RUTA del repo:')
  console.error('si el repo se movio o se renombro, las sesiones viejas quedaron con el nombre anterior.')
  process.exit(2)
}

if (!hallazgos.length) {
  console.log(`sin coincidencias de "${texto}" en ${leidos} transcript(s)` + (soloTicket ? ` de ${soloTicket}` : ''))
  process.exit(0)
}

const anchoTicket = Math.max(6, ...hallazgos.slice(0, max).map((h) => h.ticket.length))
for (const h of hallazgos.slice(0, max)) {
  console.log(`${h.fecha}  ${h.quien}  ${h.ticket.padEnd(anchoTicket)}  ${h.frag}`)
}

console.log('')
console.log(`${hallazgos.length} coincidencia(s) en ${leidos} transcript(s)` + (hallazgos.length > max ? ` - se muestran ${max}, subilo con --max` : ''))
const porTicket = {}
for (const h of hallazgos) porTicket[h.ticket] = (porTicket[h.ticket] || 0) + 1
const ranking = Object.entries(porTicket).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} (${n})`)
if (ranking.length > 1) console.log(`por ticket: ${ranking.join(', ')}`)
