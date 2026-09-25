// check-veredicto.js - la ULTIMA LINEA de `check`, pura. Recibe el conteo, devuelve el texto.
//
// POR QUE EXISTE: `check` cerraba con "OK check: todo verde" aunque hubiera salteado gates, y el
// veredicto no distinguia "paso" de "no corrio". Fichado el 27/08 en ICC-150 y re-reproducido el
// mismo dia: una tanda que solo tocaba .md salteaba los TRES gates de PL/SQL -lint, compila y
// tests contra la base- y terminaba igual con "todo verde". El salteo esta bien y es deliberado;
// lo que mentia es la ultima linea, que es justo la que lee el que cierra la tanda.
//
// Y LOS DOS SALTEOS NO SON LO MISMO:
//   - por ALCANCE ("ningun .sql cambio"): no habia nada que medir. Es la respuesta correcta.
//   - por ENTORNO ("sin credenciales de BD"): habia algo que medir y esta maquina no pudo. Eso no
//     lo arregla el que escribe el codigo, y tiene que verse distinto: es la diferencia entre
//     "no aplica" y "nadie lo probo".
//
// La regla: **"todo verde" queda SOLO cuando corrieron todos**. Con uno salteado, la linea dice
// cuantos corrieron y cuantos no, y por que.

function veredicto({ verdes = 0, fallaron = 0, alcance = [], entorno = [] } = {}) {
  if (fallaron) return { ok: false, linea: 'FALLO check: revisa lo de arriba' }

  if (!alcance.length && !entorno.length) {
    return { ok: true, linea: `OK check: todo verde (${verdes} gates)` }
  }

  const partes = [`OK check: ${verdes} en verde`]
  if (alcance.length) partes.push(`${alcance.length} sin nada que medir`)
  if (entorno.length) partes.push(`${entorno.length} que ESTA MAQUINA no pudo correr`)

  const linea = partes.join(', ')
  const detalle = []
  // Lo del entorno se nombra uno por uno: es lo unico que quedo sin probar de verdad, y quien lee
  // esto tiene que poder decidir si eso importa para lo que esta por cerrar.
  if (entorno.length) {
    detalle.push(`   sin correr por el entorno: ${entorno.join(', ')}`)
    detalle.push('   eso NO es "paso": es que nadie lo probo aca. Si el cambio los toca, corrélos donde si corran.')
  }
  return { ok: true, linea, detalle }
}

module.exports = { veredicto }
