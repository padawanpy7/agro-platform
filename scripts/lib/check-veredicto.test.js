const { test } = require('node:test')
const assert = require('node:assert/strict')
const { veredicto } = require('./check-veredicto')

test('"todo verde" SOLO cuando corrieron todos', () => {
  const v = veredicto({ verdes: 10 })
  assert.equal(v.ok, true)
  assert.ok(v.linea.includes('todo verde'))
})

// El caso que motiva la ficha: una tanda de solo .md salteaba los tres gates de PL/SQL y cerraba
// diciendo "todo verde".
test('con un gate salteado, la linea NO puede decir todo verde', () => {
  const v = veredicto({ verdes: 8, alcance: ['lint', 'build', 'tests PL/SQL'] })
  assert.equal(v.ok, true)
  assert.ok(!v.linea.includes('todo verde'))
  assert.ok(v.linea.includes('8 en verde'))
  assert.ok(v.linea.includes('3 sin nada que medir'))
})

test('saltear por ENTORNO se dice distinto que saltear por alcance', () => {
  const v = veredicto({ verdes: 8, entorno: ['tests PL/SQL (base real)'] })
  assert.ok(v.linea.includes('ESTA MAQUINA no pudo correr'))
  assert.ok(v.detalle.join(' ').includes('tests PL/SQL (base real)'))
  assert.ok(v.detalle.join(' ').includes(String.raw`NO es "paso"`))
})

test('los dos motivos juntos se cuentan por separado', () => {
  const v = veredicto({ verdes: 6, alcance: ['format', 'npm audit'], entorno: ['tests PL/SQL (base real)'] })
  assert.ok(v.linea.includes('2 sin nada que medir'))
  assert.ok(v.linea.includes('1 que ESTA MAQUINA no pudo correr'))
})

test('un fallo manda sobre todo lo demas', () => {
  const v = veredicto({ verdes: 5, fallaron: 1, alcance: ['format'] })
  assert.equal(v.ok, false)
  assert.ok(v.linea.startsWith('FALLO'))
})

// Control negativo del arreglo: sin salteos vuelve a decir lo de siempre.
test('sin salteos no aparece ningun detalle de mas', () => {
  const v = veredicto({ verdes: 11 })
  assert.equal(v.detalle, undefined)
})
