// Logica pura del documento de EVIDENCIA: convertir los nombres tecnicos que quedan en el codigo
// de los tests en prosa que entienda quien recibe la entrega. Sin fs, sin argv -> node --test.
//
// Por que existe: el documento lo lee el analista o el usuario que aprueba, no nosotros. Un titulo
// que dice `icc110-modal-150` y un pie en minuscula sin punto ("guardar sin ningun canal avisa")
// se leen como notas internas, y el que las lee no sabe si eso es lo que se probo o el nombre de
// un archivo. Lo tecnico no se pierde: baja a letra chica, para poder rastrearlo.

// Un titulo de spec suele venir "ICC-110 - T2: campo Canal del modal Gensolicitud (pagina 150,
// app 158, ambiente de TEST)." El ticket ya esta en el H1 del documento, asi que repetirlo en cada
// seccion es ruido; y el punto final sobra en un encabezado.
function tituloDeSeccion(tituloSpec, archivo, ticket) {
  const limpio = String(tituloSpec || '').trim()
  if (!limpio) return nombreLegible(archivo)
  let t = limpio
  if (ticket) t = t.replace(new RegExp(`^${ticket}\\s*[-:]\\s*`, 'i'), '')
  return t.replace(/\.$/, '').trim() || nombreLegible(archivo)
}

// Ultimo recurso, cuando el spec no dice de que se trata: al menos que no sea un nombre de archivo.
// `icc110-modal-150.test.js` -> `Modal 150`.
function nombreLegible(archivo) {
  const base = String(archivo || '').replace(/\.test\.js$/, '').replace(/^.*[\\/]/, '')
  const partes = base.split('-').filter((p) => p && !/^[a-z]{2,5}\d+$/i.test(p))
  const texto = partes.join(' ').trim()
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : base
}

// El titulo de un caso se escribe en el test como una frase suelta y en minuscula ("guardar sin
// ningun canal avisa"). Como pie de una captura tiene que leerse como una afirmacion: mayuscula
// inicial y punto final. No se toca el resto -reescribir el texto seria inventar-.
function comoOracion(texto) {
  const t = String(texto || '').trim()
  if (!t) return ''
  const conMayuscula = t.charAt(0).toUpperCase() + t.slice(1)
  return /[.!?:]$/.test(conMayuscula) ? conMayuscula : conMayuscula + '.'
}

// "Caso 3 - Guardar sin ningun canal avisa." Se numera para poder referirse a uno por telefono
// ("mira el caso 3"), que con el nombre del archivo no se puede.
function encabezadoDeCaso(n, titulo) {
  const oracion = comoOracion(titulo)
  const numero = /^\d+$/.test(String(n)) ? `Caso ${n}` : comoOracion(String(n)).replace(/\.$/, '')
  if (!oracion || oracion.replace(/\.$/, '') === numero) return numero
  return `${numero} - ${oracion}`
}

// Lee el veredicto POR CASO del TAP que deja apex-e2e. Existe porque una captura sola no prueba
// nada: el 11/08 el caso 14 de la pagina 189 corto por timeout y su captura era la del caso 13,
// byte a byte -y el documento la mostraba como evidencia de algo que nunca se vio-.
//
// En el TAP los casos son subtests indentados:  "    not ok 14 - 14. T3 - el estado tiene etiqueta"
// La descripcion repite el numero, que es como se los nombra en el spec (`caso(14, '...')`).
const RE_SUBTEST = /^\s+(ok|not ok) \d+ - (.*)$/

function veredictos(textosTap) {
  const mapa = new Map()
  for (const texto of [].concat(textosTap || [])) {
    for (const linea of String(texto).split('\n')) {
      const m = RE_SUBTEST.exec(linea)
      if (!m) continue
      const paso = m[1] === 'ok'
      const desc = m[2].trim()
      const conNumero = /^(\d+)\.\s*(.*)$/.exec(desc)
      // Se indexa por numero+titulo y tambien por titulo solo: los specs viejos no numeran.
      if (conNumero) mapa.set(`${conNumero[1]}|${conNumero[2]}`, paso)
      mapa.set(desc, paso)
      if (conNumero) mapa.set(conNumero[2], paso)
    }
  }
  return mapa
}

// null = no hay dato (no se downgradea a ciegas: solo se marca lo que SE SABE que fallo).
function veredictoDe(mapa, n, titulo) {
  if (!mapa || !mapa.size) return null
  const claves = [`${n}|${titulo}`, `${n}. ${titulo}`, titulo, String(n)]
  for (const k of claves) if (mapa.has(k)) return mapa.get(k)
  return null
}

// Un caso declarado dentro de `if (process.env.E2E_CONTROL_NEGATIVO === '1') { ... }` es un
// control negativo: una corrida normal nunca lo ejecuta (hace falta la variable de entorno), asi
// que nunca deja captura. Listarlo igual que un caso normal sin captura confunde al que recibe la
// evidencia: parece un caso que fallo, cuando en realidad ni corrio a proposito. Se detectan los
// rangos del bloque (contando llaves, no un parser de JS completo -mismo criterio que RE_BLOQUE/
// RE_CASO de evidencia-e2e.js-) para que quien arma la lista de casos pueda saltearlos.
const RE_GUARD_CONTROL_NEGATIVO = /if\s*\(\s*process\.env\.E2E_CONTROL_NEGATIVO\s*===\s*'1'\s*\)\s*\{/g

function rangosControlNegativo(texto) {
  const t = String(texto || '')
  const rangos = []
  for (const m of t.matchAll(RE_GUARD_CONTROL_NEGATIVO)) {
    let profundidad = 1
    let i = m.index + m[0].length
    while (i < t.length && profundidad > 0) {
      if (t[i] === '{') profundidad++
      else if (t[i] === '}') profundidad--
      i++
    }
    rangos.push({ inicio: m.index, fin: i })
  }
  return rangos
}

module.exports = {
  tituloDeSeccion,
  nombreLegible,
  comoOracion,
  encabezadoDeCaso,
  veredictos,
  veredictoDe,
  rangosControlNegativo,
}
