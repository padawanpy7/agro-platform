const { test } = require('node:test')
const assert = require('node:assert/strict')
const core = require('./gaps-core')

const INFORME = {
  rotas: 0,
  gaps: [{ modo: 'kove-cargar-horas ICC-13 (exit 1)', tool: 'kove-cargar-horas', veces: 43, ultima: '2026-08-24T10:00:00' }],
  casiSiempreFalla: [],
  ayudaRota: [],
}

test('un modo de falla repetido se vuelve una ficha con su evidencia', () => {
  const { fichas: c } = core.candidatas(INFORME, [])
  assert.equal(c.length, 1)
  assert.ok(c[0].id.startsWith('HN-FALLA-KOVE-CARGAR-HORAS'))
  assert.equal(c[0].passes, false)
  assert.ok(c[0].descripcion.includes('43 veces'))
  assert.ok(c[0].pasos.some((p) => /[Cc]ontrol negativo/.test(p)))
})

// La regla dura: una ficha es el registro de por que se decidio algo.
test('nunca propone una ficha que ya existe', () => {
  const id = core.candidatas(INFORME, []).fichas[0].id
  assert.deepEqual(core.candidatas(INFORME, [id]).fichas, [])
})

test('el mismo modo propone SIEMPRE el mismo id: proponerlo dos veces no crea dos fichas', () => {
  const a = core.candidatas(INFORME, []).fichas[0].id
  const b = core.candidatas({ ...INFORME, gaps: [{ ...INFORME.gaps[0], veces: 99, ultima: '2026-09-02T00:00:00' }] }, []).fichas[0].id
  assert.equal(a, b)
})

test('el exit no entra en el id: la misma tool fallando distinto no duplica la ficha', () => {
  assert.equal(core.idDe('HN-FALLA', 'db-sql --base (exit 1)'), core.idDe('HN-FALLA', 'db-sql --base (exit 2)'))
})

test('la telemetria sucia se ficha primero: envenena todo lo que salga del log', () => {
  const { fichas: c } = core.candidatas({ ...INFORME, rotas: 194 }, [])
  assert.equal(c[0].id, 'HN-TELEMETRIA-SUCIA')
  assert.ok(c[0].descripcion.includes('194'))
})

test('una tool que falla la mitad de las veces se ficha aparte de sus modos', () => {
  const { fichas: c } = core.candidatas({ ...INFORME, casiSiempreFalla: [{ tool: 'apex-e2e', fallos: 15, corridas: 22 }] }, [])
  const f = c.find((x) => x.id.includes('INUSABLE'))
  assert.ok(f)
  assert.ok(f.descripcion.includes('68 %'))
})

test('la ayuda rota se ficha UNA vez, con todas las tools nombradas', () => {
  const { fichas: c } = core.candidatas({
    ...INFORME,
    gaps: [],
    ayudaRota: [{ tool: 'kove-tarea', modo: 'kove-tarea --help (exit 2)' }, { tool: 'db-sql', modo: 'db-sql --help (exit 2)' }],
  }, [])
  const f = c.filter((x) => x.id === 'HN-AYUDA-CUENTA-COMO-FALLO')
  assert.equal(f.length, 1)
  assert.ok(f[0].descripcion.includes('kove-tarea'))
  assert.ok(f[0].descripcion.includes('db-sql'))
})

// Control negativo del conjunto: sobre un loop sano no inventa trabajo.
test('un informe sin hallazgos no propone nada', () => {
  const r = core.candidatas({ rotas: 0, gaps: [], casiSiempreFalla: [], ayudaRota: [] }, [])
  assert.deepEqual(r.fichas, [])
  assert.ok(core.informe(r).includes('ningun gap nuevo'))
})

test('toda ficha propuesta nace en rojo y dice de donde salio', () => {
  for (const f of core.candidatas({ ...INFORME, rotas: 3 }, []).fichas) {
    assert.equal(f.passes, false)
    assert.equal(f.origen, 'cierre')
  }
})

// La leccion que ya esta escrita para el lint sin baseline: una salida que nace enorme se ignora.
test('no vuelca todas de una: propone cinco y cuenta las que faltan', () => {
  const gaps = Array.from({ length: 9 }, (_, i) => ({ modo: `tool-${i} sub (exit 1)`, tool: `tool-${i}`, veces: 20 - i, ultima: '2026-08-30T00:00:00' }))
  const r = core.candidatas({ rotas: 0, gaps, casiSiempreFalla: [], ayudaRota: [] }, [])
  assert.equal(r.fichas.length, 5)
  assert.equal(r.mas, 4)
  assert.ok(core.informe(r).includes('y 4 mas'))
})

test('los modos de --help no se fichan uno por uno: tienen su propia ficha', () => {
  const r = core.candidatas({
    rotas: 0,
    gaps: [{ modo: 'kove-tarea --help (exit 2)', tool: 'kove-tarea', veces: 12, ejemplo: '--help' }],
    casiSiempreFalla: [],
    ayudaRota: [{ tool: 'kove-tarea', modo: 'kove-tarea --help (exit 2)' }],
  }, [])
  assert.equal(r.fichas.length, 1)
  assert.equal(r.fichas[0].id, 'HN-AYUDA-CUENTA-COMO-FALLO')
})

// Una falla que dejo de pasar no es un defecto que fichar: es historia. La evidencia no es la
// antiguedad -una ventana de N dias es un numero a dedo- sino si la MISMA invocacion volvio a
// correr en VERDE despues del ultimo fallo. Medido el 09/09/2026: gaps proponia fichar
//  por 6 fallos del 11/08 y esa corrida hoy sale exit 0.
test('una falla que despues corrio en verde no se propone', () => {
  const g = { modo: 'evidencia-e2e X (exit 1)', tool: 'evidencia-e2e', veces: 6, ultima: '2026-08-11T00:00:00', ultimoOk: '2026-09-09T00:00:00' }
  assert.equal(core.candidatas({ gaps: [g] }, []).fichas.length, 0)
});

test('si el ultimo verde es ANTERIOR al ultimo fallo, sigue rota y se propone', () => {
  const g = { modo: 'evidencia-e2e X (exit 1)', tool: 'evidencia-e2e', veces: 6, ultima: '2026-09-08T00:00:00', ultimoOk: '2026-08-01T00:00:00' }
  assert.equal(core.candidatas({ gaps: [g] }, []).fichas.length, 1)
});

test('sin verde registrado NO se descarta: no saber no es lo mismo que saber que anda', () => {
  const g = { modo: 'algo X (exit 1)', tool: 'algo', veces: 4, ultima: '2026-08-11T00:00:00' }
  assert.equal(core.candidatas({ gaps: [g] }, []).fichas.length, 1)
});
