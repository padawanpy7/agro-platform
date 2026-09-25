// Decide si un comando de shell contiene un git que borra trabajo o reescribe historia. Lo usa el
// hook .claude/hooks/git-guard.js para pedir confirmacion antes de correrlo.
//
// Nace del research del 14/09/2026 (`docs/research-2026-09-14-10-repos-fazt.md`, skill
// git-guardrails de mattpocock/skills), adaptado a este repo: `git push` normal NO se frena, porque
// pushear main es parte del flujo; se frena el push que fuerza o borra en el remoto.
//
// Limites conocidos, a proposito: no sigue funciones ni alias de shell (`g(){ git ...; }; g reset
// --hard`) ni lo que corre un script de node por dentro. Es una red para el comando que se escribe
// a mano, no un sandbox.

const MOTIVO_FINAL = 'Confirmar solo si el dueño lo autorizo (regla 1 de AGENTS.md: nada destructivo sin autorizacion explicita).'

// El cuerpo de un heredoc es texto (un mensaje de commit, un archivo), no comandos.
function sinHeredocs(texto) {
  const salida = []
  let fin = null
  for (const linea of texto.split(/\r?\n/)) {
    if (fin !== null) {
      if (linea.trim() === fin) fin = null
      continue
    }
    salida.push(linea)
    const m = linea.match(/<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/)
    if (m) fin = m[2]
  }
  return salida.join('\n')
}

// Parte el comando en tramos por separadores de shell que esten FUERA de comillas, y cada tramo en
// palabras sin las comillas. Un texto entre comillas queda como una sola palabra.
function tramos(texto) {
  const res = []
  let palabras = []
  let actual = ''
  let hay = false
  let comilla = null
  const cerrarPalabra = () => { if (hay) palabras.push(actual); actual = ''; hay = false }
  const cerrarTramo = () => { cerrarPalabra(); if (palabras.length) res.push(palabras); palabras = [] }
  for (const c of texto) {
    if (comilla) {
      if (c === comilla) comilla = null
      else actual += c
      continue
    }
    if (c === '"' || c === "'") { comilla = c; hay = true; continue }
    if (/\s/.test(c) && c !== '\n') { cerrarPalabra(); continue }
    if (c === '\n' || c === ';' || c === '&' || c === '|' || c === '(' || c === ')' || c === '{' || c === '}') { cerrarTramo(); continue }
    actual += c
    hay = true
  }
  cerrarTramo()
  return res
}

const esCorta = (a) => /^-[A-Za-z]+$/.test(a)
const cortaCon = (a, letra) => esCorta(a) && a.slice(1).includes(letra)
const PATH_TODO = new Set(['.', './', ':/', '*'])

function reglaDe(sub, args) {
  switch (sub) {
    case 'reset':
      return args.includes('--hard') ? 'git reset --hard descarta los cambios sin commitear' : null
    case 'clean': {
      const seco = args.includes('--dry-run') || args.some((a) => cortaCon(a, 'n'))
      const fuerza = args.includes('--force') || args.some((a) => cortaCon(a, 'f'))
      return fuerza && !seco ? 'git clean -f borra archivos sin versionar y no se recuperan' : null
    }
    case 'branch': {
      const forzado = args.some((a) => cortaCon(a, 'D')) ||
        ((args.includes('--delete') || args.some((a) => cortaCon(a, 'd'))) && (args.includes('--force') || args.some((a) => cortaCon(a, 'f'))))
      return forzado ? 'git branch -D borra la rama aunque tenga commits que no estan en ninguna otra' : null
    }
    case 'checkout': {
      const i = args.indexOf('--')
      const paths = i >= 0 ? args.slice(i + 1) : args.filter((a) => !a.startsWith('-'))
      if (paths.some((p) => PATH_TODO.has(p))) return 'git checkout . descarta todos los cambios sin commitear'
      return args.includes('--force') || args.some((a) => cortaCon(a, 'f')) ? 'git checkout -f descarta los cambios locales al cambiar de rama' : null
    }
    case 'restore': {
      const soloStaged = (args.includes('--staged') || args.some((a) => cortaCon(a, 'S'))) &&
        !(args.includes('--worktree') || args.some((a) => cortaCon(a, 'W')))
      if (soloStaged) return null
      return args.filter((a) => !a.startsWith('-')).some((p) => PATH_TODO.has(p)) ? 'git restore . descarta todos los cambios sin commitear' : null
    }
    case 'push': {
      const opciones = ['--force', '--force-with-lease', '--force-if-includes', '--mirror', '--delete', '--prune']
      if (args.some((a) => opciones.some((o) => a === o || a.startsWith(o + '=')))) return 'git push que fuerza o borra en el remoto reescribe lo que ven los demas'
      if (args.some((a) => cortaCon(a, 'f') || cortaCon(a, 'd'))) return 'git push que fuerza o borra en el remoto reescribe lo que ven los demas'
      if (args.some((a) => !a.startsWith('-') && (a.startsWith('+') || a.startsWith(':')))) return 'git push con +rama o :rama fuerza o borra una rama del remoto'
      return null
    }
    case 'stash':
      return args[0] === 'drop' || args[0] === 'clear' ? `git stash ${args[0]} pierde lo guardado en el stash` : null
    case 'worktree':
      return args[0] === 'remove' && (args.includes('--force') || args.some((a) => cortaCon(a, 'f'))) ? 'git worktree remove --force borra la carpeta aunque tenga cambios sin commitear' : null
    case 'filter-branch':
    case 'filter-repo':
      return `git ${sub} reescribe la historia de todas las ramas`
    default:
      return null
  }
}

// Opciones globales de git que se comen la palabra siguiente (`git -C ruta status`).
const CON_VALOR = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path'])

function revisar(comando) {
  if (typeof comando !== 'string' || !comando.trim()) return { pedir: false }
  for (const palabras of tramos(sinHeredocs(comando))) {
    let i = 0
    while (i < palabras.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(palabras[i])) i++
    const cmd = palabras[i] || ''
    if (!/(^|[\\/])git(\.exe)?$/i.test(cmd)) continue
    i++
    while (i < palabras.length && palabras[i].startsWith('-')) {
      i += CON_VALOR.has(palabras[i]) ? 2 : 1
    }
    const sub = palabras[i]
    if (!sub) continue
    const motivo = reglaDe(sub, palabras.slice(i + 1))
    if (motivo) return { pedir: true, motivo: `${motivo}. ${MOTIVO_FINAL}` }
  }
  return { pedir: false }
}

module.exports = { revisar }
