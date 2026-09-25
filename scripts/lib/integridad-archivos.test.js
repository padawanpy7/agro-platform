const test = require('node:test')
const assert = require('node:assert')
const { marcadoresDeConflicto, jsonRoto, hallazgos } = require('./integridad-archivos')

// --- marcadores ----------------------------------------------------------------------------------
const CONFLICTO = [
  'antes',
  '<<<<<<< HEAD',
  'mi version',
  '=======',
  'la de ellos',
  '>>>>>>> origin/main',
  'despues',
].join('\n')

test('un conflicto de verdad se caza', () => {
  const m = marcadoresDeConflicto(CONFLICTO)
  assert.equal(m.length, 3)
  assert.equal(m[0].linea, 2)
})

test('un archivo limpio no dispara', () => {
  assert.deepEqual(marcadoresDeConflicto('linea uno\nlinea dos\n'), [])
})

test('un ======= suelto NO es un conflicto: es un subrayado de markdown', () => {
  // El falso positivo obvio. Un titulo setext y una linea separadora de comentario SQL empiezan
  // igual, y son la mitad de los .md y de los .sql del repo.
  assert.deepEqual(marcadoresDeConflicto('Titulo\n=======\n\ntexto'), [])
  assert.deepEqual(marcadoresDeConflicto('-- =======\n-- seccion'), [])
})

test('un archivo que HABLA de marcadores no se marca a si mismo', () => {
  // Este mismo test, el ledger del META y los playbooks los nombran en medio de una frase.
  const prosa = 'check falla si una linea empieza con <<<<<<<, ======= o >>>>>>> sin resolver.'
  assert.deepEqual(marcadoresDeConflicto(prosa), [])
})

test('la terna incompleta no alcanza: hace falta abrir, medio y cerrar EN ORDEN', () => {
  assert.deepEqual(marcadoresDeConflicto('<<<<<<< HEAD\nalgo\n'), [])
  assert.deepEqual(marcadoresDeConflicto('<<<<<<< HEAD\nalgo\n=======\n'), [])
  // Fuera de orden tampoco: el cierre tiene que venir DESPUES del medio.
  assert.deepEqual(marcadoresDeConflicto('>>>>>>> x\n=======\n<<<<<<< y\n'), [])
})

// --- json ----------------------------------------------------------------------------------------
test('un json valido no da error', () => {
  assert.equal(jsonRoto('{"a":1}'), null)
})

test('un json roto devuelve el motivo', () => {
  assert.ok(jsonRoto('{"a":1,,}'))
})

// --- hallazgos -----------------------------------------------------------------------------------
test('el caso real del 26/08: FEATURES.json con marcadores da UN hallazgo, el de conflicto', () => {
  // Estaba roto por las dos razones a la vez. Se reporta la causa, no el sintoma: arreglar el
  // conflicto arregla el JSON.
  const h = hallazgos([{ ruta: 'cambios/META/FEATURES.json', contenido: CONFLICTO }])
  assert.equal(h.length, 1)
  assert.equal(h[0].tipo, 'conflicto')
})

test('un .json roto SIN conflicto se reporta como json', () => {
  const h = hallazgos([{ ruta: 'x/FEATURES.json', contenido: '{"a":1,,}' }])
  assert.equal(h[0].tipo, 'json')
})

test('un .md roto no se juzga como json', () => {
  assert.deepEqual(hallazgos([{ ruta: 'x/PROGRESO.md', contenido: 'no soy json' }]), [])
})

test('sin archivos no hay hallazgos', () => {
  assert.deepEqual(hallazgos([]), [])
  assert.deepEqual(hallazgos(null), [])
})
