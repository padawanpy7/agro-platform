// Regla 2.8: fija versiones (lockfile), no rangos abiertos. Puro: recibe el package.json ya
// parseado, no toca el filesystem (eso lo hace check.js).
//
// Guard de regresion: package.json quedo limpio el 13/08 (se fijaron las cuatro que faltaban),
// asi que esto no es para "encontrar" nada hoy sino para que `check` frene si alguien vuelve a
// meter un `^`/`~` sin darse cuenta.

const EXACTA = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/

function rangosAbiertos(pkg) {
  const hallazgos = []
  for (const campo of ['dependencies', 'devDependencies']) {
    const grupo = (pkg && pkg[campo]) || {}
    for (const [nombre, version] of Object.entries(grupo)) {
      if (!EXACTA.test(version)) hallazgos.push({ campo, nombre, version })
    }
  }
  return hallazgos
}

module.exports = { rangosAbiertos }
