// arranque-frio.js - simula el arranque de un agente SIN CONTEXTO y caza lo que el repo desmiente.
//
// Uso: node agro.js arranque-frio [--paquete] [--json]
//   --paquete   imprime lo que leeria un agente nuevo, para pasarselo a uno de verdad
//
// Por que existe: el playbook del lead pide "simular un arranque sin contexto" y `cierre` lo
// imprimia como recordatorio, o sea que dependia de que alguien se acordara. El 29/08/2026 el
// cierre dio 7 ok mientras `work/PROGRESO.md` decia tres cosas falsas: una pregunta ya respondida,
// un pendiente ya hecho y una frase mutilada por un reemplazo. Ninguna la ve un gate de formato:
// los documentos EXISTIAN y estaban versionados. Lo que fallaba es que MENTIAN.
//
// Dos capas, porque son dos problemas distintos:
//
//   1. Las CONTRADICCIONES las mide esta tool: el documento afirma algo que el repo desmiente
//      -"falta traer X" cuando X ya esta-. Eso no necesita criterio, necesita comparar.
//   2. Si lo escrito ALCANZA para retomar necesita criterio, y no lo puede juzgar quien escribio
//      el documento: lo juzga un agente sin contexto leyendo `--paquete`. El sesgo del que ya
//      sabe la respuesta es justamente lo que hace que un documento incompleto parezca completo.

const fs = require('fs')
const path = require('path')
const core = require('../lib/arranque-core')
const { descubrirTools } = require('../lib/tools-registro')
const cambios = require('../lib/carpeta-cambios')
const dispatcher = require('../lib/dispatcher')

const RAIZ = process.cwd()
const argv = process.argv.slice(2)

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`Uso: node ${dispatcher.nombre()} arranque-frio [--paquete] [--json]`)
  console.log('  compara lo que dicen los documentos de arranque contra lo que el repo tiene.')
  console.log('  --paquete  imprime lo que leeria un agente nuevo (para dárselo a uno de verdad)')
  console.log('  sale 1 si encuentra una contradiccion.')
  process.exit(0)
}

const leer = (r) => { try { return fs.readFileSync(path.join(RAIZ, r), 'utf8') } catch { return null } }

// Lo que un agente nuevo lee, y nada mas. El orden es el del arranque real.
// Aca la bitacora vive por ticket, no en work/: la del loop es la del change del loop.
// Apuntar al archivo equivocado hace que el chequeo mire un documento vacio y de verde por eso;
// por eso la ruta se DEDUCE del proyecto (scripts/lib/carpeta-cambios.js) y no se escribe.
const DOCUMENTOS = ['CLAUDE.md', 'AGENTS.md', 'memory/MEMORY.md',
  cambios.archivoDelLoop('PROGRESO.md')]

// El ESTADO, que es lo que el paquete no traia. Medido el 07/09/2026 con un agente sin contexto:
// con los cuatro documentos de arriba pudo decir que paso, y NO pudo empezar. Le faltaba lo que
// el paquete nombraba y no incluia -"el paquete apunta afuera de si mismo"-:
//   - el ledger: sin el, los HN-* son etiquetas opacas ("no puedo tomar una tarea, solo su nombre")
//   - las preguntas abiertas: sin ellas se puede arrancar algo que ya esta bloqueado
//   - el mes en curso: es a donde el propio PROGRESO manda "para el detalle"
const mesEnCurso = () => {
  const d = new Date()
  const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}.md`
  return cambios.archivoDelLoop('progreso', mes)
}

// Las categorias cuyo COMO-se-verifica va completo en el paquete. Medido el 07/09: con solo el
// enunciado, un lector en frio puede ELEGIR una tarea y no puede empezarla -"me faltan los pasos,
// y el paquete dice que viven en el archivo"-. Los pasos de las 41 abiertas son 52 KB; los de estas
// cinco, 18. Se trae lo que se va a tomar, no todo.
const CON_PASOS = ['critico', 'seguridad']

// El ledger crudo son 157 KB: se rinde lo que FALTA, con su enunciado.
function ledgerAbierto() {
  const ruta = cambios.archivoDelLoop('FEATURES.json')
  const crudo = leer(ruta)
  if (crudo === null) return `## ${ruta}  (NO EXISTE)`
  let lista
  try { lista = JSON.parse(crudo).features || [] } catch { return `## ${ruta}  (NO SE PUDO LEER)` }
  const abiertas = lista.filter((x) => !x.passes)
  const out = [
    `## ${ruta} - lo que FALTA (${lista.length - abiertas.length}/${lista.length} hechas)`,
    '',
    `Las de categoria ${CON_PASOS.join('/')} van con sus PASOS -el como se verifica cada una-.`,
    'Las demas, solo con el enunciado: sus pasos se leen del archivo al elegirla.',
    '',
  ]
  for (const x of abiertas) {
    out.push(`- **${x.id}** (${x.categoria}): ${String(x.descripcion || '').replace(/\s+/g, ' ')}`)
    if (CON_PASOS.includes(x.categoria)) {
      for (const p of x.pasos || []) out.push(`    - ${String(p).replace(/\s+/g, ' ')}`)
    }
    out.push('')
  }
  return out.join('\n')
}

// Las preguntas que FRENAN. Se leen del mismo PREGUNTAS.md que va en el paquete: si hay alguna,
// se resuelve antes de tomar cualquier cosa, y el agente tiene que verlo sin buscarlo.
// Las que un agente puede tomar YA: categoria con pasos en el paquete.
function fichasArrancables() {
  const crudo = leer(cambios.archivoDelLoop('FEATURES.json'))
  if (crudo === null) return []
  try {
    return (JSON.parse(crudo).features || [])
      .filter((x) => !x.passes && CON_PASOS.includes(x.categoria))
      .map((x) => x.id)
  } catch { return [] }
}

function bloqueantes() {
  const t = leer(cambios.archivoDelLoop('PREGUNTAS.md'))
  if (t === null) return null
  const m = /\*\*Bloquean\*\*([\s\S]*?)(?:\n\*\*|\n## )/.exec(t)
  if (!m) return null
  return (m[1].match(/^- \*\*/gm) || []).length
}

// De donde salen las senales para elegir: la entrada mas nueva del puente y las fichas que NOMBRA.
// No se inventa un proximo paso -eso lo decide quien trabaja-, se muestra que toco la ultima sesion.
function senales() {
  const t = leer(cambios.archivoDelLoop('PROGRESO.md')) || ''
  const m = /^## (\d{4}-\d{2}-\d{2})[^\n]*-\s*(.+)$/m.exec(t)
  const corte = m ? t.slice(t.indexOf(m[0])) : ''
  const sig = corte.slice(0, corte.indexOf('\n## ') > 0 ? corte.indexOf('\n## ') : corte.length)
  const ids = [...new Set(sig.match(/HN-[A-Z0-9-]+/g) || [])]
  return { fecha: m ? m[1] : null, titulo: m ? m[2] : null, ids }
}

if (argv.includes('--paquete')) {
  console.log('# Paquete de arranque en frio')
  console.log('')
  console.log('Esto es TODO lo que ve un agente que abre el repo sin haber estado en la sesion.')
  console.log('Si con esto no puede decir que se hizo, que sigue y con que empezar, no alcanza.')

  // Las senales para elegir, ARRIBA. El 07/09 un lector en frio conto 41 problemas fichados y ni
  // una linea que dijera por donde empezar: la ultima pista de proximo paso era de seis dias antes.
  const s = senales()
  const b = bloqueantes()
  console.log('\n## Por donde empezar')
  console.log('')
  console.log('Esto NO es una orden: son las senales que hay en los mismos documentos de abajo,')
  console.log('juntas y arriba. La eleccion es de quien trabaja.')
  console.log('')
  if (b === null) console.log('- Preguntas que bloquean: **no se pudo leer PREGUNTAS.md**')
  else if (b > 0) console.log(`- **${b} pregunta(s) BLOQUEAN**: se resuelven antes de tomar nada (ver PREGUNTAS.md abajo)`)
  else console.log('- Preguntas que bloquean: ninguna anotada (el gate que las cuenta tiene ficha propia: HN-CIERRE-PREGUNTAS-ABIERTAS-FALSO-VERDE)')
  if (s.fecha) console.log(`- Ultima sesion (${s.fecha}): ${s.titulo}`)
  if (s.ids.length) console.log(`- Fichas que esa entrada NOMBRA: ${s.ids.join(', ')}`)
  else console.log('- Esa entrada no nombra ninguna ficha: la pista de por donde seguir hay que buscarla en el ledger')
  // Nombrar lo que se puede EMPEZAR, no solo lo que la ultima entrada menciona. El 07/09 un lector
  // en frio marco que las dos fichas que esta seccion nombraba eran justo las que no se podian
  // arrancar -una sin pasos, la otra esperando una decision-: "el encabezado te apunta a lo que no
  // podes arrancar".
  const arrancables = fichasArrancables()
  if (arrancables.length) {
    console.log(`- Se pueden EMPEZAR sin abrir otro archivo (van abajo con sus PASOS): ${arrancables.join(', ')}`)
  }
  console.log('')

  for (const d of [...DOCUMENTOS, cambios.archivoDelLoop('PREGUNTAS.md'), mesEnCurso()]) {
    const t = leer(d)
    console.log(`\n---\n\n## ${d}${t === null ? '  (NO EXISTE)' : ''}\n`)
    if (t !== null) console.log(t.trimEnd())
  }
  console.log('\n---\n')
  console.log(ledgerAbierto())
  process.exit(0)
}

const tools = descubrirTools(RAIZ)
const existeRuta = (r) => fs.existsSync(path.join(RAIZ, r))
const esToolConocida = (t) => tools.has(t)

const hallazgos = []
for (const d of DOCUMENTOS) {
  const texto = leer(d)
  if (texto === null) continue
  const pendientes = core.pendientesDe(texto)
  for (const h of core.contradicciones(pendientes, { existeRuta, esToolConocida })) {
    hallazgos.push({ ...h, archivo: d })
  }
  // Las referencias colgadas NO se miran sobre estos documentos: `work/PROGRESO.md` narra tambien
  // el trabajo hecho en repos HERMANOS, y sus rutas no existen aca por diseño. Medido el 06/09:
  // 4 hallazgos, los 4 falsos -`docs/conversaciones/` y `tesis/esqueleto/` son del repo de tesis-.
  // Ninguna heuristica de rutas distingue "ruta rota" de "ruta de otro repo", y el chequeo de
  // referencias muertas de `cierre` ya cubre los documentos donde una ruta rota si importa.
}

const r = core.resumir(hallazgos)

if (argv.includes('--json')) {
  console.log(JSON.stringify({ ok: r.ok, total: r.total, porTipo: r.porTipo, hallazgos }, null, 2))
  process.exit(r.ok ? 0 : 1)
}

console.log('==> arranque en frio: lo escrito contra lo que el repo tiene')
console.log(`  documentos mirados: ${DOCUMENTOS.filter((d) => leer(d) !== null).length}/${DOCUMENTOS.length}`)

if (r.ok) {
  console.log('  sin contradicciones mecanicas')
} else {
  console.log('')
  for (const h of hallazgos) {
    console.log(`  ${h.archivo}${h.linea ? `:${h.linea}` : ''}  ${h.detalle}`)
  }
}

console.log('')
console.log('  Esto NO mide si lo escrito alcanza para retomar: eso necesita criterio, y no lo')
console.log('  puede juzgar quien escribio el documento. Para eso:')
console.log(`    node ${dispatcher.nombre()} arranque-frio --paquete`)
console.log('  y pasaselo a un agente SIN contexto, pidiendole que conteste, solo con eso:')
console.log('    1. que se hizo en la ultima sesion   2. que sigue   3. que se contradice')

process.exit(r.ok ? 0 : 1)
