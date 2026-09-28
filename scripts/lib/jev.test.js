const { test } = require('node:test')
const assert = require('node:assert')
const jev = require('./jev')

const conClave = (fn) => {
  const antes = process.env.TYPESAFE_API_KEY
  process.env.TYPESAFE_API_KEY = 'clave-de-prueba'
  try { return fn() } finally {
    if (antes === undefined) delete process.env.TYPESAFE_API_KEY
    else process.env.TYPESAFE_API_KEY = antes
  }
}

// Lo que mas importa: sin clave NO se adivina. Un cliente que devuelve un default cuando no puede
// preguntar convierte "no se midio" en "salio bien", que es el falso verde de siempre.
test('sin clave tira error y no inventa una respuesta', async () => {
  const antes = process.env.TYPESAFE_API_KEY
  delete process.env.TYPESAFE_API_KEY
  try {
    await assert.rejects(
      () => jev.preguntar('texto', { x: { type: 'noul', instructions: 'algo?' } }),
      (e) => e.code === 'SIN_CLAVE')
  } finally { if (antes !== undefined) process.env.TYPESAFE_API_KEY = antes }
})

test('arma el request con model, state y questions', async () => {
  await conClave(async () => {
    let visto = null
    const fetchFalso = async (url, opts) => {
      visto = { url, headers: opts.headers, body: JSON.parse(opts.body) }
      return { ok: true, json: async () => ({ nouls: { x: { noul: 0.9 } } }) }
    }
    await jev.preguntar('un texto', { x: { type: 'noul', instructions: 'es algo?' } }, { fetchImpl: fetchFalso })
    assert.strictEqual(visto.url, jev.ENDPOINT)
    assert.strictEqual(visto.headers.Authorization, 'Bearer clave-de-prueba')
    assert.strictEqual(visto.body.model, jev.MODELO)
    assert.strictEqual(visto.body.state, 'un texto')
    assert.strictEqual(visto.body.questions.x.type, 'noul')
  })
})

test('un HTTP no-ok es error, con el status adentro', async () => {
  await conClave(async () => {
    const fetchFalso = async () => ({ ok: false, status: 429 })
    await assert.rejects(
      () => jev.preguntar('t', { x: { type: 'noul', instructions: 'i' } }, { fetchImpl: fetchFalso }),
      (e) => e.code === 'HTTP' && e.status === 429)
  })
})

// La documentacion publica muestra la respuesta de mas de una forma. Los lectores toleran las
// variantes conocidas, y eso hay que fijarlo: es lo unico que se puede verificar sin la API real.
test('lee un noul en las formas que documenta la API', () => {
  assert.strictEqual(jev.leerNoul({ nouls: { a: { noul: 0.7 } } }, 'a'), 0.7)
  assert.strictEqual(jev.leerNoul({ noul: { a: { noul: 0.7 } } }, 'a'), 0.7)
  assert.strictEqual(jev.leerNoul({ a: { noul: 0.7 } }, 'a'), 0.7)
})

test('lee choice y score con su confianza', () => {
  const c = jev.leerChoice({ choices: { t: { choice: 'billing', confidence: 0.95 } } }, 't')
  assert.strictEqual(c.opcion, 'billing')
  assert.strictEqual(c.confianza, 0.95)
  const s = jev.leerScore({ scores: { r: { score: 0.75, confidence: 0.92 } } }, 'r')
  assert.strictEqual(s.puntaje, 0.75)
})

// Una respuesta incompleta NO puede pasar por una decision: si Jev no contesto, hay que enterarse.
test('una respuesta sin la pregunta pedida es error, no undefined', () => {
  assert.throws(() => jev.leerNoul({ nouls: {} }, 'a'), /no devolvio un noul/)
  assert.throws(() => jev.leerChoice({ choices: {} }, 'a'), /no devolvio un choice/)
  assert.throws(() => jev.leerScore({}, 'a'), /no devolvio un score/)
})
