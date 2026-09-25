// El CONTADOR de uso de las herramientas. Sirve para decidir cual conviene mantener, cual quitar
// y -desde el 10/08- cual vale la pena optimizar.
//
// Uso: node agro.js tool-usage
//   - tabla de tools ORDENADA por uso, con la fecha del ultimo uso y cuanto tarda en promedio
//   - las tools que NUNCA se usaron (candidatas a quitar)
//
// Lo alimenta agro.js: metrics/tool-usage.log lleva una linea por corrida (fecha, tool) y
// metrics/tool-runs.log suma el resultado (fecha, tool, exit, ms, argumentos).
//
// La columna de TIEMPO es la que faltaba: hasta que existio, "optimizar las tools" se decidia por
// cuantas veces se usa cada una, que no dice nada de cuanto cuesta. En el repo de origen la primera
// medicion con este dato mostro que la mayor parte del tiempo de una tool de compilacion era el
// loop de shell alrededor, no el proceso que hacia el trabajo.
//
// "Que tools hay" sale del registro compartido (scripts/lib/tools-registro.js) y ya no de grepear
// `_count.sh` dentro de los `*.sh`: esos wrappers se fueron.

const fs = require('fs')
const path = require('path')
const { descubrirTools } = require('../lib/tools-registro')

const RAIZ = process.cwd()
const USOS = path.join(RAIZ, 'metrics', 'tool-usage.log')
const CORRIDAS = path.join(RAIZ, 'metrics', 'tool-runs.log')

const leerLineas = (f) => {
  try { return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean) } catch { return [] }
}

// Duracion: mediana, no promedio. Una sola corrida con la red caida (o un timeout de 120 s)
// arrastra el promedio y hace parecer cara una tool que normalmente vuela.
function mediana(xs) {
  if (!xs.length) return null
  const o = [...xs].sort((a, b) => a - b)
  const m = Math.floor(o.length / 2)
  return o.length % 2 ? o[m] : Math.round((o[m - 1] + o[m]) / 2)
}

const comoTiempo = (ms) => (ms == null ? '' : ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`)

// Una corrida de mas de 10 minutos es un proceso que quedo colgado, no trabajo de la tool: la
// sesion se interrumpio y el cronometro siguio contando hasta que el proceso murio. Medido el
// 17/08 sobre 1619 corridas del repo de origen: la mas larga LEGITIMA fue una tool de accion con
// 399 s, y arriba del umbral hubo exactamente dos, las dos con exit != 0 (un gate de 14 h y una
// tool de accion de 32 min). Cuentan igual en la mediana -donde un outlier no molesta- pero NO en
// el total, que es una suma y por eso un solo zombi la decide: ese unico gate de 14 h era el 95%
// de los 53.042 s que la tool le atribuia, y lo dejaba primero en "donde se va el tiempo" siendo
// que su corrida tipica son 5,8 s.
const ZOMBI_MS = 10 * 60 * 1000

const usos = new Map()   // tool -> { n, ultimo }
for (const linea of leerLineas(USOS)) {
  const [fecha, tool] = linea.split('\t')
  if (!tool) continue
  const a = usos.get(tool) || { n: 0, ultimo: '' }
  a.n++
  if (fecha > a.ultimo) a.ultimo = fecha
  usos.set(tool, a)
}

const tiempos = new Map()  // tool -> [ms...]
const fallas = new Map()   // tool -> corridas que no salieron con 0
// La 7a columna es la tool que LANZO esta corrida, y la escribe agro.js desde el 18/08. Las corridas
// anteriores no la tienen: no se puede saber si fueron sueltas o anidadas, y por eso se cuentan
// aparte en vez de suponer que fueron sueltas -que es justo lo que inflaria el ranking-.
let conPadre = 0
let sinDato = 0
let msAnidado = 0
for (const linea of leerLineas(CORRIDAS)) {
  const partes = linea.split('\t')
  const [, tool, exit, ms] = partes
  const padre = partes.length >= 7 ? partes[6] : null
  if (!tool) continue
  if (ms && !Number.isNaN(Number(ms))) {
    if (!tiempos.has(tool)) tiempos.set(tool, [])
    tiempos.get(tool).push(Number(ms))
    if (padre === null) sinDato++
    else {
      conPadre++
      if (padre && Number(ms) <= ZOMBI_MS) msAnidado += Number(ms)
    }
  }
  if (exit && exit !== '0') fallas.set(tool, (fallas.get(tool) || 0) + 1)
}

console.log('== Contador de uso de tools ==')
if (!usos.size) {
  console.log('  (sin registros todavia: corre alguna tool y volve a mirar)')
} else {
  console.log('  usos  ultimo-uso           mediana   fallas  tool')
  const filas = [...usos.entries()].sort((a, b) => b[1].n - a[1].n)
  for (const [tool, a] of filas) {
    const med = comoTiempo(mediana(tiempos.get(tool) || []))
    const err = fallas.get(tool) || ''
    console.log(`${String(a.n).padStart(6)}  ${a.ultimo.padEnd(19)}  ${med.padStart(7)}  ${String(err).padStart(6)}  ${tool}`)
  }
}

console.log('')
console.log('== Tools SIN uso registrado (candidatas a quitar) ==')
const sinUso = [...descubrirTools(RAIZ).keys()].filter((t) => !usos.has(t)).sort()
if (!sinUso.length) console.log('  (ninguna: todas se usaron al menos una vez)')
else for (const t of sinUso) console.log(`  - ${t}`)

// El tiempo total es el argumento para priorizar: una tool de 1 s usada 200 veces cuesta mas que
// una de 20 s usada 3. Sin esta linea la tabla invita a optimizar la mas lenta, no la mas cara.
const zombis = []
for (const [t, xs] of tiempos) for (const ms of xs) if (ms > ZOMBI_MS) zombis.push([t, ms])
const TOPE_FILAS = 10
const todas = [...tiempos.entries()]
  .map(([t, xs]) => [t, xs.filter((ms) => ms <= ZOMBI_MS)])
  .map(([t, xs]) => [t, xs.reduce((a, b) => a + b, 0), xs.length, mediana(xs)])
  .sort((a, b) => b[1] - a[1])
const totalMedido = todas.reduce((a, x) => a + x[1], 0)
const gasto = todas.slice(0, TOPE_FILAS)
if (gasto.length) {
  console.log('')
  console.log(`== Donde se va el tiempo (medido, top ${gasto.length} de ${todas.length}) ==`)
  // El % es lo que convierte la lista en una decision: una tool que se lleva el 2% no vale la pena
  // optimizarla por mas lenta que se vea, y una de 5 s que se lleva el 20% si.
  for (const [t, total, n, med] of gasto) {
    const parte = totalMedido ? `${((total / totalMedido) * 100).toFixed(1)}%` : ''
    console.log(`  ${comoTiempo(total).padStart(8)}  ${parte.padStart(6)}  en ${String(n).padStart(4)} corrida(s)  ${comoTiempo(med).padStart(7)} c/u  ${t}`)
  }
  // Lo que queda afuera se DICE: una lista cortada que no declara el resto se lee como el total.
  const resto = todas.slice(TOPE_FILAS)
  if (resto.length) {
    const msResto = resto.reduce((a, x) => a + x[1], 0)
    console.log(`  ${comoTiempo(msResto).padStart(8)}  ${(totalMedido ? ((msResto / totalMedido) * 100).toFixed(1) + '%' : '').padStart(6)}  en las otras ${resto.length} tool(s)`)
  }
  console.log(`  total medido: ${comoTiempo(totalMedido)}`)
  // Una tool que corre adentro de otra suma su tiempo DOS veces en esta lista: una como ella
  // misma y otra dentro del total de su padre. Decirlo es la diferencia entre un ranking y una
  // trampa: hasta el 18/08 el top lo encabezaba `check`, que es la suma de sus propios hijos.
  if (conPadre) {
    const parte = totalMedido ? `${((msAnidado / totalMedido) * 100).toFixed(1)}%` : ''
    console.log(`  de ese total, ${comoTiempo(msAnidado)} (${parte}) corrio ADENTRO de otra tool: esta contado dos veces`)
  }
  if (sinDato) {
    console.log(`  ${sinDato} corrida(s) son anteriores al 18/08 y no registran quien las lanzo: no se sabe si fueron anidadas`)
  }
  console.log('  (solo cuenta lo corrido por agro.js: las corridas viejas no tienen tiempo)')
  // Se dicen, no se descartan en silencio: una lista que oculta lo que saco se lee como si
  // hubiera contado todo.
  for (const [t, ms] of zombis.sort((a, b) => b[1] - a[1])) {
    console.log(`  fuera del total: ${t} ${comoTiempo(ms)} en una sola corrida (proceso colgado, no trabajo)`)
  }
}
