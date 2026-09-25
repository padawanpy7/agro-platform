const { test } = require('node:test')
const assert = require('node:assert')
const { decidirRango } = require('./gitleaks-rango')

test('--todos siempre pide la historia completa, incluso con puntero valido', () => {
  const r = decidirRango({ todos: true, puntero: 'abc123', punteroEsAncestro: true })
  assert.deepEqual(r, { completo: true, motivo: '--todos pide el repo entero' })
})

test('sin puntero (maquina nueva) pide la historia completa', () => {
  const r = decidirRango({ todos: false, puntero: null, punteroEsAncestro: false })
  assert.deepEqual(r, { completo: true, motivo: 'primera corrida en esta maquina: sin puntero' })
})

test('puntero que ya no es ancestro de HEAD (reset/rebase) cae a la completa', () => {
  const r = decidirRango({ todos: false, puntero: 'abc123', punteroEsAncestro: false })
  assert.deepEqual(r, {
    completo: true,
    motivo: 'el puntero (abc123) ya no esta en la historia: se cae a la completa',
  })
})

test('puntero valido y ancestro de HEAD: rango incremental puntero..HEAD', () => {
  const r = decidirRango({ todos: false, puntero: 'abc123', punteroEsAncestro: true })
  assert.deepEqual(r, { completo: false, rango: 'abc123..HEAD' })
})
