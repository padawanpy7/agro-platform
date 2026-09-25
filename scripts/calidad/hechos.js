// hechos.js - el gate de `memory/hechos/`: que la memoria se pueda encontrar y no mienta.
//
// Uso: node agro.js hechos [--json] [--indice]
//
// Sale con 1 si algo BLOQUEA. Verifica cuatro cosas, y las cuatro salieron de fallas reales:
//
//   1. Frontmatter sano (name = archivo, description presente, estado de un conjunto CERRADO).
//   2. Un hecho `superado` dice CUAL lo reemplaza, y ese existe. Del research del 31/08 sobre
//      deepseek-harness: cambiar una decision no es editar el hecho viejo, es escribir uno nuevo
//      que lo supersede; editar el viejo borra por que se habia decidido lo anterior.
//   3. Lo `archivado` NO figura en un indice, y lo vigente SI. El indice es lo que se lee: un
//      hecho fuera de todo indice es invisible, y uno archivado adentro se cita como autoridad de
//      lo que pasa hoy. Esta es la unica regla que AVISA en vez de bloquear -ver BLOQUEANTES-.
//   4b. Ningun hecho manda correr una tool que ya no existe. El cierre ya lo verificaba en los
//       docs DEL TICKET y nadie lo verificaba en la memoria, que es lo que se lee en TODA tarea:
//       un hecho que dice "corre bash scripts/lint.sh" es una instruccion rota para siempre, y
//       encima con mas alcance que un doc de ticket.
//
//   4. Toda ruta de ESTE repo que un hecho cita existe. El 31/08, mover un archivo dejo 8 punteros
//      rotos -uno dentro de un script que corre- y nada lo noto; al encender el gate aparecieron
//      otros 40, casi todos de cuando las tools eran `.sh` sueltos.
//   5. Todo wikilink `[[slug]]` en una fuente de CONTRATO (AGENTS.md, CLAUDE.md, MEMORY.md,
//      playbooks, skills, roles) apunta a un hecho que existe. Sin esto, `hechos` podia dar OK
//      sobre un universo vacio (0 en disco) mientras esas fuentes citaban hechos que nunca se
//      escribieron: cambios/META/LIMPIEZA.md §4.
//
// El indice NO es solo `memory/MEMORY.md`: un hecho de una disciplina se enlaza desde su playbook
// (`memory/playbooks/db.md` enlaza 41), y eso es lo correcto -al indice global solo va lo que sirve
// en CUALQUIER tarea-. Mirar solo MEMORY.md daria 153 falsos positivos.
//
// La logica vive en `scripts/lib/hechos-core.js` y se prueba sola; aca solo se lee el disco.

const fs = require('fs')
const path = require('path')
const core = require('../lib/hechos-core')
// El detector de comandos muertos ya existe y esta probado: se reusa, no se copia. Vive en
// cierre-core porque nacio para los docs del ticket; la regla es la misma.
const { buscarComandosObsoletos } = require('../lib/cierre-core')

const RAIZ = process.cwd()
const DIR = path.join(RAIZ, 'memory', 'hechos')
const argv = process.argv.slice(2)

// Un gate que no encuentra su material NO da verde: dice que no pudo medir y sale con 2. Este
// proyecto ya tiene documentada la familia "el gate que no encuentra nada pasa".
if (!fs.existsSync(DIR)) {
  console.error(`no existe ${path.relative(RAIZ, DIR)}: no hay nada que medir (no es un OK)`)
  process.exit(2)
}

const archivos = fs.readdirSync(DIR).filter((f) => f.endsWith('.md')).sort()
const hechos = archivos.map((f) => core.parsear(f, fs.readFileSync(path.join(DIR, f), 'utf8')))

// Todo lo que enlaza hechos con la sintaxis `hechos/<slug>.md`: el indice global mas los playbooks.
function indices() {
  const fuentes = [path.join(RAIZ, 'memory', 'MEMORY.md')]
  const pb = path.join(RAIZ, 'memory', 'playbooks')
  if (fs.existsSync(pb)) for (const f of fs.readdirSync(pb).filter((x) => x.endsWith('.md'))) fuentes.push(path.join(pb, f))
  const slugs = new Set()
  for (const f of fuentes) {
    if (!fs.existsSync(f)) continue
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/hechos\/([A-Za-z0-9_-]+)\.md/g)) slugs.add(m[1])
  }
  return [...slugs]
}

// Las fuentes que se leen como CONTRATO: si citan un [[slug]] es una instruccion, no una nota
// suelta que puede colgar (esa excepcion es solo entre hechos, ver rutasCitadas en hechos-core).
// Este es el hueco que describe cambios/META/LIMPIEZA.md §4: `hechos` daba OK sobre un universo
// vacio mientras 7 wikilinks de AGENTS.md y skills/ apuntaban a hechos inexistentes.
function fuentesContrato() {
  const fuentes = [path.join(RAIZ, 'AGENTS.md'), path.join(RAIZ, 'CLAUDE.md'), path.join(RAIZ, 'memory', 'MEMORY.md')]
  for (const dir of ['memory/playbooks', 'skills', '.claude/agents']) {
    const abs = path.join(RAIZ, dir)
    if (!fs.existsSync(abs)) continue
    for (const f of fs.readdirSync(abs).filter((x) => x.endsWith('.md'))) fuentes.push(path.join(abs, f))
  }
  return fuentes.filter((f) => fs.existsSync(f))
}

const rutasContrato = fuentesContrato()
const wikilinksContrato = []
for (const f of rutasContrato) {
  const rel = path.relative(RAIZ, f)
  for (const w of core.extraerWikilinks(fs.readFileSync(f, 'utf8'))) wikilinksContrato.push({ archivo: `${rel}:${w.linea}`, slug: w.slug })
}

const indiceTextual = indices()
const enDisco = new Set(hechos.map((h) => h.slug))
// Un enlace a un hecho que ya no existe: el lector lo sigue y no encuentra nada. Bloquea siempre.
const huerfanas = indiceTextual.filter((s) => !enDisco.has(s))

// El indice cuenta las dos formas de citar un hecho: `hechos/<slug>.md` y el wikilink `[[slug]]`
// desde una fuente de contrato. Las dos dicen lo mismo: esto se lee en toda tarea.
const indice = [...new Set([...indiceTextual, ...wikilinksContrato.map((w) => w.slug)])]

const existe = (rel) => fs.existsSync(path.join(RAIZ, rel))
const todos = core.validar(hechos, { existe, indice })

for (const w of wikilinksContrato) {
  if (!enDisco.has(w.slug)) {
    todos.push({ archivo: w.archivo, regla: 'wikilink-sin-hecho', detalle: `cita [[${w.slug}]], y memory/hechos/${w.slug}.md no existe` })
  }
}

// La lista REAL de tools sale del disco. Si no se puede leer, este chequeo NO corre y se dice: un
// gate que no encuentra su material no inventa un verde.
let TOOLS = null
try {
  TOOLS = new Set(require('../lib/tools-registro').descubrirTools(RAIZ).keys())
  const alias = /const ALIAS = \{([^}]*)\}/.exec(fs.readFileSync(path.join(RAIZ, 'agro.js'), 'utf8'))
  // Los ALIAS entran tambien: hoy `ALIAS = {}` en agro.js, pero si alguna vez se agrega un
  // nombre corto para una tool, esa entrada no vive en el disco y aun asi es una invocacion valida.
  if (alias) for (const m of alias[1].matchAll(/(\w[\w-]*)\s*:/g)) TOOLS.add(m[1])
} catch { TOOLS = null }
if (!TOOLS) console.error('  (no pude leer la lista de tools: el chequeo de comandos muertos NO corrio)')
else {
  for (const h of hechos) {
    // Se recorre LINEA por linea para poder distinguir "corre esto" de "esto ya no existe": el
    // segundo es el hecho haciendo su trabajo, no una instruccion rota.
    for (const linea of String(h.cuerpo || '').split('\n')) {
      if (core.esMencionHistorica(linea)) continue
      for (const m of buscarComandosObsoletos(linea, TOOLS, existe)) {
        todos.push({ archivo: h.archivo, regla: 'comando-muerto', detalle: `manda correr "${m.fragmento}": ${m.porque}` })
      }
    }
  }
}
const bloquean = todos.filter((p) => core.BLOQUEANTES.has(p.regla))
const avisos = todos.filter((p) => !core.BLOQUEANTES.has(p.regla))

if (argv.includes('--json')) {
  console.log(JSON.stringify({
    hechos: hechos.length,
    indice: indice.length,
    wikilinksContrato: wikilinksContrato.length,
    docsContrato: rutasContrato.length,
    bloquean,
    avisos,
    huerfanas,
  }, null, 2))
  process.exit(bloquean.length || huerfanas.length ? 1 : 0)
}

console.log(`==> hechos: ${hechos.length} en disco, ${indice.length} enlazados (MEMORY.md + playbooks + wikilinks); ${wikilinksContrato.length} wikilinks en ${rutasContrato.length} docs de contrato`)
for (const h of huerfanas) console.log(`  X  un indice enlaza hechos/${h}.md, que no existe`)
for (const p of bloquean) console.log(`  X  ${p.archivo}  [${p.regla}]  ${p.detalle}`)

if (!bloquean.length && !huerfanas.length) console.log('  OK  frontmatter, estados, y las rutas que citan')
else {
  console.log('')
  console.log('Que hacer:')
  console.log('  ruta-citada-no-existe   -> el archivo se movio: actualizar el hecho EN EL MISMO cambio')
  console.log('  archivado-en-el-indice  -> sacar la linea: lo archivado no es autoridad de lo actual')
  console.log('  superado-sin-sucesor    -> `superado_por: <slug>` del hecho que lo reemplaza')
  console.log('  wikilink-sin-hecho      -> escribir memory/hechos/<slug>.md, o sacar el [[enlace]]')
}

if (avisos.length) {
  console.log('')
  console.log(`  ·  ${avisos.length} sin linea en ningun indice (avisa, no bloquea): --indice para verlos`)
  if (argv.includes('--indice')) for (const p of avisos) console.log(`     ${p.archivo}`)
}

process.exit(bloquean.length || huerfanas.length ? 1 : 0)
