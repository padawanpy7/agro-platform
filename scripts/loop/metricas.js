// metricas.js - cuanto TIEMPO y cuantos TOKENS costo cada ticket.
//
// De donde salen los datos: de los transcripts que Claude Code ya escribe en
// ~/.claude/projects/<proyecto>/<sesion>.jsonl. Ahi esta, por mensaje, el `usage` (tokens de
// entrada/salida/cache), el `timestamp` y la `gitBranch` -que en este repo ES el ticket, porque
// una tarea = una rama-. El tiempo de cada herramienta sale de emparejar el `tool_use` con su
// `tool_result` por id. No hace falta instrumentar nada: ya esta todo escrito.
//
// Para que sirve (lo que pidio el dueño):
//   - ver que tarea se llevo demasiado tiempo y POR QUE (ranking de herramientas por tiempo);
//   - ver cuantos tokens costo cada llamada de herramienta: si el numero es alto, se resolvio
//     mucho "a mano" y quiza eso merece convertirse en una herramienta para todos.
//
// Escribe el resultado en el repo PRINCIPAL (main), no en el worktree del ticket: es informacion
// de TODOS los tickets y tiene que vivir en un solo lugar.
//
// Uso: node agro.js metricas [--dias N] [--ticket CLAVE] [--salida RUTA] [--json]

const fs = require('fs')
const path = require('path')
const { agregar, reporte, resumenUso } = require('../lib/metricas-core')
const { PROYECTOS } = require('../lib/transcripts')

const RAIZ = path.join(__dirname, '..', '..')

function ayuda() {
  console.log(`Uso: node agro.js metricas [--dias N] [--ticket CLAVE] [--salida RUTA] [--json]

  --dias N      solo los ultimos N dias (default: todo)
  --ticket X    solo ese ticket
  --salida R    donde escribir el reporte (default: el repo principal, metrics/por-ticket.md)
  --json        ademas del .md, deja el agregado crudo en .json

Lee los transcripts de Claude Code (${PROYECTOS}). Solo lectura.`)
}

function args(argv) {
  const a = { dias: null, ticket: null, salida: null, json: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dias') a.dias = Number(argv[++i])
    else if (argv[i] === '--ticket') a.ticket = argv[++i]
    else if (argv[i] === '--salida') a.salida = argv[++i]
    else if (argv[i] === '--json') a.json = true
    else if (argv[i] === '--help' || argv[i] === '-h') { ayuda(); process.exit(0) }
  }
  return a
}

function* transcripts() {
  if (!fs.existsSync(PROYECTOS)) return
  for (const proyecto of fs.readdirSync(PROYECTOS)) {
    const dir = path.join(PROYECTOS, proyecto)
    if (!fs.statSync(dir).isDirectory()) continue
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.jsonl')) yield path.join(dir, f)
    }
  }
}

// Normaliza un transcript a los eventos que entiende el core. Una linea rota no corta la corrida:
// un transcript se escribe mientras la sesion vive y la ultima linea puede estar a medio escribir.
// El texto con que volvio una tool. Viene como string o como lista de bloques; se recorta porque lo
// unico que se le pregunta es si arranca con el acuse de un lanzamiento asincrono.
function textoDeResultado(b) {
  const c = b.content
  const t = Array.isArray(c) ? c.map((x) => (x && x.text) || '').join(' ') : c
  return String(t || '').slice(0, 120)
}

function eventosDe(archivo, corte) {
  const salida = []
  let texto
  try { texto = fs.readFileSync(archivo, 'utf8') } catch (e) { return salida }
  const sesion = path.basename(archivo, '.jsonl')
  for (const linea of texto.split('\n')) {
    if (!linea.trim()) continue
    let j
    try { j = JSON.parse(linea) } catch (e) { continue }
    const ts = j.timestamp
    if (!ts || (corte && ts < corte)) continue
    const ticket = j.gitBranch || null

    const u = j.message && j.message.usage
    if (u) {
      salida.push({ tipo: 'uso', ts, ticket, sesion, tokens: {
        entrada: u.input_tokens || 0,
        salida: u.output_tokens || 0,
        cacheLectura: u.cache_read_input_tokens || 0,
        cacheEscritura: u.cache_creation_input_tokens || 0,
      } })
    }

    const contenido = j.message && j.message.content
    if (Array.isArray(contenido)) {
      for (const b of contenido) {
        // `subagent_type` solo esta en las llamadas a un agente; para el resto queda undefined y el
        // core lo ignora. Del resultado se guarda solo el ARRANQUE del texto: alcanza para saber si
        // es el acuse de un lanzamiento asincrono, y no arrastra el informe entero a memoria.
        if (b.type === 'tool_use') {
          salida.push({ tipo: 'tool', ts, ticket, sesion, tool: b.name, id: b.id, agente: (b.input || {}).subagent_type, comando: (b.input || {}).command })
        }
        if (b.type === 'tool_result') {
          salida.push({ tipo: 'result', ts, ticket, sesion, id: b.tool_use_id, resultado: textoDeResultado(b) })
        }
      }
    }
  }
  return salida
}

// El reporte vive en el repo PRINCIPAL: es de todos los tickets, no de este worktree. Se busca al
// lado (../bf-db-workspace); si no esta, se escribe aca y se avisa.
function destinoPorDefecto() {
  const principal = path.join(RAIZ, '..', 'bf-db-workspace')
  const enPrincipal = fs.existsSync(path.join(principal, '.git'))
  const base = enPrincipal ? principal : RAIZ
  if (!enPrincipal) {
    console.error(`AVISO: no encontre el repo principal en ${principal}: el reporte queda en este worktree.`)
  }
  return path.join(base, 'metrics', 'por-ticket.md')
}

function main() {
  const a = args(process.argv.slice(2))
  const corte = a.dias ? new Date(Date.now() - a.dias * 86400000).toISOString() : null

  let eventos = []
  let n = 0
  for (const t of transcripts()) { eventos = eventos.concat(eventosDe(t, corte)); n++ }
  if (!eventos.length) {
    console.error('No hay nada que medir: no se encontraron transcripts con actividad.')
    process.exit(1)
  }

  let agregado = agregar(eventos)
  if (a.ticket) {
    agregado = Object.fromEntries(Object.entries(agregado)
      .filter(([k]) => k.toUpperCase() === a.ticket.toUpperCase()))
    if (!Object.keys(agregado).length) {
      console.error(`No hay actividad registrada para ${a.ticket}.`)
      process.exit(1)
    }
  }

  // El log del contador de uso vive al lado del reporte, en el repo principal.
  const logUso = path.join(path.dirname(a.salida ? path.resolve(a.salida) : destinoPorDefecto()), 'tool-usage.log')
  let usos = []
  try {
    usos = fs.readFileSync(logUso, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => {
      const [ts, tool] = l.split('\t')
      return { ts, tool }
    })
  } catch (e) { /* sin log todavia: el reporte igual sale, solo que sin esa seccion */ }

  const destino = a.salida ? path.resolve(a.salida) : destinoPorDefecto()
  fs.mkdirSync(path.dirname(destino), { recursive: true })
  fs.writeFileSync(destino, reporte(agregado) + resumenUso(usos, corte))
  console.log(`${n} transcript(s) leidos, ${Object.keys(agregado).length} ticket(s).`)
  console.log(`Reporte -> ${destino}`)

  if (a.json) {
    const j = destino.replace(/\.md$/, '.json')
    fs.writeFileSync(j, JSON.stringify(agregado, null, 2) + '\n')
    console.log(`Crudo   -> ${j}`)
  }
}

main()
