// cronometro.js - mide cuanto tarda CADA paso de una tool y deja el rastro para poder comparar
// corridas entre si.
//
// Existe para contestar con datos, y no con intuicion, la pregunta "donde se va el tiempo": en una
// tool con varios pasos remotos se sospecha de la red, del login y de un paso puntual, pero nadie
// los midio por separado. Cada corrida imprime su desglose y agrega UNA linea a
// work/tiempos.jsonl, asi el archivo se llena solo con el uso normal -sin que nadie tenga que
// acordarse de medir- y despues se promedia sobre corridas reales.
//
// Tres decisiones, las tres con motivo:
//
//  1. Los pasos se ENVUELVEN (`await crono.paso('nombre', () => ...)`) en vez de abrirse y
//     cerrarse a mano. Un start/stop se desbalancea con el primer `throw` y mide cualquier cosa, y
//     aca los throws pueden ser parte del flujo NORMAL de una tool. Envuelto, el paso que falla
//     igual queda medido y marcado.
//
//  2. Hay una instancia AMBIENTE (`activo()`). Una tool con pasos internos los mide sin que haya
//     que pasarle el cronometro por parametro a varias funciones cuyo unico trabajo seria
//     reenviarlo. Es seguro porque cada tool es UN proceso y UNA corrida. Si nadie arranco un
//     cronometro, `activo()` devuelve uno NULO que ejecuta la funcion y no mide ni escribe nada:
//     instrumentar no cambia el comportamiento de quien no pidio ser medido.
//
//  3. Medir NO puede costar el trabajo. Si el archivo no se puede escribir, se avisa por stderr y
//     la corrida sigue: la medicion es evidencia, no el trabajo. (Misma leccion que un EBUSY del
//     repo de origen, donde escribir el log auditable volteo la corrida entera.)

const fs = require('fs')
const path = require('path')

const RAIZ = path.join(__dirname, '..', '..')
const ARCHIVO = path.join(RAIZ, 'work', 'tiempos.jsonl')

// Mismo formato que usa `check` para sus gates: segundos con un decimal cuando pasa el segundo,
// milisegundos enteros cuando no. Un "0.0 s" no dice nada; un "180 ms" si.
function formatear(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`
}

// El cronometro nulo: misma interfaz, cero efecto. Que `paso` devuelva `fn()` tal cual es lo que
// permite envolver codigo sin preguntarse si hay alguien midiendo.
const NULO = {
  activo: false,
  paso: (nombre, fn) => fn(),
  resumen: () => null,
}

let ambiente = NULO

function activo() { return ambiente }

// `archivo` es parametro y no una constante fija por una razon concreta: los tests de este modulo
// corren en cada `check`, y si escribieran en el archivo de verdad meterian corridas inventadas
// justo en los datos que despues se promedian. Un instrumento que se contamina a si mismo no sirve.
function arrancar(tool, contexto = {}, { archivo = ARCHIVO, alSalir = true } = {}) {
  const inicio = Date.now()
  const pasos = []
  let nivel = 0
  let volcado = false

  const crono = {
    activo: true,
    tool,
    contexto,

    async paso(nombre, fn) {
      // El registro se reserva ANTES de correr el paso para que el orden del array sea el orden en
      // que ARRANCARON. Rellenandolo al terminar, un paso padre quedaria despues de sus hijos y el
      // desglose se leeria al reves.
      const registro = { n: nombre, nivel, ms: 0, ok: true }
      pasos.push(registro)
      nivel++
      const t0 = Date.now()
      try {
        return await fn()
      } catch (e) {
        registro.ok = false
        throw e
      } finally {
        nivel--
        registro.ms = Date.now() - t0
        console.log(`${'  '.repeat(registro.nivel)}[t] ${nombre}: ${formatear(registro.ms)}` +
          (registro.ok ? '' : ' (FALLO)'))
      }
    },

    // Imprime el ranking -que es lo que se mira- y persiste la corrida entera, con el arbol
    // completo, para poder promediar despues. Es IDEMPOTENTE: la llama el `finally` de la tool y
    // tambien el handler de salida de mas abajo, y la corrida tiene que quedar una sola vez.
    resumen({ ok = true } = {}) {
      if (volcado) return null
      volcado = true
      const totalMs = Date.now() - inicio
      const linea = {
        ts: new Date().toISOString(),
        tool,
        ok,
        totalMs,
        contexto,
        pasos: pasos.map((p) => ({ n: p.n, nivel: p.nivel, ms: p.ms, ok: p.ok })),
      }

      if (pasos.length) {
        console.log(`\n[t] ${tool} termino en ${formatear(totalMs)}. Pasos mas lentos:`)
        const ranking = [...pasos].sort((a, b) => b.ms - a.ms).slice(0, 6)
        for (const p of ranking) {
          const pct = totalMs ? Math.round((p.ms / totalMs) * 100) : 0
          console.log(`      ${formatear(p.ms).padStart(8)}  ${String(pct).padStart(3)}%  ${p.n}`)
        }
        console.log('      (un paso anidado ya esta contado dentro del tiempo de su padre)')
      }

      try {
        fs.mkdirSync(path.dirname(archivo), { recursive: true })
        fs.appendFileSync(archivo, JSON.stringify(linea) + '\n')
      } catch (e) {
        console.error(`AVISO: no pude escribir ${archivo}: ${e.message}. La corrida sigue.`)
      }
      return linea
    },
  }

  // Una tool puede cortar con `process.exit(N)` en varios caminos de guardia (pre-flight, huella,
  // lock). `process.exit` no corre los `finally`, asi que sin esto se perderia la medicion justo en
  // las corridas que frenan a mitad -que son las que mas dicen sobre donde se fue el tiempo-. El
  // handler solo escribe si nadie volco todavia, y `resumen` es sincrono, que es lo unico que se
  // puede hacer en 'exit'.
  if (alSalir) process.on('exit', (codigo) => { crono.resumen({ ok: codigo === 0 }) })

  ambiente = crono
  return crono
}

// Solo para los tests: devuelve el ambiente al estado nulo entre casos.
function reiniciar() { ambiente = NULO }

module.exports = { arrancar, activo, reiniciar, formatear, ARCHIVO, NULO }
