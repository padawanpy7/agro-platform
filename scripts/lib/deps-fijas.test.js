const { test } = require('node:test')
const assert = require('node:assert')
const { rangosAbiertos } = require('./deps-fijas')

test('sin dependencies/devDependencies no hay hallazgos', () => {
  assert.deepEqual(rangosAbiertos({}), [])
})

test('versiones exactas pasan', () => {
  const pkg = { dependencies: { marked: '18.0.9' }, devDependencies: { playwright: '1.62.0' } }
  assert.deepEqual(rangosAbiertos(pkg), [])
})

test('caret abierto se reporta con campo, nombre y version', () => {
  const pkg = { dependencies: { marked: '^18.0.9' } }
  assert.deepEqual(rangosAbiertos(pkg), [{ campo: 'dependencies', nombre: 'marked', version: '^18.0.9' }])
})

test('tilde abierto tambien se reporta', () => {
  const pkg = { devDependencies: { playwright: '~1.62.0' } }
  assert.deepEqual(rangosAbiertos(pkg), [{ campo: 'devDependencies', nombre: 'playwright', version: '~1.62.0' }])
})

test('version con prerelease exacta no se reporta', () => {
  const pkg = { dependencies: { foo: '1.2.3-beta.1' } }
  assert.deepEqual(rangosAbiertos(pkg), [])
})

test('otros rangos abiertos (>=, *, x, latest) tambien se reportan', () => {
  const pkg = { dependencies: { a: '>=1.0.0', b: '*', c: '1.x', d: 'latest' } }
  const nombres = rangosAbiertos(pkg).map((h) => h.nombre)
  assert.deepEqual(nombres, ['a', 'b', 'c', 'd'])
})

test('junta hallazgos de dependencies Y devDependencies', () => {
  const pkg = { dependencies: { a: '^1.0.0' }, devDependencies: { b: '~2.0.0' } }
  assert.strictEqual(rangosAbiertos(pkg).length, 2)
})
