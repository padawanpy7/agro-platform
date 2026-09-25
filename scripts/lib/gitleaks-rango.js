// Decide que RANGO de historia le pide a `gitleaks detect --log-opts`. Puro: recibe el puntero
// ya leido y si es ancestro de HEAD ya resuelto (eso necesita `git`, lo hace check.js); esto
// solo elige entre completo/incremental.
//
// Por que un puntero y no `merge-base(main,HEAD)`: ese calculo da un rango util SOLO parado en
// una rama que diverge de main. Paradas EN main (que es como se trabaja en este repo la mayor
// parte del tiempo, AGENTS.md) `merge-base(main,HEAD)` es HEAD mismo: no hay "lo de antes de la
// rama" que dar por ya escaneado. El puntero (ultimo commit escaneado con exito, se pise donde
// se pise) no depende de la forma de la rama.

function decidirRango({ todos, puntero, punteroEsAncestro }) {
  if (todos) return { completo: true, motivo: '--todos pide el repo entero' }
  if (!puntero) return { completo: true, motivo: 'primera corrida en esta maquina: sin puntero' }
  if (!punteroEsAncestro) {
    return {
      completo: true,
      motivo: `el puntero (${puntero}) ya no esta en la historia: se cae a la completa`,
    }
  }
  return { completo: false, rango: `${puntero}..HEAD` }
}

module.exports = { decidirRango }
