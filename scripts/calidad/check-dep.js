// Ultima version estable + deprecacion + vulnerabilidades (OSV) de un paquete, ANTES de agregarlo.
// Regla 8 del AGENTS: solo ultima estable, sin deprecados ni vulnerabilidades.
//
// Uso: node agro.js check-dep <npm|pypi|nuget> <paquete>
// Sale 2 si esta deprecado o tiene vulnerabilidades; 1 si no lo encuentra; 0 si esta limpio.
//
// Portado de bash el 10/08. La version anterior spawneaba CINCO procesos por consulta -dos
// `npm view`, dos `curl` y `python3` de por medio para parsear el JSON-. Node 24 trae fetch
// global, asi que esto no spawnea nada: son cuatro requests HTTP y JSON.parse.

const args = process.argv.slice(2)
const [eco, pkg] = args

if (!pkg || eco === '--help' || eco === '-h') {
  console.log('uso: node agro.js check-dep <npm|pypi|nuget> <paquete>')
  process.exit(pkg ? 0 : 1)
}

// Sin tope, un registry que no contesta cuelga el gate para siempre.
const TIMEOUT_MS = Number(process.env.CHECK_DEP_TIMEOUT_MS) || 15000

async function traerJson(url, opciones = {}) {
  try {
    const r = await fetch(url, { ...opciones, signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

// Devuelve { latest, deprecated } o null si el paquete no existe.
async function consultar(eco, pkg) {
  if (eco === 'npm') {
    const j = await traerJson(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`)
    if (!j || !j['dist-tags'] || !j['dist-tags'].latest) return null
    const latest = j['dist-tags'].latest
    // `deprecated` vive en la version, no en el paquete: un paquete puede tener versiones viejas
    // deprecadas y la ultima sana, que es justo lo que interesa saber.
    const deprecated = ((j.versions || {})[latest] || {}).deprecated || ''
    return { latest, deprecated, osv: 'npm' }
  }
  if (eco === 'pypi' || eco === 'pip') {
    const j = await traerJson(`https://pypi.org/pypi/${encodeURIComponent(pkg)}/json`)
    if (!j || !j.info || !j.info.version) return null
    return { latest: j.info.version, deprecated: '', osv: 'PyPI' }
  }
  if (eco === 'nuget') {
    const j = await traerJson(`https://api.nuget.org/v3-flatcontainer/${encodeURIComponent(pkg.toLowerCase())}/index.json`)
    if (!j || !Array.isArray(j.versions)) return null
    // Se descartan las preliberadas (traen "-"): la regla pide ULTIMA ESTABLE.
    const estables = j.versions.filter((v) => !v.includes('-'))
    if (!estables.length) return null
    return { latest: estables[estables.length - 1], deprecated: '', osv: 'NuGet' }
  }
  return undefined // ecosystem invalido
}

// Devuelve la cantidad de vulnerabilidades, o null si OSV no contesto (que NO es lo mismo que cero).
async function vulnerabilidades(nombre, version, ecosystem) {
  const j = await traerJson('https://api.osv.dev/v1/query', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ package: { name: nombre, ecosystem }, version }),
  })
  if (!j) return null
  return (j.vulns || []).length
}

;(async () => {
  const info = await consultar(eco, pkg)
  if (info === undefined) {
    console.log(`ecosystem invalido: '${eco}' (npm|pypi|nuget)`)
    process.exit(1)
  }
  if (!info) {
    console.log(`no encontre '${pkg}' en ${eco}`)
    process.exit(1)
  }

  console.log(`paquete:        ${pkg} (${eco})`)
  console.log(`ultima estable: ${info.latest}`)
  if (info.deprecated) console.log(`DEPRECADO: ${info.deprecated}  <- NO usar`)

  const vulns = await vulnerabilidades(pkg, info.latest, info.osv)
  if (vulns === null) console.log('vulns: no pude consultar OSV')
  else if (vulns === 0) console.log(`vulns (OSV) en ${info.latest}: ninguna`)
  else console.log(`VULNERABILIDADES en ${info.latest}: ${vulns} (OSV) <- revisar antes de usar`)

  // "No pude consultar" no bloquea, igual que antes: no se puede afirmar que haya vulnerabilidades.
  if (info.deprecated) process.exit(2)
  if (vulns !== null && vulns !== 0) process.exit(2)
  process.exit(0)
})()
