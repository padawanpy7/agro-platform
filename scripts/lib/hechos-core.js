// hechos-core.js - las reglas de `memory/hechos/`, puras: reciben texto, no leen disco.
//
// POR QUE EXISTE (research del 31/08, docs/research-2026-08-31-loop-y-codigo.md 1.1): nuestros
// hechos no distinguian lo VIGENTE de lo HISTORICO, y los tres agujeros que eso deja nos mordieron
// el mismo dia:
//
//   1. Un hecho archivado se lee igual que uno vigente, asi que se cita como autoridad de lo que
//      pasa hoy. El gate de cierre dio "al dia" sobre un Pendiente de anteayer que ya se habia
//      hecho, por no tener con que distinguirlos.
//   2. Mover un archivo dejo 8 punteros rotos -uno dentro de un script que corre-, porque nada
//      cruza lo que un hecho CITA contra lo que existe.
//   3. Un hecho puede quedar fuera del indice y volverse invisible: se lee MEMORY.md, no la carpeta.
//
// La regla que se adopta de deepseek-harness: **lo archivado no es autoridad de lo actual**, y
// cambiar una decision no es editar el hecho viejo -se escribe uno nuevo que lo supersede, y quedan
// cruzados-. Editar el viejo borra por que se habia decidido lo anterior.

// `estado` es OPCIONAL: 262 hechos ya existian sin el y todos valen como vigentes. Se declara solo
// cuando deja de serlo, que es cuando importa.
const ESTADOS = ['vigente', 'superado', 'archivado']

function parsear(nombreArchivo, texto) {
  const m = String(texto || '').match(/^---\r?\n([\s\S]*?)\r?\n---/)
  const slug = String(nombreArchivo || '').replace(/\.md$/i, '')
  if (!m) return { archivo: nombreArchivo, slug, frontmatter: false }
  const frente = m[1]
  const campo = (k) => {
    const r = frente.match(new RegExp('^\\s*' + k + ':\\s*"?(.*?)"?\\s*$', 'm'))
    return r ? r[1].trim() : null
  }
  return {
    archivo: nombreArchivo,
    slug,
    frontmatter: true,
    name: campo('name'),
    description: campo('description'),
    type: campo('type'),
    estado: campo('estado') || 'vigente',
    superadoPor: campo('superado_por'),
    cuerpo: String(texto).slice(m[0].length),
  }
}

// Las rutas DE ESTE REPO que el hecho cita. Solo las comprobables: entre backticks, con carpeta y
// con una extension conocida. Se dejan afuera, a proposito:
//
//   - los [[enlaces]] entre hechos: un [[nombre]] que todavia no existe es valido, marca algo que
//     vale la pena escribir;
//   - las URLs;
//   - un nombre suelto sin carpeta (`README.md`), que no se resuelve sin adivinar contra que raiz;
//   - las rutas ABSOLUTAS (/archivos_aplicacion/... en el server de la base) y las que SALEN del
//     repo (../database-scripts/...): existen, pero no aca, y exigirlas seria pedirle al hecho que
//     mienta sobre donde vive lo que describe;
//   - los moldes con `...` (src/.../OBJETO.sql), que no son una ruta sino un patron.
function rutasCitadas(texto) {
  const out = new Set()
  const re = /`([A-Za-z0-9_./-]+\.(?:js|md|sql|json|yml|yaml|sh|cmd|txt))`/g
  let m
  while ((m = re.exec(String(texto || '')))) {
    const r = m[1]
    if (!r.includes('/')) continue
    if (r.startsWith('/') || r.startsWith('..')) continue
    if (r.includes('...')) continue
    out.add(r)
  }
  return [...out]
}


// Un hecho puede NOMBRAR un comando muerto sin mandarte a correrlo: "no uses `scripts/_python.sh`",
// "importaban `tests/e2e/lib/apex`, ya inexistente". Esos son justamente los hechos que existen
// PARA avisar que eso murio, y reescribirlos los destruye -pasa a decir que uses lo que vino
// despues, y se pierde el aviso-.
//
// Se mira la LINEA, no el archivo: un hecho puede avisar de uno viejo en una linea y mandar a
// correr el actual en la de abajo. Los falsos negativos aca son baratos: una linea que dice "no
// uses X" no lastima a nadie aunque el gate la deje pasar.
// Las marcas son ESPECIFICAS a proposito. Poner "era", "habia" o "antes de" -que aparecen en
// cualquier prosa- apagaria el gate entero sin que se note, que es peor que no tenerlo: la primera
// version de esta lista dejo pasar los 35 hallazgos de golpe.
const HISTORICO = /\b(no uses?|ya no|ya inexistente|inexistente|no existe|no existen|dejo de existir|se fueron|murio|murieron|se saco|se sacaron)\b/i

function esMencionHistorica(linea) {
  return HISTORICO.test(String(linea || ''))
}

// Un problema por regla rota. `existe(ruta)` lo inyecta el llamador: aca no se toca el disco.
function validar(hechos, { existe = () => true, indice = [] } = {}) {
  const problemas = []
  const enIndice = new Set(indice)
  const slugs = new Set(hechos.map((h) => h.slug))

  for (const h of hechos) {
    if (!h.frontmatter) { problemas.push({ archivo: h.archivo, regla: 'sin-frontmatter', detalle: 'no tiene bloque --- al principio' }); continue }
    if (!h.name) problemas.push({ archivo: h.archivo, regla: 'sin-name', detalle: 'falta `name` en el frontmatter' })
    else if (h.name !== h.slug) problemas.push({ archivo: h.archivo, regla: 'name-no-coincide', detalle: `name es "${h.name}" y el archivo es "${h.slug}"` })

    // El description es lo que decide si el hecho es relevante SIN abrirlo: uno vacio vuelve el
    // hecho irrecuperable aunque este escrito.
    if (!h.description) problemas.push({ archivo: h.archivo, regla: 'sin-description', detalle: 'falta `description`: es lo que decide si el hecho es relevante sin abrirlo' })

    if (!ESTADOS.includes(h.estado)) {
      problemas.push({ archivo: h.archivo, regla: 'estado-invalido', detalle: `"${h.estado}" no es uno de: ${ESTADOS.join(', ')}` })
    }
    // Un hecho superado SIN sucesor es peor que uno vigente equivocado: dice "esto ya no vale" y no
    // dice que vale ahora.
    if (h.estado === 'superado') {
      if (!h.superadoPor) problemas.push({ archivo: h.archivo, regla: 'superado-sin-sucesor', detalle: 'declara `estado: superado` y no dice `superado_por: <slug>`' })
      else if (!slugs.has(h.superadoPor)) problemas.push({ archivo: h.archivo, regla: 'sucesor-no-existe', detalle: `superado_por apunta a "${h.superadoPor}", que no existe` })
    }

    // Lo archivado NO va en el indice: el indice es lo que se lee en toda tarea, y lo archivado no
    // es autoridad de lo que pasa hoy.
    if (h.estado === 'archivado' && enIndice.has(h.slug)) {
      problemas.push({ archivo: h.archivo, regla: 'archivado-en-el-indice', detalle: 'esta archivado y sigue en MEMORY.md: lo archivado no es autoridad de lo actual' })
    }
    if (h.estado !== 'archivado' && indice.length && !enIndice.has(h.slug)) {
      problemas.push({ archivo: h.archivo, regla: 'fuera-del-indice', detalle: 'no tiene linea en MEMORY.md: se lee el indice, no la carpeta' })
    }

    for (const r of rutasCitadas(h.cuerpo || '')) {
      if (!existe(r)) problemas.push({ archivo: h.archivo, regla: 'ruta-citada-no-existe', detalle: `cita \`${r}\`, que no existe` })
    }
  }
  return problemas
}

// Las reglas que ROMPEN el gate: las que significan que la memoria MIENTE -cita un archivo que no
// existe, se contradice, o dice "esto ya no vale" sin decir que vale ahora-.
//
// `fuera-del-indice` queda AFUERA a proposito: al encender el gate el 31/08 habia 111 hechos sin
// linea en ningun indice. Eso es un backlog para drenar, no un bug que se arregle en el commit que
// enciende la regla; y una regla que nace roja en 111 archivos se aprende a ignorar, que es
// justamente lo que ya sabemos del lint sin baseline. Se reporta como aviso con su conteo.
const BLOQUEANTES = new Set([
  'sin-frontmatter', 'sin-name', 'name-no-coincide', 'sin-description',
  'estado-invalido', 'superado-sin-sucesor', 'sucesor-no-existe',
  'archivado-en-el-indice', 'ruta-citada-no-existe', 'comando-muerto',
])

module.exports = { ESTADOS, BLOQUEANTES, parsear, rutasCitadas, validar, esMencionHistorica }
