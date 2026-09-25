// integridad-archivos.js - dos cosas que rompen un archivo versionado y que ningun gate miraba.
//
// Por que existe: el 26/08/2026 paso DOS VECES en el mismo dia, sobre los dos archivos que TODAS
// las sesiones tocan a la vez. El FEATURES.json del change del loop quedo commiteado en main
// con 6 marcadores de conflicto -o sea, JSON invalido: el ledger del proyecto no se podia leer- y
// `PROGRESO.md` quedo commiteado con otros 6 por el merge de otra sesion. No lo cazo nada: ni
// `check`, ni `cierre`, ni el commit. Se descubrio a ojo, buscando otra cosa.
//
// Justo donde el conflicto es rutina es donde no habia red.

// Un marcador de conflicto de verdad tiene la TERNA COMPLETA y EN ORDEN, cada parte al principio
// de su linea. Pedir las tres evita los dos falsos obvios: un `=======` suelto es un subrayado de
// titulo en markdown o una linea separadora en un comentario SQL, y un archivo que HABLA de
// marcadores -este mismo, el ledger, un playbook- los menciona en medio de una frase, no en la
// columna 0 y no completos.
const ABRE = /^<{7} /m
const MEDIO = /^={7}\s*$/m
const CIERRA = /^>{7} /m

function marcadoresDeConflicto(contenido) {
  const texto = String(contenido || '')
  const iAbre = texto.search(ABRE)
  if (iAbre < 0) return []
  const resto = texto.slice(iAbre)
  const iMedio = resto.search(MEDIO)
  if (iMedio < 0) return []
  const iCierra = resto.slice(iMedio).search(CIERRA)
  if (iCierra < 0) return []

  // Se devuelven las lineas para poder senalarlas; el veredicto ya esta tomado.
  const lineas = []
  texto.split('\n').forEach((l, i) => {
    if (/^<{7} |^={7}\s*$|^>{7} /.test(l)) lineas.push({ linea: i + 1, texto: l.trim().slice(0, 60) })
  })
  return lineas
}

// Un .json que no parsea es peor que un archivo feo: `features` deja de poder leer el ledger y el
// estado del proyecto se vuelve invisible, sin que nadie avise.
function jsonRoto(contenido) {
  try {
    JSON.parse(String(contenido))
    return null
  } catch (e) {
    return e.message
  }
}

// archivos: [{ ruta, contenido }]
function hallazgos(archivos) {
  const salida = []
  for (const { ruta, contenido } of archivos || []) {
    const marcas = marcadoresDeConflicto(contenido)
    if (marcas.length) {
      salida.push({ archivo: ruta, tipo: 'conflicto', detalle:
        `${marcas.length} marcador/es de conflicto sin resolver (linea ${marcas[0].linea}: ${marcas[0].texto})` })
      continue
    }
    if (/\.json$/i.test(ruta)) {
      const err = jsonRoto(contenido)
      if (err) salida.push({ archivo: ruta, tipo: 'json', detalle: `no parsea: ${err}` })
    }
  }
  return salida
}

module.exports = { marcadoresDeConflicto, jsonRoto, hallazgos }
