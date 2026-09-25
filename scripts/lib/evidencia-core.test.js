const { test } = require('node:test')
const assert = require('node:assert/strict')
const e = require('./evidencia-core')

test('el titulo de seccion sale del spec, sin repetir el ticket ni el punto final', () => {
  assert.equal(
    e.tituloDeSeccion('ICC-110 - T2: campo Canal del modal Gensolicitud (pagina 150).', 'x.test.js', 'ICC-110'),
    'T2: campo Canal del modal Gensolicitud (pagina 150)')
})

test('sin ticket que sacar, el titulo queda tal cual', () => {
  assert.equal(e.tituloDeSeccion('Campo Canal del modal', 'x.test.js', 'ICC-999'), 'Campo Canal del modal')
})

test('si el spec no dice de que se trata, al menos no se muestra un nombre de archivo', () => {
  assert.equal(e.tituloDeSeccion('', 'icc110-modal-150.test.js', 'ICC-110'), 'Modal 150')
  assert.equal(e.tituloDeSeccion(null, 'icc110-pantalla-189.test.js', 'ICC-110'), 'Pantalla 189')
})

test('un pie de captura se lee como afirmacion: mayuscula y punto', () => {
  assert.equal(e.comoOracion('guardar sin ningun canal avisa'), 'Guardar sin ningun canal avisa.')
})

test('no se duplica la puntuacion que ya estaba', () => {
  assert.equal(e.comoOracion('Ya venia bien.'), 'Ya venia bien.')
  assert.equal(e.comoOracion('¿y una pregunta?'), '¿y una pregunta?')
  assert.equal(e.comoOracion('dos puntos:'), 'Dos puntos:')
})

test('texto vacio no inventa un punto suelto', () => {
  assert.equal(e.comoOracion(''), '')
  assert.equal(e.comoOracion(null), '')
})

test('el encabezado numera para poder citar un caso por telefono', () => {
  assert.equal(e.encabezadoDeCaso(3, 'guardar sin ningun canal avisa'),
    'Caso 3 - Guardar sin ningun canal avisa.')
})

test('un caso sin numero (los specs viejos) igual queda legible', () => {
  assert.equal(e.encabezadoDeCaso('icc110-388-imprimir-caso-1', 'icc110-388-imprimir-caso-1'),
    'Icc110-388-imprimir-caso-1')
})

test('si el titulo repite el numero, no se escribe dos veces', () => {
  assert.equal(e.encabezadoDeCaso(2, ''), 'Caso 2')
})

// --- el veredicto por caso (una captura sola no prueba que el caso paso) ----------------------
const TAP = `TAP version 13
# Subtest: ICC-110 - pantalla 189
    # Subtest: 13. T7(b) - entrar a la 389 avisa
    ok 13 - 13. T7(b) - entrar a la 389 avisa
    # Subtest: 14. T3 - el estado tiene etiqueta
    not ok 14 - 14. T3 - el estado tiene etiqueta
not ok 1 - ICC-110 - pantalla 189
`

test('del TAP sale que caso paso y cual no', () => {
  const v = e.veredictos(TAP)
  assert.equal(e.veredictoDe(v, 13, 'T7(b) - entrar a la 389 avisa'), true)
  assert.equal(e.veredictoDe(v, 14, 'T3 - el estado tiene etiqueta'), false)
})

test('un caso sin dato devuelve null: no se degrada a ciegas', () => {
  const v = e.veredictos(TAP)
  assert.equal(e.veredictoDe(v, 99, 'un caso que no corrio'), null)
})

test('sin TAP no hay veredicto para nadie', () => {
  assert.equal(e.veredictoDe(e.veredictos([]), 14, 'lo que sea'), null)
})

test('se juntan los TAP de varios specs corridos por separado', () => {
  const otro = '    ok 1 - 1. el titulo es el del ER\n'
  const v = e.veredictos([TAP, otro])
  assert.equal(e.veredictoDe(v, 1, 'el titulo es el del ER'), true)
  assert.equal(e.veredictoDe(v, 14, 'T3 - el estado tiene etiqueta'), false)
})

test('el top-level no se confunde con un caso (no esta indentado)', () => {
  const v = e.veredictos(TAP)
  assert.equal(v.has('ICC-110 - pantalla 189'), false)
})

// --- rangos guardados por E2E_CONTROL_NEGATIVO (una corrida normal no los ejecuta) -------------
const SPEC_CON_CONTROL_NEGATIVO = `
    await caso(1, 'normal', async () => { assert.ok(true) })

    if (process.env.E2E_CONTROL_NEGATIVO === '1') {
      await caso('CN', 'control negativo: esto tiene que dar rojo', async () => {
        assert.strictEqual(1, 2)
      })
    }

    await caso(2, 'otro normal', async () => { assert.ok(true) })
`

test('el bloque guardado por E2E_CONTROL_NEGATIVO se detecta completo', () => {
  const rangos = e.rangosControlNegativo(SPEC_CON_CONTROL_NEGATIVO)
  assert.equal(rangos.length, 1)
  const posCN = SPEC_CON_CONTROL_NEGATIVO.indexOf("caso('CN'")
  assert.ok(rangos.some((r) => posCN >= r.inicio && posCN < r.fin))
})

test('un caso normal, fuera del bloque guardado, no cae dentro de ningun rango', () => {
  const rangos = e.rangosControlNegativo(SPEC_CON_CONTROL_NEGATIVO)
  const pos1 = SPEC_CON_CONTROL_NEGATIVO.indexOf('caso(1')
  const pos2 = SPEC_CON_CONTROL_NEGATIVO.indexOf('caso(2')
  assert.ok(!rangos.some((r) => pos1 >= r.inicio && pos1 < r.fin))
  assert.ok(!rangos.some((r) => pos2 >= r.inicio && pos2 < r.fin))
})

test('sin ese guard, no hay rangos que excluir', () => {
  assert.deepEqual(e.rangosControlNegativo("await caso(1, 'normal', async () => {})"), [])
})
