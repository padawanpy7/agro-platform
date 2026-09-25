// Guard de SOLO LECTURA para el runner de SSH (scripts/infra/ssh-ro.js).
//
// Mismo espiritu que el guard de db-sql.js ("sin --write solo select/with"), pero un shell es
// mucho mas ancho que SQL: no alcanza con prohibir `rm`. Un `>` redirige, un `sed -i` edita en
// sitio, un `awk`/`perl`/`python` escribe archivos desde adentro, un `$(...)` mete un comando
// arbitrario. Por eso el criterio es **lista blanca**: se permite un conjunto chico de binarios
// de lectura y se rechaza cualquier cosa que pueda escribir, aunque parezca inofensiva.
//
// Lo que este guard NO puede hacer: garantizar que el servidor sea de solo lectura. Si alguien
// tiene la credencial puede abrir su propia sesion. Esto protege de un comando destructivo
// escrito por error o por un agente, que es el riesgo real de automatizar el acceso.

// Binarios permitidos: leen y escriben en stdout, nunca en disco.
const PERMITIDOS = new Set([
  'ls', 'cat', 'head', 'tail', 'stat', 'file', 'find', 'wc', 'du', 'df',
  'grep', 'egrep', 'fgrep', 'zgrep', 'od', 'xxd', 'hexdump', 'strings',
  'sort', 'uniq', 'cut', 'tr', 'comm', 'diff', 'cmp', 'basename', 'dirname',
  'realpath', 'readlink', 'md5sum', 'sha1sum', 'sha256sum', 'cksum',
  'pwd', 'id', 'whoami', 'hostname', 'uname', 'date', 'echo', 'printf', 'tree', 'lsattr',
])

// Binarios que escriben, o que pueden escribir desde su propio lenguaje. Se nombran explicito
// para que el mensaje de error diga cual fue, en vez de un "no esta en la lista" generico.
const PROHIBIDOS = new Set([
  'rm', 'mv', 'cp', 'mkdir', 'rmdir', 'touch', 'chmod', 'chown', 'chgrp', 'ln', 'tee',
  'dd', 'truncate', 'install', 'shred', 'mkfifo', 'mknod', 'rsync', 'scp', 'sftp',
  'sed', 'awk', 'gawk', 'perl', 'python', 'python3', 'ruby', 'php', 'node', 'bash', 'sh',
  'zsh', 'ksh', 'eval', 'exec', 'source', 'kill', 'killall', 'pkill', 'mount', 'umount',
  'lpr', 'lp', 'crontab', 'at', 'systemctl', 'service', 'vi', 'vim', 'nano', 'ed', 'emacs',
  'tar', 'zip', 'unzip', 'gzip', 'gunzip', 'curl', 'wget', 'nc', 'ncat',
])

// Metacaracteres que permiten escribir o encadenar algo no revisado.
const METACARACTERES = [
  { patron: />>?/, motivo: 'redireccion a archivo (">" o ">>")' },
  { patron: /\$\(/, motivo: 'sustitucion de comando "$(...)"' },
  { patron: /`/, motivo: 'sustitucion de comando con backticks' },
  { patron: /;/, motivo: 'encadenamiento con ";"' },
  { patron: /&&|\|\|/, motivo: 'encadenamiento con "&&" o "||"' },
  { patron: /&\s*$/, motivo: 'ejecucion en segundo plano con "&"' },
  { patron: /<\(/, motivo: 'sustitucion de proceso "<(...)"' },
]

// Parte el comando en tramos por pipe. El pipe se permite porque solo conecta stdout con stdin:
// no toca el disco. Cada tramo se valida por separado.
function tramos(comando) {
  return comando.split('|').map((t) => t.trim()).filter((t) => t.length)
}

function primerBinario(tramo) {
  // Se saltean las asignaciones de variable de entorno tipo `LC_ALL=C grep ...`.
  const partes = tramo.split(/\s+/).filter(Boolean)
  for (const p of partes) {
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(p)) continue
    return p.replace(/^.*\//, '')
  }
  return ''
}

// Devuelve { ok: true } o { ok: false, motivo: '<por que se rechaza>' }.
function revisar(comando) {
  const cmd = String(comando || '').trim()
  if (!cmd) return { ok: false, motivo: 'comando vacio' }

  for (const { patron, motivo } of METACARACTERES) {
    if (patron.test(cmd)) return { ok: false, motivo }
  }

  const lista = tramos(cmd)
  if (!lista.length) return { ok: false, motivo: 'comando vacio' }

  for (const tramo of lista) {
    const bin = primerBinario(tramo)
    if (!bin) return { ok: false, motivo: `no se pudo deducir el binario de "${tramo}"` }
    if (PROHIBIDOS.has(bin)) return { ok: false, motivo: `"${bin}" puede escribir` }
    if (!PERMITIDOS.has(bin)) {
      return { ok: false, motivo: `"${bin}" no esta en la lista blanca de lectura` }
    }
    // `find` ejecuta lo que le pidan: sus acciones de ejecucion y borrado se prohiben aparte.
    if (bin === 'find' && /(^|\s)-(exec|execdir|delete|fprint|fls|fprintf)\b/.test(tramo)) {
      return { ok: false, motivo: 'find con una accion que ejecuta o escribe' }
    }
  }
  return { ok: true }
}

module.exports = { revisar, PERMITIDOS, PROHIBIDOS }
