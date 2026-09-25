// gaps-core.js - convierte los modos de falla del loop en FICHAS CANDIDATAS. Puro: recibe el
// informe de `fallos` y el ledger, devuelve fichas. No escribe nada.
//
// POR QUE EXISTE: el pedido del dueño del 28/08 era "que un cierre encuentre gaps Y LOS CORRIJA sin
// que yo le diga nada". La primera mitad se hizo el 31/08 (`node agro.js fallos`). Esta es la segunda,
// **en su version segura**: lo que se automatiza es ESCRIBIR el hallazgo, no aplicarlo.
//
// Por que no se automatiza el arreglo, y quedo asi a proposito tras leer el paper 2604.25850
// (Observability-Driven Automatic Evolution of Coding-Agent Loopes): ellos validan cada cambio
// automatico contra un conjunto de tareas apartado antes de aplicarlo, y nosotros no tenemos ese
// conjunto. Sin el, "corregir solo" es cambiar el loop a ciegas. Lo que SI se pierde hoy es el
// hallazgo -aparece en una corrida, nadie lo anota y vuelve a aparecer a la semana-, y eso es lo
// que esto arregla.
//
// LA REGLA DURA: nunca toca una ficha que ya existe. Una ficha es el registro de por que se decidio
// algo; pisarla con texto generado seria borrar eso.

// El id sale del modo de falla, no de un contador: asi la MISMA falla propone SIEMPRE la misma
// ficha, y proponerla dos veces no crea dos fichas.
function idDe(prefijo, texto) {
  const limpio = String(texto || '')
    .toUpperCase()
    .replace(/\(EXIT \d+\)/g, '')
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
  return `${prefijo}-${limpio}`
}

// CUANTAS SE PROPONEN DE UNA. Cinco, no todas: la primera corrida sobre un log de tres semanas
// escupio 29, y una lista de 29 fichas no es un hallazgo, es un volcado que se archiva sin leer.
// Es la misma leccion que ya esta escrita para el lint sin baseline y para los hechos fuera del
// indice: una salida que nace enorme se aprende a ignorar. Las que no entran se cuentan, no se
// esconden, y aparecen en la proxima corrida cuando las de arriba se cierren.
const CUANTAS = 5

// .Sigue roto? La fecha del ultimo fallo YA se imprimia en la descripcion, pero no decidia nada:
// un modo que dejo de fallar se proponia igual que uno que sigue reventando hoy.
//
// La evidencia honesta no es la antiguedad -una ventana de N dias es un numero elegido a dedo-,
// es si la MISMA invocacion volvio a correr en VERDE despues del ultimo fallo. Eso esta en el
// mismo log y no hay que estimarlo.
//
// Medido el 09/09/2026: `gaps` proponia fichar `evidencia-e2e ICC-110` por 6 fallos del 11/08, y
// al correrlo para diagnosticar salio exit 0. Fichar eso llena el ledger de cosas que ya no pasan,
// y un ledger con ruido le quita peso a lo que si esta roto.
const sigueRoto = (g) => {
  // Sin datos NO se descarta: no saber no es lo mismo que saber que anda. Ante la duda se propone,
  // que es el lado barato de equivocarse.
  if (!g.ultimoOk || !g.ultima) return true
  return String(g.ultimoOk) <= String(g.ultima)
}

// `informe` es lo que devuelve fallos-core.agrupar(). `existentes` son los ids del ledger.
// Devuelve { fichas, mas } -`mas` es cuantas quedaron afuera por el tope-.
function candidatas(informe = {}, existentes = [], { cuantas = CUANTAS, tools = null } = {}) {
  const ya = new Set(existentes)
  // Una falla de una tool que YA NO EXISTE tampoco es un defecto de hoy: no se puede reproducir ni
  // arreglar, y nunca va a volver a correr en verde -asi que `sigueRoto` la daria por viva para
  // siempre-. Salio el 09/09/2026: proponia fichar dos veces una tool de accion podada el 04/09.
  // Si no se pasa la lista de tools, no se filtra: sin dato no se descarta nada.
  const existeTool = (t) => !tools || !t || tools.has(t)
  const out = []
  const agregar = (f) => { if (!ya.has(f.id) && !out.some((x) => x.id === f.id)) out.push(f) }

  // 1. La telemetria sucia. Va primero porque envenena todo lo demas: si el log miente, los modos
  //    de falla que salen de el tambien.
  if (informe.rotas) {
    agregar({
      id: 'HN-TELEMETRIA-SUCIA',
      categoria: 'critico',
      passes: false,
      descripcion: `metrics/tool-runs.log tiene ${informe.rotas} linea(s) que no se pueden leer: sin fecha, sin tool o sin exit. El log es la unica evidencia de COMO corrio el loop; si esta sucio, cualquier medicion que salga de el arrastra el error, y las lineas rotas se leen como si fueran otra tool.`,
      pasos: [
        'Encontrar QUE las rompe antes de limpiarlas: una linea rota de hoy dice que la causa sigue viva.',
        'Los campos que se escriben en el log se aplanan (sin saltos ni tabuladores).',
        'Control negativo: correr la tool con el argumento que rompia y verificar que la linea sale entera.',
      ],
      origen: 'cierre',
    })
  }

  // 2. Una tool de accion que falla y VUELVE a fallar del mismo modo. No es mala suerte: la tool
  //    pide algo que no se sabe, o no dice lo que necesita.
  for (const g of informe.gaps || []) {
    // Los modos de `--help` NO se fichan uno por uno: tienen su propia ficha, que los nombra a
    // todos. Fichar cada uno seria contar el mismo defecto ocho veces.
    if (/(^|\s)(--help|-h)(\s|$)/.test(g.ejemplo || g.modo || '')) continue
    // Volvio a correr en verde despues del ultimo fallo: es historia, no un defecto de hoy.
    if (!sigueRoto(g)) continue
    if (!existeTool(g.tool)) continue
    agregar({
      id: idDe('HN-FALLA', g.modo),
      categoria: 'tooling',
      passes: false,
      descripcion: `\`${g.modo}\` fallo ${g.veces} veces (ultima: ${g.ultima ? String(g.ultima).slice(0, 10) : 's/f'}). No es un gate -su exit 1 no significa "encontre algo"-, asi que cada corrida en rojo es trabajo que no salio. Una falla que se repite es una tool que pide algo que no se sabe, o que no dice lo que necesita.`,
      pasos: [
        'Reproducir la falla ANTES de tocar nada, y dejar escrito el error exacto.',
        'Decidir si falta una precondicion, si el mensaje no alcanza, o si la tool esta rota.',
        'Control negativo: el caso que fallaba tiene que pasar, y el que ya pasaba tiene que seguir pasando.',
      ],
      origen: 'cierre',
    })
  }

  // 3. La tool que falla la mitad de las veces que se usa. No se ve mirando modos -pueden ser
  //    quince modos distintos-, se ve mirando la proporcion.
  for (const t of informe.casiSiempreFalla || []) {
    if (!existeTool(t.tool)) continue
    agregar({
      id: idDe('HN-INUSABLE', t.tool),
      categoria: 'tooling',
      passes: false,
      descripcion: `\`${t.tool}\` falla ${t.fallos} de las ${t.corridas} veces que se usa (${Math.round(100 * t.fallos / t.corridas)} %). Una tool que falla mas de lo que funciona no es una tool: es un tramite que hay que sortear, y el que la usa aprende a reintentarla en vez de a confiar en ella.`,
      pasos: [
        'Agrupar SUS fallos por argumento: casi siempre son dos o tres casos, no veinte.',
        'Mirar si el problema es la tool, su documentacion o el estado que necesita para correr.',
        'Control negativo: medir la proporcion despues del arreglo, no suponerla.',
      ],
      origen: 'cierre',
    })
  }

  // 4. Pedir ayuda contado como fallo. Es chico y es transversal: ensucia toda medicion de fallos.
  if ((informe.ayudaRota || []).length) {
    const tools = [...new Set(informe.ayudaRota.map((g) => g.tool))]
    agregar({
      id: 'HN-AYUDA-CUENTA-COMO-FALLO',
      categoria: 'gate',
      passes: false,
      descripcion: `Pedir ayuda sale con codigo distinto de 0 en: ${tools.join(', ')}. El que pide ayuda la recibe, pero el shell -y el log- ven un fallo, asi que toda medicion de fallos queda inflada por gente que solo queria leer el uso.`,
      pasos: [
        '`--help` se contesta antes que nada y sale con 0, en el dispatcher y no tool por tool.',
        'Control negativo: un error de verdad tiene que seguir saliendo distinto de 0.',
      ],
      origen: 'cierre',
    })
  }

  // El orden es el que ya trae el informe: los modos vienen ordenados por cuantas veces pasaron, y
  // la telemetria sucia va primero porque envenena a las demas.
  return { fichas: out.slice(0, cuantas), mas: Math.max(0, out.length - cuantas) }
}

function informe({ fichas = [], mas = 0 } = {}) {
  if (!fichas.length) return '  OK  ningun gap nuevo para fichar'
  const l = [`  ${fichas.length} ficha(s) candidata(s), ninguna existe todavia en el ledger:`]
  for (const c of fichas) l.push(`    ${c.id}  [${c.categoria}]`)
  if (mas) l.push(`  ·  y ${mas} mas esperando: salen cuando estas se cierren, para no volcar todo de una`)
  return l.join('\n')
}

module.exports = { idDe, candidatas, informe }
