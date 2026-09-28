// Cliente de Jev, el modelo System One de TypeSafe AI.
//
// POR QUE ESTA ACA, y no es una integracion mas: **Jev no puede escribir.** No emite una cadena:
// toma un estado y preguntas declaradas, y devuelve decisiones TIPADAS con probabilidad calibrada.
//
// Eso lo hace la pieza que le faltaba a la skill `contenido-de-terceros`. El problema de leer
// material de terceros es que su texto puede venir con forma de orden; si el que lo procesa puede
// emitir texto libre, se lo puede convencer de emitir otra cosa. **A Jev no**: su salida es un
// numero o una opcion de una lista que nosotros declaramos. Una pagina maliciosa puede intentar
// dirigirlo y lo peor que consigue es mover una probabilidad.
//
// No reemplaza la capa fuerte -no darle herramientas de accion a quien lee-, la complementa: ahora
// tambien el que MIRA el texto es incapaz de obedecerlo.
//
// API (documentacion publica, 28/09/2026):
//   POST https://api.typesafe.ai/v1/systemone
//   Authorization: Bearer $TYPESAFE_API_KEY
//   { model, state, questions: { <nombre>: { type: "noul"|"choice"|"score", instructions, criteria? } } }
//
// Los tres tipos:
//   noul   -> probabilidad de que una afirmacion sea cierta (0 a 1)
//   choice -> una opcion de las declaradas, con probabilidad por opcion y confianza
//   score  -> puntaje continuo sobre niveles ordenados, con distribucion y confianza
//
// Las preguntas se evaluan EN PARALELO: agregar una casi no cambia la latencia.
//
// SIN VERIFICAR CONTRA LA API REAL. Jev esta en acceso temprano por lista de espera y en esta
// maquina no hay clave. La forma del request y de la respuesta sale de la documentacion publica,
// que **no es lo mismo que haberla llamado**. Por eso: sin clave esto NO adivina ni finge, tira un
// error que lo dice. El dia que haya clave, la primera corrida es la verificacion.

const ENDPOINT = process.env.JEV_ENDPOINT || 'https://api.typesafe.ai/v1/systemone'
const MODELO = process.env.JEV_MODELO || 'jev-latest'

const hayClave = () => Boolean(process.env.TYPESAFE_API_KEY)

// `fetchImpl` se inyecta para testear sin red.
async function preguntar(state, questions, { fetchImpl = fetch, timeoutMs = 30000 } = {}) {
  const clave = process.env.TYPESAFE_API_KEY
  if (!clave) {
    const e = new Error('falta TYPESAFE_API_KEY: Jev no se puede llamar y no se va a adivinar la respuesta')
    e.code = 'SIN_CLAVE'
    throw e
  }
  if (!state || !questions || !Object.keys(questions).length) {
    throw new Error('Jev necesita un `state` y al menos una pregunta declarada')
  }

  const r = await fetchImpl(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODELO, state, questions }),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!r.ok) {
    const e = new Error(`Jev respondio HTTP ${r.status}`)
    e.code = 'HTTP'
    e.status = r.status
    throw e
  }
  return r.json()
}

// Lectores de la respuesta. Existen para que el resto del repo NO conozca la forma del JSON: si
// TypeSafe la cambia, se toca aca y nada mas. Y porque una respuesta incompleta tiene que ser un
// error ruidoso y no un `undefined` que se propaga como si fuera una decision.
function leerNoul(res, nombre) {
  const v = res?.nouls?.[nombre]?.noul ?? res?.noul?.[nombre]?.noul ?? res?.[nombre]?.noul
  if (typeof v !== 'number') throw new Error(`Jev no devolvio un noul para \`${nombre}\``)
  return v
}

function leerChoice(res, nombre) {
  const c = res?.choices?.[nombre] ?? res?.choice?.[nombre] ?? res?.[nombre]
  if (!c || typeof c.choice !== 'string') throw new Error(`Jev no devolvio un choice para \`${nombre}\``)
  return { opcion: c.choice, confianza: c.confidence ?? null, probabilidades: c.probabilities ?? null }
}

function leerScore(res, nombre) {
  const s = res?.scores?.[nombre] ?? res?.score?.[nombre] ?? res?.[nombre]
  if (!s || typeof s.score !== 'number') throw new Error(`Jev no devolvio un score para \`${nombre}\``)
  return { puntaje: s.score, confianza: s.confidence ?? null, distribucion: s.probabilities ?? null }
}

module.exports = { preguntar, leerNoul, leerChoice, leerScore, hayClave, ENDPOINT, MODELO }
