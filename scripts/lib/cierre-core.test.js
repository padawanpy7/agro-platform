const { test } = require('node:test')
const assert = require('node:assert')

const c = require('./cierre-core')
const core = c

// --- limpio ------------------------------------------------------------------------------------
test('un worktree sin cambios pasa', () => {
  assert.strictEqual(c.chequearLimpio([]).estado, 'ok')
})

test('un archivo sin commitear FALTA, y se nombra', () => {
  const r = c.chequearLimpio(['jira/X/PROGRESO.md'])
  assert.strictEqual(r.estado, 'falta')
  assert.ok(r.detalle.includes('jira/X/PROGRESO.md'),
    'el detalle tiene que decir CUAL archivo, o no se puede actuar')
})

// --- pusheado ----------------------------------------------------------------------------------
test('commits sin pushear FALTAN y traen el comando', () => {
  const r = c.chequearPusheado('GMCC-261', 3, true)
  assert.strictEqual(r.estado, 'falta')
  assert.ok(r.detalle.some((d) => d.includes('git push origin GMCC-261')))
})

test('una rama sin remoto avisa, no falla: puede ser local a proposito', () => {
  assert.strictEqual(c.chequearPusheado('prueba', 2, false).estado, 'aviso')
})

test('al dia con el remoto pasa', () => {
  assert.strictEqual(c.chequearPusheado('main', 0, true).estado, 'ok')
})

// --- atraso ------------------------------------------------------------------------------------
test('atrasarse respecto de main avisa, no frena el cierre', () => {
  assert.strictEqual(c.chequearAtraso('GMCC-261', 12).estado, 'aviso')
})

test('en main no hay atraso que medir', () => {
  assert.strictEqual(c.chequearAtraso('main', 99).estado, 'ok')
})

// --- promocion del loop ---------------------------------------------------------------------
test('tocar loop en una rama y no promoverlo FALTA', () => {
  const r = c.chequearPromocion('GMCC-261', ['scripts/loop/cierre.js', 'jira/X/sql/A.sql'], ['scripts/loop/cierre.js', 'jira/X/sql/A.sql'])
  assert.strictEqual(r.estado, 'falta')
  assert.ok(r.detalle.includes('scripts/loop/cierre.js'))
  assert.ok(!r.detalle.includes('jira/X/sql/A.sql'),
    'lo del ticket NO es loop: no se promueve')
})

test('tocar solo archivos del ticket no pide promocion', () => {
  assert.strictEqual(c.chequearPromocion('GMCC-261', ['jira/X/sql/A.sql'], ['jira/X/sql/A.sql']).estado, 'ok')
})

test('reconoce como loop lo compartido, no solo scripts/', () => {
  const r = c.archivosDeLoop([
    'memory/MEMORY.md', 'entornos.yml', 'AGENTS.md', 'package.json', 'agro.js',
    'skills/sdd.md', 'apex/static/appCustom.js',
    'jira/X/docs/nota.md', 'jira/LOOP/PROGRESO.md',
  ])
  assert.deepStrictEqual(r, [
    'memory/MEMORY.md', 'entornos.yml', 'AGENTS.md', 'package.json', 'agro.js',
    'skills/sdd.md', 'apex/static/appCustom.js',
  ])
})

// --- PROGRESO ----------------------------------------------------------------------------------
test('un PROGRESO con entrada de hoy pasa', () => {
  const r = c.chequearProgreso('jira/X/PROGRESO.md', ['2026-08-12', '2026-08-11'], '2026-08-12')
  assert.strictEqual(r.estado, 'ok')
})

test('un PROGRESO sin la entrada de hoy FALTA: el puente mentiria', () => {
  const r = c.chequearProgreso('jira/X/PROGRESO.md', ['2026-08-11'], '2026-08-12')
  assert.strictEqual(r.estado, 'falta')
  assert.ok(r.titulo.includes('2026-08-11'))
})

test('sin PROGRESO, FALTA', () => {
  assert.strictEqual(c.chequearProgreso(null, [], '2026-08-12').estado, 'falta')
})

test('entradas fuera de orden avisan (el encabezado pide la mas nueva arriba)', () => {
  const r = c.chequearProgreso('P.md', ['2026-08-11', '2026-08-12'], '2026-08-12')
  assert.strictEqual(r.estado, 'aviso')
})

// --- comandos obsoletos --------------------------------------------------------------------------
test('detecta el loop viejo en la prosa de un ticket', () => {
  const h = c.buscarComandosObsoletos('correr: bash scripts/apex-e2e.sh tests/e2e/mi.test.js')
  assert.ok(h.length >= 2, 'tiene que ver el wrapper .sh Y la carpeta tests/e2e/')
  assert.ok(h.some((x) => x.fragmento.includes('apex-e2e.sh')))
  assert.ok(h.some((x) => x.fragmento === 'tests/e2e/'))
})

test('no marca un comando actual', () => {
  const h = c.buscarComandosObsoletos('correr: node agro.js apex-e2e jira/X/tests/mi.test.js')
  assert.deepStrictEqual(h, [])
})

test('el chequeo de docs nombra archivo y motivo', () => {
  const r = c.chequearDocs({ 'docs/pruebas.md': [{ fragmento: 'bash scripts/x.sh', porque: 'ya no existe' }] })
  assert.strictEqual(r.estado, 'falta')
  assert.ok(r.detalle[0].includes('docs/pruebas.md') && r.detalle[0].includes('ya no existe'))
})

test('sin hallazgos, los docs pasan', () => {
  assert.strictEqual(c.chequearDocs({ 'a.md': [], 'b.md': [] }).estado, 'ok')
})

// --- preguntas -----------------------------------------------------------------------------------
// Estos tests se reescribieron el 26/08. Los viejos median el FLAG -`chequearPreguntas(false,false)
// === 'ok'`- y con eso consagraban el contrato equivocado: el gate afirmaba "la sesion no dejo
// preguntas abiertas" sin abrir el archivo. Ahora se mide el ARCHIVO.
const PREGUNTAS = (cuerpo) => `# PREGUNTAS - X\n\n## Abiertas\n\n### IMDX\n\n${cuerpo}\n\n## Respondidas\n\n- una vieja\n`

test('cuenta las abiertas y separa las que bloquean', () => {
  const r = c.contarPreguntasAbiertas(PREGUNTAS('**Bloquean**\n\n1. una que frena\n2. otra que frena\n\n**No bloquean**\n\n1. una que no'))
  // `encabezadosRaros` entra el 31/08: un subtitulo en negrita que el contador no entiende se
  // reporta en vez de ignorarse, porque es la pista de que puede estar subcontando bloqueantes.
  assert.deepStrictEqual(r, { abiertas: 3, bloquean: 2, sinSeccion: false, encabezadosRaros: [] })
})

test('las Respondidas NO se cuentan como abiertas', () => {
  const md = '## Abiertas\n\n**Bloquean**\n\nNinguna.\n\n## Respondidas\n\n1. esta ya se contesto\n2. y esta\n'
  assert.strictEqual(c.contarPreguntasAbiertas(md).abiertas, 0)
})

test('una pregunta que BLOQUEA frena el cierre', () => {
  const r = c.chequearPreguntas(PREGUNTAS('**Bloquean**\n\n1. la que decide el dueño'))
  assert.strictEqual(r.estado, 'falta')
  assert.match(r.titulo, /BLOQUEAN/)
})

test('una abierta que NO bloquea avisa, no frena', () => {
  const r = c.chequearPreguntas(PREGUNTAS('**No bloquean**\n\n1. la que puede esperar'))
  assert.strictEqual(r.estado, 'aviso')
})

test('sin preguntas abiertas da ok, y el titulo dice QUE se midio', () => {
  const r = c.chequearPreguntas(PREGUNTAS('**Bloquean**\n\nNinguna.'))
  assert.strictEqual(r.estado, 'ok')
  assert.match(r.titulo, /PREGUNTAS\.md/)
})

// --- el mismo contrato, pero con las preguntas en TABLA (08/09/2026) ---------------------------
// ICC-180 escribia sus preguntas abiertas en una tabla markdown y el contador devolvia CERO: el
// gate afirmaba "no tiene preguntas abiertas" con nueve sin contestar. El formato no puede decidir
// si el gate ve o no ve.
const TABLA = (filas) => PREGUNTAS(
  '| # | Pregunta | Bloquea | Default | Desde |\n|---|---|---|---|---|\n' + filas)

test('cuenta las abiertas cuando estan en una tabla, no solo en lista numerada', () => {
  const r = c.contarPreguntasAbiertas(TABLA(
    '| 1 | la primera | No | un default | 2026-09-03 |\n| 2 | la segunda | No | otro | 2026-09-04 |'))
  assert.strictEqual(r.abiertas, 2)
  assert.strictEqual(r.bloquean, 0)
})

test('en una tabla, la columna Bloquea decide cual frena', () => {
  const r = c.contarPreguntasAbiertas(TABLA(
    '| 1 | la que frena | Si | - | 2026-09-03 |\n| 2 | la que espera | No | - | 2026-09-03 |'))
  assert.strictEqual(r.abiertas, 2)
  assert.strictEqual(r.bloquean, 1)
})

test('una tabla con una pregunta que BLOQUEA frena el cierre', () => {
  const r = c.chequearPreguntas(TABLA('| 1 | la que decide el dueño | Si | - | 2026-09-03 |'))
  assert.strictEqual(r.estado, 'falta')
  assert.match(r.titulo, /BLOQUEAN/)
})

test('la fila separadora y la cabecera de la tabla no se cuentan como preguntas', () => {
  const r = c.contarPreguntasAbiertas(TABLA('| 1 | la unica | No | - | 2026-09-03 |'))
  assert.strictEqual(r.abiertas, 1)
})

test('las Respondidas en tabla tampoco se cuentan como abiertas', () => {
  const md = '## Abiertas\n\nNinguna.\n\n## Respondidas\n\n| # | P | R | F |\n|---|---|---|---|\n| 1 | vieja | si | 2026-09-01 |\n'
  assert.strictEqual(c.contarPreguntasAbiertas(md).abiertas, 0)
})

// Lo que el gate hacia mal y no se puede volver a hacer: dar OK sin haber mirado. "No hay archivo"
// no prueba que no haya preguntas, prueba que no se sabe.
test('sin archivo NO afirma que no hay preguntas: avisa que no se pudo medir', () => {
  const r = c.chequearPreguntas(null)
  assert.notStrictEqual(r.estado, 'ok')
  assert.match(r.titulo, /no se puede medir/)
})

test('un archivo sin seccion Abiertas tampoco se da por bueno', () => {
  const r = c.chequearPreguntas('# PREGUNTAS\n\nalgo suelto, sin la estructura\n')
  assert.notStrictEqual(r.estado, 'ok')
})

// --- comandos que ya no existen ------------------------------------------------------------------
test('caza una tool que ya no existe, no solo los wrappers .sh de julio', () => {
  const tools = new Set(['db-check', 'lint', 'apex-e2e'])
  const h = c.buscarComandosObsoletos('el grafo sale de `node agro.js db-deps SCHEMA.OBJETO`', tools)
  assert.strictEqual(h.length, 1)
  assert.match(h[0].porque, /no existe la tool "db-deps"/)
})

test('una tool que SI existe no se marca', () => {
  const tools = new Set(['db-check', 'lint'])
  assert.deepStrictEqual(c.buscarComandosObsoletos('corre `node agro.js db-check`', tools), [])
})

test('sin la lista de tools ese chequeo no corre, y no inventa un verde', () => {
  assert.deepStrictEqual(c.buscarComandosObsoletos('corre `node agro.js loquesea`'), [])
})

// --- resumen -------------------------------------------------------------------------------------
test('el cierre esta completo solo si no falta nada; un aviso no lo frena', () => {
  const r = c.resumir([
    { estado: 'ok' }, { estado: 'aviso' }, { estado: 'ok' },
  ])
  assert.strictEqual(r.completo, true)
  assert.strictEqual(r.avisos, 1)
})

test('una sola falta deja el cierre incompleto', () => {
  assert.strictEqual(c.resumir([{ estado: 'ok' }, { estado: 'falta' }]).completo, false)
})

// --- docs: bitacora vs instrucciones -------------------------------------------------------------
test('si solo la bitacora cita comandos viejos, avisa: es historia, no instrucciones', () => {
  const r = c.chequearDocs({
    'jira/X/PROGRESO.md': [{ fragmento: 'bash scripts/db-sql.sh', porque: 'ya no existe' }],
  })
  assert.strictEqual(r.estado, 'aviso')
})

test('un doc de instrucciones con comandos viejos SI frena el cierre', () => {
  const r = c.chequearDocs({
    'jira/X/PROGRESO.md': [{ fragmento: 'bash scripts/db-sql.sh', porque: 'ya no existe' }],
    'jira/X/docs/pruebas.md': [{ fragmento: 'bash scripts/apex-e2e.sh', porque: 'ya no existe' }],
  })
  assert.strictEqual(r.estado, 'falta')
  assert.ok(r.detalle.some((d) => d.includes('docs/pruebas.md')))
  assert.ok(!r.detalle.some((d) => d.includes('PROGRESO.md')),
    'la bitacora no se lista como algo a arreglar')
})

// El archivo POR MES del progreso es la MISMA bitacora, ya archivada. Al mudar el puente del
// loop a jira/LOOP/ (18/08) el gate empezo a exigirle a la historia de julio que
// hablara del loop de hoy, y frenaba el cierre por dos archivos que no se pueden arreglar sin
// falsear el registro.
test('el archivo por mes del progreso tambien es bitacora: avisa, no frena', () => {
  const r = c.chequearDocs({
    'jira/LOOP/progreso/2026-07.md': [{ fragmento: 'scripts/task-start.sh', porque: 'ya no existe' }],
    'jira/LOOP/progreso/2026-08.md': [{ fragmento: 'scripts/pase-prod.sh', porque: 'ya no existe' }],
  })
  assert.strictEqual(r.estado, 'aviso')
})

test('un doc que NO es bitacora sigue frenando aunque este al lado del progreso', () => {
  const r = c.chequearDocs({
    'jira/LOOP/progreso/2026-07.md': [{ fragmento: 'scripts/task-start.sh', porque: 'ya no existe' }],
    'jira/LOOP/README.md': [{ fragmento: 'bash scripts/check.sh', porque: 'ya no existe' }],
  })
  assert.strictEqual(r.estado, 'falta')
  assert.ok(r.detalle.some((d) => d.includes('README.md')))
  assert.ok(!r.detalle.some((d) => d.includes('progreso/2026-07.md')))
})

// --- promocion: las dos medidas cruzadas ---------------------------------------------------------
test('lo que toque pero YA esta igual en main no se pide promover', () => {
  // apex.md lo edito la rama, pero se copio a main en otro commit: hoy no difiere.
  const r = c.chequearPromocion('GMCC-261', ['memory/playbooks/apex.md'], [])
  assert.strictEqual(r.estado, 'ok')
})

test('lo que main avanzo por su cuenta no es cosa mia que promover', () => {
  // La rama esta atrasada: db/graph/* difiere, pero la rama nunca lo toco.
  const r = c.chequearPromocion('GMCC-261', [], ['db/graph/X.json', 'scripts/kove/kove-tarea.js'])
  assert.strictEqual(r.estado, 'ok')
})

test('lo que toque Y main no tiene igual, SI se promueve', () => {
  const r = c.chequearPromocion('GMCC-261',
    ['scripts/loop/cierre.js', 'db/graph/X.json'],
    ['scripts/loop/cierre.js', 'db/graph/X.json', 'scripts/kove/otro.js'])
  assert.strictEqual(r.estado, 'falta')
  assert.ok(r.detalle.includes('scripts/loop/cierre.js'))
  assert.ok(!r.detalle.includes('scripts/kove/otro.js'), 'eso lo movio main, no yo')
})

// --- aportaContenido: reordenar no es aportar ----------------------------------------------------
test('un archivo solo reordenado no aporta contenido', () => {
  const diff = ['+++ b/package.json', '+    "recalcular",', '-    "recalcular",', '-    "otra",'].join('\n')
  assert.strictEqual(c.aportaContenido(diff), false)
})

test('una linea que el otro lado no tiene en ninguna parte SI aporta', () => {
  const diff = ['+++ b/x.js', '+  const nuevo = 1', '-  const viejo = 2'].join('\n')
  assert.strictEqual(c.aportaContenido(diff), true)
})

test('si mi lado solo QUITA lineas, no aporta nada que promover', () => {
  assert.strictEqual(c.aportaContenido('--- a/x.js\n-  algo'), false)
})

// --- parseo del status -----------------------------------------------------------------------
test('parsea el status aunque el helper le haya comido el espacio inicial', () => {
  // Asi llega despues del trim() de git(): la primera linea pierde su espacio de la izquierda.
  const salida = 'M jira/X/a.md\n M jira/X/b.md\n?? nuevo.sql'
  assert.deepStrictEqual(core.parsearStatus(salida), [
    'jira/X/a.md', 'jira/X/b.md', 'nuevo.sql',
  ])
})

test('el status vacio no inventa archivos', () => {
  assert.deepStrictEqual(core.parsearStatus(''), [])
})

// Los dos falsos positivos que aparecieron al probar el chequeo contra el repo REAL el 26/08.
// Los tests solos daban verde: hacen falta los dos.
test('una palabra de prosa despues de "node agro.js" NO es una tool que falta', () => {
  const tools = new Set(['db-check'])
  const h = c.buscarComandosObsoletos('// Uso: bash node agro.js no aplica aca (es un .js del ticket)', tools)
  assert.deepStrictEqual(h, [])
})

test('un ALIAS es una invocacion valida: se pasa en la lista de conocidas', () => {
  // `lint` no existe como archivo -es el nombre de uso de plsql-lint- y esta escrito asi en
  // AGENTS.md y en project.yml. La tool lo agrega leyendo el mapa de alias de agro.js.
  const tools = new Set(['plsql-lint', 'lint'])
  assert.deepStrictEqual(c.buscarComandosObsoletos('corre `node agro.js lint`', tools), [])
})

// --- lineasDeLaUltimaEntrada -----------------------------------------------------------------
// El gate validaba la FECHA de la entrada mas nueva, no que dijera algo: una linea "## AAAA-MM-DD"
// con el cuerpo vacio pasaba como "al dia". Es la forma exacta de callar al gate sin escribir.
test('una entrada con fecha y cuerpo vacio cuenta 0 lineas', () => {
  assert.strictEqual(c.lineasDeLaUltimaEntrada('## 2026-08-26 - titulo\n\n## 2026-08-25 - vieja\ncuerpo'), 0)
})

test('un encabezado suelto NO es contenido', () => {
  // "### Hecho" sin nada abajo sigue siendo una entrada vacia.
  assert.strictEqual(c.lineasDeLaUltimaEntrada('## 2026-08-26 - t\n\n### Hecho\n\n### Verificado\n'), 0)
})

test('la marca de kove y los separadores tampoco cuentan', () => {
  assert.strictEqual(c.lineasDeLaUltimaEntrada('## 2026-08-26 - t\n<!-- kove-cargado: 2026-08-26 id=1 -->\n---\n'), 0)
})

test('se cuentan solo las lineas de la entrada MAS NUEVA, no las de abajo', () => {
  const t = '## 2026-08-26 - hoy\n- una\n## 2026-08-25 - ayer\n- a\n- b\n- c\n- d'
  assert.strictEqual(c.lineasDeLaUltimaEntrada(t), 1)
})

test('sin ninguna entrada con fecha devuelve 0', () => {
  assert.strictEqual(c.lineasDeLaUltimaEntrada('# PROGRESO\n\ntexto suelto'), 0)
})

test('chequearProgreso falla con la entrada de hoy vacia, y pasa con cuerpo', () => {
  const f = ['2026-08-26']
  assert.strictEqual(c.chequearProgreso('X', f, '2026-08-26', '## 2026-08-26 - t\n').estado, 'falta')
  assert.strictEqual(c.chequearProgreso('X', f, '2026-08-26', '## 2026-08-26 - t\n- a\n- b\n- c').estado, 'ok')
})

test('sin contenido el chequeo no inventa un rojo: los llamadores viejos siguen andando', () => {
  assert.strictEqual(c.chequearProgreso('X', ['2026-08-26'], '2026-08-26').estado, 'ok')
})

// --- dias sin entrada en la bitacora -----------------------------------------------------------
// Los dos lados, que es lo que pide la ficha: al dia -> verde; un dia trabajado sin entrada -> rojo.
test('cada dia con commits tiene su entrada: verde', () => {
  const r = c.chequearDiasSinEntrada(
    [{ fecha: '2026-08-27', commits: 9 }, { fecha: '2026-08-28', commits: 4 }],
    ['2026-08-28', '2026-08-27', '2026-08-26'])
  assert.strictEqual(r.estado, 'ok')
})

test('un dia trabajado sin entrada FALTA, y se dice cual', () => {
  const r = c.chequearDiasSinEntrada(
    [{ fecha: '2026-08-27', commits: 9, muestra: 'loop: la cuelga de sqlcl' }, { fecha: '2026-08-28', commits: 4 }],
    ['2026-08-28'])
  assert.strictEqual(r.estado, 'falta')
  assert.ok(r.detalle.some((d) => d.includes('2026-08-27') && d.includes('9 commit')))
  assert.ok(!r.detalle.some((d) => d.startsWith('2026-08-28')), 'el dia que SI tiene entrada no se reporta')
})

test('escribir la entrada de hoy NO tapa el dia de ayer: es el bug que la ficha describe', () => {
  const dias = [{ fecha: '2026-08-27', commits: 9 }, { fecha: '2026-08-28', commits: 4 }]
  assert.strictEqual(c.chequearDiasSinEntrada(dias, ['2026-08-28']).estado, 'falta')
})

// --- pendientes vencidos -----------------------------------------------------------------------
const BITACORA = [
  '## 2026-08-26 - una tanda',
  '',
  '- Hecho: cosas.',
  '',
  '**Pendiente / proximo**: las dos fichas del gate de cierre (`HN-CIERRE-A`, `HN-CIERRE-B`)',
  'van en una sola tanda, fusionadas.',
  '',
  '## 2026-08-25 - otra tanda',
  '',
  '- Hecho: mas cosas.',
].join('\n')

test('lee los HN-* del bloque "Pendiente / proximo", aunque ocupe dos renglones', () => {
  const p = c.pendientesDeLaBitacora(BITACORA)
  assert.strictEqual(p.length, 1)
  assert.strictEqual(p[0].fecha, '2026-08-26')
  assert.deepStrictEqual(p[0].ids, ['HN-CIERRE-A', 'HN-CIERRE-B'])
})

test('un pendiente que nombra fichas todavia abiertas: verde', () => {
  const p = c.pendientesDeLaBitacora(BITACORA)
  const r = c.chequearPendientesVencidos(p, { 'HN-CIERRE-A': false, 'HN-CIERRE-B': false })
  assert.strictEqual(r.estado, 'ok')
})

test('un pendiente que nombra una ficha ya cerrada FALTA', () => {
  const p = c.pendientesDeLaBitacora(BITACORA)
  const r = c.chequearPendientesVencidos(p, { 'HN-CIERRE-A': true, 'HN-CIERRE-B': false })
  assert.strictEqual(r.estado, 'falta')
  assert.ok(r.detalle.some((d) => d.includes('HN-CIERRE-A') && d.includes('passes:true')))
})

test('un pendiente que nombra una ficha que ya no existe -fusionada- FALTA', () => {
  const p = c.pendientesDeLaBitacora(BITACORA)
  const r = c.chequearPendientesVencidos(p, { 'HN-CIERRE-B': false })
  assert.strictEqual(r.estado, 'falta')
  assert.ok(r.detalle.some((d) => d.includes('HN-CIERRE-A') && d.includes('no esta en el ledger')))
})

test('sin pendientes que nombren fichas, no hay nada que cruzar', () => {
  assert.strictEqual(c.chequearPendientesVencidos([], {}).estado, 'ok')
})

// --- rutas citadas -----------------------------------------------------------------------------
test('extrae rutas de los backticks y descarta lo que no es una ruta', () => {
  const rutas = c.rutasCitadas([
    'ver `scripts/lib/cierre-core.js` y `jira/LOOP/PROGRESO.md`',
    'el playbook `db.md` seccion 8, la plantilla `jira/<TICKET>/tasks.md`',
    'el sitio `https://example.com/x/y` y el objeto `INGRES.PR_X`',
  ].join('\n')).map((r) => r.ruta)
  assert.deepStrictEqual(rutas.sort(), ['jira/LOOP/PROGRESO.md', 'scripts/lib/cierre-core.js'])
})

test('una cita en pasado se marca como historica; una instruccion viva no', () => {
  const r = c.rutasCitadas([
    'Vivia en `work/PROGRESO.md`, que se lee en TODA tarea.',
    'El resto se archiva por mes en `work/progreso/`.',
  ].join('\n'))
  assert.strictEqual(r.find((x) => x.ruta === 'work/PROGRESO.md').historica, true)
  assert.strictEqual(r.find((x) => x.ruta === 'work/progreso/').historica, false)
})

test('un N/M de la prosa no es una ruta, aunque tenga barra', () => {
  const r = c.rutasCitadas('el ledger quedo en `13/41` y el README declara `N/M`')
  assert.deepStrictEqual(r, [])
})

test('la cabecera de la bitacora son instrucciones vivas; las entradas con fecha, historia', () => {
  const texto = [
    '# PROGRESO',
    'El resto se archiva en `jira/LOOP/progreso/`.',
    '',
    '## 2026-08-28 - una tanda',
    'este PROGRESO citaba `work/progreso/` desde el 18/08.',
  ].join('\n')
  const { cabecera, entradas } = c.partirBitacora(texto)
  assert.strictEqual(c.rutasCitadas(cabecera)[0].historica, false)
  assert.strictEqual(c.rutasCitadas(entradas, { todoHistorico: true })[0].historica, true)
})

test('sin entradas con fecha, todo el documento es cabecera', () => {
  const { cabecera, entradas } = c.partirBitacora('# X\nver `a/b.md`')
  assert.ok(cabecera.includes('a/b.md'))
  assert.strictEqual(entradas, '')
})

test('si la misma ruta aparece viva y en pasado, gana la viva', () => {
  const r = c.rutasCitadas('antes vivia en `x/y.md`\ncorre `x/y.md` para arrancar')
  assert.strictEqual(r.length, 1)
  assert.strictEqual(r[0].historica, false)
})

test('todas las rutas existen: verde', () => {
  assert.strictEqual(c.chequearRutasCitadas([], 12).estado, 'ok')
})

test('una ruta inventada FALTA, y se dice en que documento estaba', () => {
  const r = c.chequearRutasCitadas([{ doc: 'jira/LOOP/PROGRESO.md', ruta: 'scripts/no-existe.js' }], 12)
  assert.strictEqual(r.estado, 'falta')
  assert.ok(r.detalle.some((d) => d.includes('PROGRESO.md') && d.includes('scripts/no-existe.js')))
})

test('una ruta muerta citada SOLO en pasado avisa, no frena: es historia', () => {
  const r = c.chequearRutasCitadas([{ doc: 'X/README.md', ruta: 'work/PROGRESO.md', historica: true }], 12)
  assert.strictEqual(r.estado, 'aviso')
})

test('una historica no tapa a una viva en el mismo documento', () => {
  const r = c.chequearRutasCitadas([
    { doc: 'X/README.md', ruta: 'work/PROGRESO.md', historica: true },
    { doc: 'X/PROGRESO.md', ruta: 'work/progreso/', historica: false },
  ], 12)
  assert.strictEqual(r.estado, 'falta')
  assert.ok(r.titulo.includes('1 ruta'), 'cuenta solo las vivas, pero lista las dos')
  assert.strictEqual(r.detalle.filter((d) => d.includes('work/')).length, 2)
})

// --- caracteres de control ---------------------------------------------------------------------
test('un backspace en una ruta se caza y se dice la linea', () => {
  const h = c.caracteresDeControl('linea sana\nC:\\bffamiliar\bf-db-workspace\notra')
  assert.ok(h.length >= 1)
  assert.strictEqual(h[0].linea, 2)
  assert.strictEqual(h[0].codigo, '0x08')
})

test('un texto normal -con tabs y acentos- no dispara', () => {
  assert.deepStrictEqual(c.caracteresDeControl('hola\tmundo\ncon acentos: ñ á'), [])
})

test('sin caracteres de control: verde; con uno: FALTA con archivo y linea', () => {
  assert.strictEqual(c.chequearCaracteresDeControl({}, 7).estado, 'ok')
  const r = c.chequearCaracteresDeControl({ 'work/x.md': [{ linea: 3, codigo: '0x08' }] }, 7)
  assert.strictEqual(r.estado, 'falta')
  assert.ok(r.detalle.some((d) => d.includes('work/x.md:3')))
})

// --- README contra el ledger -------------------------------------------------------------------
test('lee el N/M que declara el README', () => {
  assert.deepStrictEqual(
    { ...c.estadoDeclarado('# X\n\n**Estado**: 13/18 features en verde.\n'), linea: undefined },
    { pasan: 13, total: 18, linea: undefined })
})

test('un README sin cifras no contradice nada', () => {
  assert.strictEqual(c.estadoDeclarado('# X\n\nAca va el estado del ticket.\n'), null)
  assert.strictEqual(c.chequearReadmeVsLedger(null, { pasan: 3, total: 9 }).estado, 'ok')
})

test('el README que coincide con el ledger: verde', () => {
  const r = c.chequearReadmeVsLedger({ pasan: 5, total: 5, linea: 'Estado: 5/5' }, { pasan: 5, total: 5 })
  assert.strictEqual(r.estado, 'ok')
})

test('el README que contradice al ledger FALTA, y se imprimen las dos cifras', () => {
  const r = c.chequearReadmeVsLedger({ pasan: 18, total: 18, linea: 'Estado: 18/18' }, { pasan: 13, total: 18 })
  assert.strictEqual(r.estado, 'falta')
  assert.ok(r.titulo.includes('18/18') && r.titulo.includes('13/18'))
})

test('sin ledger no se inventa un verde: avisa', () => {
  assert.strictEqual(c.chequearReadmeVsLedger({ pasan: 1, total: 2 }, null).estado, 'aviso')
})

// --- el contador de bloqueantes (31/08) ----------------------------------------------------------
// La unica forma de que el dueño se entere de una pregunta que FRENA es este contador. Subcontaba
// por una palabra de mas en el subtitulo.
test('cuenta las bloqueantes aunque el subtitulo traiga texto extra', () => {
  const doc = '## Abiertas\n\n**Bloquean el diseño**\n\n1. Una\n2. Otra\n\n**No bloquean por ahora**\n\n3. Menor\n\n## Respondidas\n'
  const r = core.contarPreguntasAbiertas(doc)
  assert.strictEqual(r.abiertas, 3)
  assert.strictEqual(r.bloquean, 2)
})

test('el subtitulo exacto sigue funcionando igual', () => {
  const doc = '## Abiertas\n\n**Bloquean**\n\n1. Una\n2. Otra\n\n**No bloquean**\n\n3. Menor\n'
  const r = core.contarPreguntasAbiertas(doc)
  assert.strictEqual(r.bloquean, 2)
  assert.deepStrictEqual(r.encabezadosRaros, [])
})

test('un subtitulo en negrita que no se entiende se REPORTA, no se ignora', () => {
  const doc = '## Abiertas\n\n**Bloqueantes**\n\n1. Una\n'
  const r = core.contarPreguntasAbiertas(doc)
  assert.strictEqual(r.abiertas, 1)
  assert.deepStrictEqual(r.encabezadosRaros, ['**Bloqueantes**'])
  const ch = core.chequearPreguntas(doc)
  assert.ok(ch.detalle.some((d) => d.includes('no se entiende como grupo')))
})

test('"No bloquean" no se lee como "Bloquean": el orden importa', () => {
  const doc = '## Abiertas\n\n**No bloquean el pase**\n\n1. Una\n2. Otra\n'
  assert.strictEqual(core.contarPreguntasAbiertas(doc).bloquean, 0)
})

test('una negrita que es prosa, no un subtitulo de grupo, no se marca', () => {
  const doc = '## Abiertas\n\n**Sin respuesta todavia.**\n\n1. Una\n'
  assert.deepStrictEqual(core.contarPreguntasAbiertas(doc).encabezadosRaros, [])
})

// --- el criterio se escribio antes de construir? (31/08) ----------------------------------------
test('el criterio anterior al codigo pasa', () => {
  const r = core.chequearCriterioAntesDeConstruir({ criterio: '2026-08-20', codigo: '2026-08-22' })
  assert.strictEqual(r.estado, 'ok')
})

test('el mismo dia cuenta como antes: se escribieron juntos', () => {
  assert.strictEqual(core.chequearCriterioAntesDeConstruir({ criterio: '2026-08-22', codigo: '2026-08-22' }).estado, 'ok')
})

// El caso real: el HECHO_CUANDO de ICC-83 se escribio el 31/08 y el primer codigo era del 27/08.
test('el criterio escrito DESPUES avisa, y dice por que importa', () => {
  const r = core.chequearCriterioAntesDeConstruir({ criterio: '2026-08-31', codigo: '2026-08-27' })
  assert.strictEqual(r.estado, 'aviso')
  assert.ok(r.titulo.includes('DESPUES'))
  assert.ok(r.detalle.join(' ').includes('se acomoda al trabajo hecho'))
})

test('sin HECHO_CUANDO no dice nada: de eso ya avisa el chequeo de aceptacion', () => {
  assert.strictEqual(core.chequearCriterioAntesDeConstruir({ codigo: '2026-08-27' }), null)
})

test('un ticket que todavia no escribio codigo no se acusa de nada', () => {
  assert.strictEqual(core.chequearCriterioAntesDeConstruir({ criterio: '2026-08-31' }).estado, 'ok')
})

// El nombre del dispatcher no se clava: el mismo core corre en un repo donde se llama `infra.js`.
test('caza la tool inexistente sea cual sea el nombre del dispatcher', () => {
  const tools = new Set(['db-check', 'lint'])
  const a = core.buscarComandosObsoletos('correr `node agro.js db-deps X`', tools)
  const b = core.buscarComandosObsoletos('correr `node infra.js db-deps X`', tools)
  assert.strictEqual(a.length, 1)
  assert.strictEqual(b.length, 1, 'con otro dispatcher el chequeo daba verde sin mirar nada')
})

test('un `node <ruta>.js` no es una invocacion del dispatcher', () => {
  const tools = new Set(['lint'])
  assert.deepStrictEqual(core.buscarComandosObsoletos('node scripts/lib/x.test.js algo', tools), [])
})

// No todos los `.sh` murieron el 10/08: scripts/db-secuencias.sh sigue vivo, y hay un hecho que
// explica por que no se promueve. Marcarlo empuja a "arreglar" un documento que estaba bien.
test('un script .sh que EXISTE no es un comando muerto', () => {
  const texto = 'ojo: `scripts/db-secuencias.sh` NO se promueve, por decision del dueño'
  assert.strictEqual(core.buscarComandosObsoletos(texto, null, () => true).length, 0)
  assert.strictEqual(core.buscarComandosObsoletos(texto, null, () => false).length, 1)
})

test('sin el chequeo de existencia se comporta como antes', () => {
  assert.strictEqual(core.buscarComandosObsoletos('corre `bash scripts/lint.sh`').length, 2)
})

// --- promover sin pisar trabajo ajeno (01/09) ----------------------------------------------------
// El 27/08, cerrando ICC-83, main tenia 93 lineas STAGED SIN COMMITEAR de otra sesion -entre ellas
// db.md y MEMORY.md, dos de los cuatro archivos que el gate mandaba promover-. La forma obvia de
// obedecer el aviso (`git checkout <RAMA> -- <archivos>` parado en main) pisa indice Y working
// tree: esas lineas se perdian, y sin commit git no las recupera. El gate daba una instruccion que,
// seguida al pie de la letra, destruia trabajo.
test('con main SUCIO y choque de archivos, nombra el choque y NO manda el comando destructivo', () => {
  const r = core.chequearPromocion('ICC-83', ['memory/MEMORY.md', 'scripts/x.js'], ['memory/MEMORY.md', 'scripts/x.js'],
    () => true, { limpio: false, pendientes: ['memory/MEMORY.md'] })
  const texto = [r.titulo, ...r.detalle].join('\n')
  assert.match(texto, /memory\/MEMORY\.md/)
  assert.match(texto, /sin commitear|pendiente/i)
  // El comando destructivo puede NOMBRARSE, pero solo para prohibirlo: lo que no puede es aparecer
  // como instruccion. Se exige la prohibicion explicita.
  assert.match(texto, /NO uses `git checkout/, 'tiene que prohibirlo, no solo omitirlo')
  assert.match(texto, /no se recupera|no esta commiteado/i)
})

test('con main sucio pero SIN choque, avisa y sigue mandando promover', () => {
  const r = core.chequearPromocion('ICC-83', ['scripts/x.js'], ['scripts/x.js'],
    () => true, { limpio: false, pendientes: ['docs/otra-cosa.md'] })
  assert.strictEqual(r.estado, 'falta')
  assert.match([r.titulo, ...r.detalle].join('\n'), /scripts\/x\.js/)
})

// Control negativo: con main limpio el gate tiene que comportarse igual que antes de este cambio.
test('con main LIMPIO el aviso es el de siempre', () => {
  const r = core.chequearPromocion('ICC-83', ['scripts/x.js'], ['scripts/x.js'], () => true, { limpio: true, pendientes: [] })
  assert.strictEqual(r.estado, 'falta')
  assert.ok(r.detalle.includes('scripts/x.js'))
})

test('sin saber como esta main NO se afirma que es seguro promover', () => {
  const r = core.chequearPromocion('ICC-83', ['scripts/x.js'], ['scripts/x.js'], () => true, null)
  assert.match([r.titulo, ...r.detalle].join('\n'), /no pude mirar|no se pudo mirar/i)
})

// El bloque de un "Pendiente / proximo" terminaba en la primera linea en blanco, y en una LISTA DE
// VIÑETAS no hay lineas en blanco: una viñeta que menciona la frase se tragaba todas las de abajo.
// Medido el 01/09 sobre el PROGRESO real: una viñeta que DESCRIBE la regla -"los HN-* que nombra un
// 'Pendiente / proximo' se cruzan contra el ledger"- se llevaba las fichas nombradas dos viñetas mas
// abajo, y el cierre acusaba un pendiente que nadie escribio.
test('una viñeta que menciona la frase no se lleva las viñetas siguientes', () => {
  const md = [
    '## 2026-08-28 - una tanda',
    '- **Hecho:** cinco chequeos nuevos.',
    '- (2) los `HN-*` que nombra un "Pendiente / proximo" se cruzan contra el ledger.',
    '- **Hecho:** se ficho `HN-OTRA-COSA`, que no es un pendiente.',
    '',
  ].join('\n')
  assert.deepStrictEqual(core.pendientesDeLaBitacora(md), [])
})

test('un pendiente de verdad, escrito en varios renglones, se sigue leyendo entero', () => {
  const md = [
    '## 2026-09-01 - otra tanda',
    '',
    '**Pendiente / proximo**: sigue `HN-UNA`, y despues',
    '`HN-OTRA` cuando se libere.',
    '',
  ].join('\n')
  assert.deepStrictEqual(core.pendientesDeLaBitacora(md), [{ fecha: '2026-09-01', ids: ['HN-UNA', 'HN-OTRA'] }])
})

// Un dia de trabajo del LOOP cuenta para el cierre de cualquier ticket (`diasConCommits` mira
// tambien `archivosDeLoop`), pero su entrada vive en la bitacora del change del loop. Mirar solo la
// del ticket daba "sin entrada en la bitacora" para todo dia de loop: el 18/09/2026 el cierre de
// ICC-13 marcaba 13, 14, 16 y 17/09 en rojo con las cuatro entradas escritas en jira/META.
test('las carpetas de bitacora incluyen la del loop, no solo la del ticket', () => {
  assert.deepEqual(c.carpetasDeBitacora('jira/ICC-13', 'jira/META'), ['jira/ICC-13', 'jira/META'])
})

test('cuando el ticket ES el change del loop, la carpeta no se repite', () => {
  assert.deepEqual(c.carpetasDeBitacora('jira/META', 'jira/META'), ['jira/META'])
})

test('sin carpeta de ticket, queda la del loop', () => {
  assert.deepEqual(c.carpetasDeBitacora('', 'jira/META'), ['jira/META'])
})

// El cierre traducia a VERDE lo que `aceptacion` no pudo medir: aceptacion-core exige
// `!sinMedir.length` para su `ok`, y chequearAceptacion solo miraba fallaron/sinCorrer/problemas.
// Medido el 18/09/2026 en ICC-204 por la sesion de ICC-13: `aceptacion` exit 1 ("NO SE PUDO MEDIR")
// y `cierre` exit 0 ("los 1 criterios de aceptacion se cumplen"). Un cero que no distingue "no
// pude mirar" de "esta bien" no es un gate.
test('un criterio que NO SE PUDO MEDIR no pasa el cierre', () => {
  const r = c.chequearAceptacion({
    total: 1, fallaron: [], sinCorrer: [], problemas: [], manuales: [],
    sinMedir: [{ titulo: 'el objeto compila', exit: 2 }],
  })
  assert.equal(r.estado, 'falta')
  assert.match(r.detalle.join('\n'), /no se pudo medir/i)
})

// Una fecha DD/MM/AAAA en la linea del estado se leia como el N/M del ledger: el 18/09 el README de
// ICC-13 decia "integrado a main el 14/09/2026" y el gate lo leyo como 14/9 contra un ledger 84/87.
test('una fecha en la linea de estado no se lee como N/M del ledger', () => {
  assert.equal(c.estadoDeclarado('Estado: integrado a main el 14/09/2026'), null)
  assert.equal(c.estadoDeclarado('Estado: cerrado (18/09/2026)'), null)
  assert.deepEqual(c.estadoDeclarado('Estado: ledger 14/15 al 18/09/2026').pasan, 14)
})
