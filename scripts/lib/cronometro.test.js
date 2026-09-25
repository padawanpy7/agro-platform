const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const crono = require('./cronometro')

// Los tests NUNCA escriben en work/tiempos.jsonl: contaminarian con corridas inventadas los datos
// que despues se promedian. Cada caso que persiste usa su propio archivo temporal.
function tmp() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'crono-')), 'tiempos.jsonl')
}

afterEach(() => crono.reiniciar())

test('formatear usa ms abajo del segundo y s con un decimal arriba', () => {
  assert.equal(crono.formatear(180), '180 ms')
  assert.equal(crono.formatear(999), '999 ms')
  assert.equal(crono.formatear(1000), '1.0 s')
  assert.equal(crono.formatear(74200), '74.2 s')
})

test('sin cronometro arrancado, activo() no mide ni estorba', async () => {
  const c = crono.activo()
  assert.equal(c.activo, false)
  assert.equal(await c.paso('lo que sea', async () => 42), 42)
  assert.equal(c.resumen(), null)
})

test('paso devuelve lo que devuelve la funcion y lo deja registrado', async () => {
  const c = crono.arrancar('prueba', { app: 158 }, { archivo: tmp(), alSalir: false })
  assert.equal(await c.paso('uno', async () => 'valor'), 'valor')
  const linea = c.resumen()
  assert.equal(linea.pasos.length, 1)
  assert.equal(linea.pasos[0].n, 'uno')
  assert.equal(linea.pasos[0].ok, true)
  assert.deepEqual(linea.contexto, { app: 158 })
})

// El caso que motiva envolver en vez de start/stop: un paso puede fallar a proposito como parte
// del flujo normal de una tool. Ese paso tiene que quedar medido y marcado, no perdido.
test('un paso que explota queda medido, marcado ok:false, y el error sigue viaje', async () => {
  const c = crono.arrancar('prueba', {}, { archivo: tmp(), alSalir: false })
  await assert.rejects(
    () => c.paso('el que falla', async () => { throw new Error('boom') }),
    /boom/
  )
  const linea = c.resumen({ ok: false })
  assert.equal(linea.pasos[0].ok, false)
  assert.equal(linea.ok, false)
})

test('los pasos anidados guardan su nivel y quedan en orden de ARRANQUE, no de fin', async () => {
  const c = crono.arrancar('prueba', {}, { archivo: tmp(), alSalir: false })
  await c.paso('padre', async () => {
    await c.paso('hijo 1', async () => {})
    await c.paso('hijo 2', async () => {})
  })
  await c.paso('hermano', async () => {})
  const linea = c.resumen()
  assert.deepEqual(linea.pasos.map((p) => [p.n, p.nivel]), [
    ['padre', 0], ['hijo 1', 1], ['hijo 2', 1], ['hermano', 0],
  ])
})

test('resumen agrega UNA linea JSON por corrida, sin pisar las anteriores', () => {
  const archivo = tmp()
  crono.arrancar('primera', {}, { archivo, alSalir: false }).resumen()
  crono.arrancar('segunda', {}, { archivo, alSalir: false }).resumen()
  const lineas = fs.readFileSync(archivo, 'utf8').trim().split('\n')
  assert.equal(lineas.length, 2)
  assert.deepEqual(lineas.map((l) => JSON.parse(l).tool), ['primera', 'segunda'])
})

// El `finally` de la tool y el handler de salida llaman los dos a resumen: la corrida tiene que
// quedar UNA vez. Si no, cada import cargaria el archivo con la misma medicion duplicada.
test('resumen es idempotente: la segunda llamada no escribe nada', () => {
  const archivo = tmp()
  const c = crono.arrancar('prueba', {}, { archivo, alSalir: false })
  assert.notEqual(c.resumen(), null)
  assert.equal(c.resumen(), null)
  assert.equal(fs.readFileSync(archivo, 'utf8').trim().split('\n').length, 1)
})

// Medir no puede costar el trabajo: si el destino es imposible, se avisa y se sigue.
test('si el archivo no se puede escribir, resumen no explota', () => {
  const c = crono.arrancar('prueba', {}, { archivo: path.join(os.tmpdir(), 'crono-no-existe\0', 'x.jsonl') })
  assert.doesNotThrow(() => c.resumen())
})
