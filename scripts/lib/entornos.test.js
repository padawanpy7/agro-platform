const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const e = require('./entornos')

// El archivo real del repo, no un fixture: lo que se quiere saber es si ESTE entornos.yml se
// puede leer. Un test contra un fixture inventado pasa aunque el archivo versionado este roto.
test('entornos.yml del repo se parsea y declara al menos un entorno', () => {
  e._resetCache()
  assert.ok(fs.existsSync(e.ARCHIVO), 'falta entornos.yml')
  const nombres = Object.keys(e.entornos())
  assert.ok(nombres.length > 0, 'entornos.yml no declara ningun entorno')
})

test('un entorno declarado se devuelve entero', () => {
  e._resetCache()
  const nombre = Object.keys(e.entornos())[0]
  assert.ok(e.entorno(nombre))
})

// Lo que se prueba no es que tire error, es que el error DIGA cuales hay: sin eso, un nombre mal
// escrito manda a leer el YAML a mano.
test('un entorno que no existe se dice con la lista de los que si', () => {
  e._resetCache()
  const declarados = Object.keys(e.entornos())
  assert.throws(() => e.entorno('no-existe-este'), (err) => {
    assert.match(err.message, /no-existe-este/)
    for (const n of declarados) assert.ok(err.message.includes(n), `el error no nombra "${n}"`)
    return true
  })
})

test('variables() no explota cuando apps.env no esta', () => {
  e._resetCache()
  assert.strictEqual(typeof e.variables(), 'object')
})
