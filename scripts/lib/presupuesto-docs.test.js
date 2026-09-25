const { test } = require('node:test')
const assert = require('node:assert')
const p = require('./presupuesto-docs')

const topes = [
  { archivo: 'A.md', tope: 100, porque: 'porque si' },
  { archivo: 'B.md', tope: 50, porque: 'porque tambien' },
]

test('dentro del tope, pasa', () => {
  const r = p.evaluar([{ archivo: 'A.md', lineas: 100 }, { archivo: 'B.md', lineas: 1 }], topes)
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.excedidos.length, 0)
})

// El tope es el maximo aceptable, no el primer valor que falla: 100/100 pasa, 101 no.
test('el tope es inclusivo', () => {
  assert.strictEqual(p.evaluar([{ archivo: 'A.md', lineas: 101 }], topes).ok, false)
})

test('excedido dice CUANTO sobra', () => {
  const r = p.evaluar([{ archivo: 'A.md', lineas: 892 }], topes)
  assert.strictEqual(r.ok, false)
  assert.strictEqual(r.excedidos[0].sobra, 792)
})

// Un archivo que todavia no existe no puede reprobar: PROGRESO.md no esta en un repo recien
// clonado, y un gate que falla por eso se desactiva el primer dia.
test('un archivo ausente no es violacion', () => {
  const r = p.evaluar([], topes)
  assert.strictEqual(r.ok, true)
  assert.ok(r.filas.every((f) => f.ausente))
})

test('varios excedidos se listan todos, no solo el primero', () => {
  const r = p.evaluar([{ archivo: 'A.md', lineas: 200 }, { archivo: 'B.md', lineas: 60 }], topes)
  assert.deepEqual(r.excedidos.map((f) => f.archivo), ['A.md', 'B.md'])
})

// El informe tiene que decir QUE hacer: "estas en 892" sin el porque deja al que lo lee
// decidiendo a ciegas que sacar.
test('el informe del excedido trae el cuanto y el que hacer', () => {
  const texto = p.informe(p.evaluar([{ archivo: 'A.md', lineas: 200 }], topes))
  assert.match(texto, /SOBRAN 100/)
  assert.match(texto, /porque si/)
})

test('el presupuesto cubre los documentos de arranque Y los playbooks', () => {
  assert.deepEqual(p.PRESUPUESTO.map((x) => x.archivo), [
    'AGENTS.md',
    'memory/MEMORY.md',
    'jira/META/PROGRESO.md',
    'memory/playbooks/db.md',
    'memory/playbooks/apex.md',
    'memory/playbooks/lead.md',
    'memory/playbooks/kove.md',
  ])
})

// Un tope sin motivo escrito no se puede discutir cuando salte: el que lo ve en rojo no sabe si
// achicar el archivo o subir el numero.
test('cada tope declara POR QUE ese archivo tiene techo', () => {
  for (const p1 of p.PRESUPUESTO) {
    assert.ok(p1.tope > 0, `${p1.archivo} sin tope`)
    assert.ok(p1.porque && p1.porque.length > 20, `${p1.archivo} sin motivo escrito`)
  }
})

const core = p

// --- delta: cuanto crecio, no cuanto mide -------------------------------------------------------
test('un playbook que crece poco pasa', () => {
  const r = core.evaluarDelta([{ archivo: 'memory/playbooks/db.md', crecio: 2 }])
  assert.strictEqual(r.ok, true)
})

test('justo en el tope pasa; una linea mas, no', () => {
  assert.strictEqual(core.evaluarDelta([{ archivo: 'memory/playbooks/db.md', crecio: 3 }]).ok, true)
  assert.strictEqual(core.evaluarDelta([{ archivo: 'memory/playbooks/db.md', crecio: 4 }]).ok, false)
})

test('volcar una seccion entera en un playbook FALLA, y se dice cual', () => {
  const r = core.evaluarDelta([{ archivo: 'memory/playbooks/apex.md', crecio: 22 }])
  assert.strictEqual(r.ok, false)
  assert.deepStrictEqual(r.excedidos.map((f) => f.archivo), ['memory/playbooks/apex.md'])
  assert.ok(core.informeDelta(r).includes('+22'))
})

test('SACAR lineas nunca falla: podar siempre esta permitido', () => {
  const r = core.evaluarDelta([{ archivo: 'memory/playbooks/db.md', crecio: -80 }])
  assert.strictEqual(r.ok, true)
  assert.ok(core.informeDelta(r).includes('-80'))
})

test('un archivo que no se toco no aparece en el informe', () => {
  const r = core.evaluarDelta([{ archivo: 'memory/playbooks/db.md', crecio: 1 }])
  assert.deepStrictEqual(r.tocados.map((f) => f.archivo), ['memory/playbooks/db.md'])
  assert.ok(core.informeDelta(r).includes('db.md'))
  assert.ok(!core.informeDelta(r).includes('kove.md'))
})

test('sin cambios, el informe lo dice en vez de quedarse mudo', () => {
  assert.ok(core.informeDelta(core.evaluarDelta([])).includes('ningun documento'))
})

test('el mensaje del que se paso nombra el archivo hermano, que es la accion', () => {
  const r = core.evaluarDelta([{ archivo: 'memory/playbooks/kove.md', crecio: 30 }])
  assert.ok(core.informeDelta(r).includes('kove-hechos.md'), 'el porque del presupuesto dice a donde va')
})

// --- el maximo es un PARAMETRO, con tres niveles ------------------------------------------------
test('sin nada, cada documento usa el default del proyecto', () => {
  assert.strictEqual(core.CRECIMIENTO_MAXIMO, 3)
  assert.strictEqual(core.evaluarDelta([{ archivo: 'memory/playbooks/db.md', crecio: 3 }]).ok, true)
  assert.strictEqual(core.evaluarDelta([{ archivo: 'memory/playbooks/db.md', crecio: 4 }]).ok, false)
})

test('un documento puede traer su propio maximo, sin tocar a los demas', () => {
  const presupuesto = [
    { archivo: 'suelto.md', tope: 100, porque: 'x', maxCrecimiento: 20 },
    { archivo: 'estricto.md', tope: 100, porque: 'y' },
  ]
  const r = core.evaluarDelta(
    [{ archivo: 'suelto.md', crecio: 15 }, { archivo: 'estricto.md', crecio: 15 }], { presupuesto })
  assert.deepStrictEqual(r.excedidos.map((f) => f.archivo), ['estricto.md'])
  assert.strictEqual(r.filas.find((f) => f.archivo === 'suelto.md').tope, 20)
})

test('el tope de la corrida pisa al del documento y al default', () => {
  const presupuesto = [{ archivo: 'suelto.md', tope: 100, porque: 'x', maxCrecimiento: 20 }]
  assert.strictEqual(core.evaluarDelta([{ archivo: 'suelto.md', crecio: 15 }], { tope: 5, presupuesto }).ok, false)
  assert.strictEqual(core.evaluarDelta([{ archivo: 'suelto.md', crecio: 15 }], { tope: 50, presupuesto }).ok, true)
})

test('tope 0 es un tope, no "sin tope": ninguna linea de mas', () => {
  assert.strictEqual(core.evaluarDelta([{ archivo: 'memory/playbooks/db.md', crecio: 1 }], { tope: 0 }).ok, false)
  assert.strictEqual(core.evaluarDelta([{ archivo: 'memory/playbooks/db.md', crecio: 0 }], { tope: 0 }).ok, true)
})

test('el informe dice el maximo que se aplico, no uno generico', () => {
  const presupuesto = [{ archivo: 'suelto.md', tope: 100, porque: 'x', maxCrecimiento: 7 }]
  const r = core.evaluarDelta([{ archivo: 'suelto.md', crecio: 9 }], { presupuesto })
  assert.ok(core.informeDelta(r).includes('el maximo es +7'))
})

// --- subir un techo (31/08) ----------------------------------------------------------------------
const BASE = [{ archivo: 'a.md', tope: 500, porque: 'se lee en cada tarea' }]

test('subir el techo SIN cambiar el motivo no pasa', () => {
  const r = core.evaluarSubidas([{ archivo: 'a.md', tope: 560, porque: 'se lee en cada tarea' }], BASE)
  assert.strictEqual(r.ok, false)
  assert.deepStrictEqual(r.sinMotivo.map((s) => s.archivo), ['a.md'])
  assert.ok(core.informeSubidas(r).includes('500 -> 560'))
})

test('subir el techo Y decir por que es una salida valida', () => {
  const r = core.evaluarSubidas([{ archivo: 'a.md', tope: 560, porque: 'ahora incluye el contrato de la FSM, que no va a un hermano' }], BASE)
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.subidas.length, 1)
  assert.ok(core.informeSubidas(r).includes('con motivo nuevo'))
})

test('BAJAR el techo nunca se cuestiona, aunque el motivo no cambie', () => {
  const r = core.evaluarSubidas([{ archivo: 'a.md', tope: 400, porque: 'se lee en cada tarea' }], BASE)
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.subidas.length, 0)
})

test('un documento NUEVO no es una subida: no habia techo que subir', () => {
  const r = core.evaluarSubidas([...BASE, { archivo: 'b.md', tope: 900, porque: 'nace hoy' }], BASE)
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.subidas.length, 0)
})

// Sin base -sin git, o un project.yml que todavia no declaraba presupuesto- no se puede saber si un
// techo subio. Se dice que no se midio; no se inventa un rojo ni un verde con autoridad.
test('sin base no se juzga ninguna subida', () => {
  assert.strictEqual(core.evaluarSubidas([{ archivo: 'a.md', tope: 9999, porque: 'x' }], []).ok, true)
  assert.strictEqual(core.evaluarSubidas([{ archivo: 'a.md', tope: 9999, porque: 'x' }], null).ok, true)
})
