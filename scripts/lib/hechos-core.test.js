const { test } = require('node:test')
const assert = require('node:assert/strict')
const core = require('./hechos-core')
const { BLOQUEANTES, parsear, rutasCitadas, validar } = core

const hecho = (slug, campos = {}, cuerpo = '') => parsear(slug + '.md', [
  '---',
  'name: ' + (campos.name !== undefined ? campos.name : slug),
  'description: "' + (campos.description !== undefined ? campos.description : 'lo que pasa y por que importa') + '"',
  'metadata:',
  '  type: ' + (campos.type || 'reference'),
  ...(campos.estado ? ['  estado: ' + campos.estado] : []),
  ...(campos.superado_por ? ['  superado_por: ' + campos.superado_por] : []),
  '---',
  '',
  cuerpo,
].join('\n'))

test('un hecho sin `estado` vale como vigente: los 262 que ya existian no se rompen', () => {
  const h = hecho('un-hecho')
  assert.equal(h.estado, 'vigente')
  assert.deepEqual(validar([h], { indice: ['un-hecho'] }), [])
})

test('el name tiene que coincidir con el archivo', () => {
  const p = validar([hecho('un-hecho', { name: 'otro-nombre' })], { indice: ['un-hecho'] })
  assert.equal(p.length, 1)
  assert.equal(p[0].regla, 'name-no-coincide')
})

test('sin description el hecho es irrecuperable aunque este escrito', () => {
  const p = validar([hecho('un-hecho', { description: '' })], { indice: ['un-hecho'] })
  assert.ok(p.some((x) => x.regla === 'sin-description'))
})

test('un estado inventado no pasa', () => {
  const p = validar([hecho('un-hecho', { estado: 'medio-vigente' })], { indice: ['un-hecho'] })
  assert.ok(p.some((x) => x.regla === 'estado-invalido'))
})

// El caso que motiva la ficha: "esto ya no vale" sin decir que vale ahora es peor que no decir nada.
test('superado SIN sucesor no pasa', () => {
  const p = validar([hecho('viejo', { estado: 'superado' })], { indice: ['viejo'] })
  assert.ok(p.some((x) => x.regla === 'superado-sin-sucesor'))
})

test('superado con un sucesor que no existe tampoco', () => {
  const p = validar([hecho('viejo', { estado: 'superado', superado_por: 'fantasma' })], { indice: ['viejo'] })
  assert.ok(p.some((x) => x.regla === 'sucesor-no-existe'))
})

test('superado con su sucesor presente: pasa', () => {
  const hs = [hecho('viejo', { estado: 'superado', superado_por: 'nuevo' }), hecho('nuevo')]
  assert.deepEqual(validar(hs, { indice: ['viejo', 'nuevo'] }), [])
})

// La regla que se adopta de deepseek-harness: lo archivado no es autoridad de lo actual.
test('lo archivado NO puede seguir en el indice', () => {
  const p = validar([hecho('viejo', { estado: 'archivado' })], { indice: ['viejo'] })
  assert.ok(p.some((x) => x.regla === 'archivado-en-el-indice'))
})

test('lo archivado FUERA del indice es lo correcto, y no se le exige estar', () => {
  assert.deepEqual(validar([hecho('viejo', { estado: 'archivado' })], { indice: ['otro'] }), [])
})

test('un hecho vigente que no esta en el indice es invisible', () => {
  const p = validar([hecho('un-hecho')], { indice: ['otro'] })
  assert.ok(p.some((x) => x.regla === 'fuera-del-indice'))
})

// El de los 8 punteros rotos del 31/08.
test('una ruta citada que no existe se marca', () => {
  const h = hecho('un-hecho', {}, 'Se corre con `scripts/lib/que-no-esta.js` y listo.')
  const p = validar([h], { indice: ['un-hecho'], existe: () => false })
  assert.equal(p.length, 1)
  assert.equal(p[0].regla, 'ruta-citada-no-existe')
})

test('rutasCitadas: solo rutas comprobables, ni URLs ni [[enlaces]] ni nombres sueltos', () => {
  const t = 'ver `memory/hechos/x.md`, `https://ejemplo.com/y.md`, [[otro-hecho]] y `README.md`'
  const r = rutasCitadas(t)
  assert.ok(r.includes('memory/hechos/x.md'))
  // Un nombre sin carpeta no se puede resolver sin adivinar contra que raiz.
  assert.ok(!r.includes('README.md'))
  // El [[enlace]] a un hecho que todavia no existe es valido a proposito.
  assert.ok(!r.some((x) => x.includes('otro-hecho')))
})

// Casos reales del 31/08 al encender el gate: un hecho de base cita un script del server, uno de
// pases cita el otro repo, y uno de deploy usa un molde. Ninguno de los tres esta roto.
test('rutasCitadas ignora lo que no vive en este repo: absoluta, ../ y molde con ...', () => {
  const t = 'corre `/archivos_aplicacion/caja/archivar_pevx.sh`, se copia a ' +
    '`../database-scripts/src/PKG.sql` y el molde es `src/.../OBJETO.sql`'
  assert.deepEqual(rutasCitadas(t), [])
})

test('fuera-del-indice avisa pero NO bloquea: al encender el gate eran 111 y una regla que nace roja se ignora', () => {
  assert.ok(!BLOQUEANTES.has('fuera-del-indice'))
  assert.ok(BLOQUEANTES.has('ruta-citada-no-existe'))
})

test('sin frontmatter se corta ahi y no se inventan campos', () => {
  const p = validar([parsear('suelto.md', 'texto sin frontmatter')], { indice: [] })
  assert.equal(p.length, 1)
  assert.equal(p[0].regla, 'sin-frontmatter')
})

// Control negativo del gate entero: sobre lo que ya esta bien no dice nada.
test('un conjunto sano no reporta nada', () => {
  const hs = [hecho('uno'), hecho('dos', { type: 'feedback' })]
  assert.deepEqual(validar(hs, { indice: ['uno', 'dos'] }), [])
})

// --- comando muerto vs. aviso de que murio (01/09) -----------------------------------------------
test('una linea que AVISA que algo murio no es una instruccion rota', () => {
  assert.equal(core.esMencionHistorica('**No uses** `. scripts/_python.sh`: cae al stub'), true)
  assert.equal(core.esMencionHistorica('los specs importaban `tests/e2e/lib/apex` (ya inexistente)'), true)
  assert.equal(core.esMencionHistorica('el wrapper `scripts/lint.sh` ya no existe'), true)
})

// La lista de marcas es corta a proposito: si entraran "era", "habia" o "antes de" -que aparecen en
// cualquier prosa- el gate se apagaria entero sin que se note. Un hecho que cuenta historia con
// palabras ambiguas se reescribe; no se le regala la excepcion.
test('una historia contada con palabras ambiguas NO se excusa sola', () => {
  assert.equal(core.esMencionHistorica('antes se corria con `bash scripts/lint.sh`'), false)
})

test('una linea que manda correr algo SI es una instruccion', () => {
  assert.equal(core.esMencionHistorica('correr `bash scripts/db-sql.sh --base replica`'), false)
  assert.equal(core.esMencionHistorica('el grafo sale de `node agro.js db-deps X`'), false)
})
