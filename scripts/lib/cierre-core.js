// Las reglas del cierre de sesion, puras: reciben datos ya recolectados y deciden si el cierre
// esta completo. Sin git, sin fs, sin prints -por eso se testean con `node --test` al lado.
//
// Por que existe: el ritual de cierre vivia SOLO como prosa en AGENTS.md S4, asi que el dueño
// tenia que dictarlo cada vez ("guardar el progreso, commitear, pushear, mergear, guardar") y
// igual se escapaban pasos: el 12/08/2026 el cierre habia dado por bueno un ticket cuyas preguntas
// abiertas vivian solo en el chat, con el README apuntando a una rama borrada y los comandos de
// prueba de un loop que ya no existe. Lo que no se mide, no se cierra.

const disp = require('./dispatcher')

// Un chequeo es {id, estado: 'ok'|'falta'|'aviso', titulo, detalle[]}.
const ok = (id, titulo, detalle = []) => ({ id, estado: 'ok', titulo, detalle })
const falta = (id, titulo, detalle = []) => ({ id, estado: 'falta', titulo, detalle })
const aviso = (id, titulo, detalle = []) => ({ id, estado: 'aviso', titulo, detalle })

// --- 1. nada sin commitear -------------------------------------------------------------------
// El formato de `git status --porcelain` es "XY ruta": dos columnas de estado y un espacio. Se
// parsea con regex y no cortando 3 caracteres, porque el helper `git()` hace trim() de TODA la
// salida y le come el espacio inicial a la PRIMERA linea: con `slice(3)` esa ruta perdia su
// primera letra ("penspec/changes/...") y el mensaje quedaba inservible para copiar y pegar.
function parsearStatus(salida) {
  return String(salida)
    .split('\n')
    .map((l) => (l.match(/^\s*([MADRCU?!]{1,2})\s+(.+?)\s*$/) || [])[2])
    .filter(Boolean)
}

function chequearLimpio(archivosSucios, donde = 'el worktree') {
  if (!archivosSucios.length) return ok('limpio', `${donde}: sin cambios sueltos`)
  return falta('limpio', `${donde}: ${archivosSucios.length} archivo/s sin commitear`, archivosSucios)
}

// --- 2. nada sin pushear ---------------------------------------------------------------------
// Una rama sin remoto todavia NO es un fallo del cierre: es una rama que nunca se publico. Se
// avisa, porque puede ser a proposito (rama local de prueba) o el olvido que importa.
function chequearPusheado(rama, commitsSinPushear, tieneRemoto) {
  if (!tieneRemoto) {
    return aviso('pusheado', `${rama}: no tiene remoto`, [`si va al repo: git push -u origin ${rama}`])
  }
  if (commitsSinPushear > 0) {
    return falta('pusheado', `${rama}: ${commitsSinPushear} commit/s sin pushear`, [`git push origin ${rama}`])
  }
  return ok('pusheado', `${rama}: al dia con el remoto`)
}

// --- 3. la rama al dia con main --------------------------------------------------------------
// Atrasarse no rompe nada hoy, pero es lo que convierte un merge mecanico en una decision de
// diseño dos semanas despues (misma razon que rama-drift).
function chequearAtraso(rama, commitsDeMainSinTraer) {
  if (rama === 'main') return ok('atraso', 'estas en main: no hay atraso que medir')
  if (commitsDeMainSinTraer > 0) {
    return aviso('atraso', `${rama}: atrasada ${commitsDeMainSinTraer} commit/s respecto de main`,
      ['si vas a seguir trabajando aca: git merge main'])
  }
  return ok('atraso', `${rama}: al dia con main`)
}

// --- 4. lo general no se queda en la rama ----------------------------------------------------
// El loop (scripts/, memory/, db/, AGENTS.md, project.yml, el dispatcher, package.json) sirve a
// TODAS las ramas: si lo tocaste y no lo promoviste, el proximo ticket arranca sin esa mejora.
//
// El dispatcher entra por su nombre DERIVADO y no escrito: aca se llama `agro.js` y en el repo de
// infra `infra.js`. Escribirlo ataba este core a un proyecto, y al promoverlo el 01/09 el test de
// alla fallo por eso.
const ES_LOOP = new RegExp(
  '^(scripts/|memory/|db/|skills/|apex/static/|AGENTS\\.md|CLAUDE\\.md|project\\.yml|entornos\\.yml|' +
  'package\\.json|' + disp.nombre().replace('.', '\\.') + ')')

function archivosDeLoop(archivos) {
  return archivos.filter((a) => ES_LOOP.test(a))
}

// Donde buscar la entrada del dia. Son DOS changes, no uno: `diasConCommits` cuenta un dia si sus
// commits tocaron la carpeta del ticket **o archivos del loop**, y la entrada de un dia de loop vive
// en la bitacora del change del loop (`jira/META`), no en la del ticket. Mirando solo la del ticket,
// todo dia de loop salia "sin entrada": el 18/09/2026 el cierre de ICC-13 marcaba 13, 14, 16 y 17/09
// en rojo con las cuatro entradas ya escritas en `jira/META` (lo encontro la sesion de ICC-13).
function carpetasDeBitacora(carpetaTicket, carpetaLoop) {
  const norm = (p) => String(p || '').replace(/\\/g, '/').replace(/\/+$/, '')
  return [...new Set([norm(carpetaTicket), norm(carpetaLoop)].filter(Boolean))]
}

// Lo que falta promover es la INTERSECCION de TRES medidas. Ninguna sola alcanza: cada una dio su
// falso positivo al probarla contra el repo real.
//   tocadosPorLaRama  = `diff main...RAMA` -> lo que YO cambie desde que me separe. Solo, lista
//                        tambien lo que ya promovi copiandolo a main en otro commit.
//   difierenHoy       = `diff main RAMA`   -> lo que las dos puntas tienen distinto. Solo, lista
//                        todo lo que main avanzo por su cuenta (aca eran 202 commits).
//   aportaAlgo(a)     -> si el diff contra main tiene alguna linea que main NO tenga, mirando el
//                        diff como CONJUNTO y no por posicion. Sin esto, un archivo que promovi y
//                        que main despues siguio creciendo -cspell.json, que otra sesion amplio y
//                        reordeno- se reportaba como "sin promover" para siempre: la palabra
//                        estaba en main, cinco lineas mas abajo.

// Lee un `git diff` y contesta: ¿mi lado tiene alguna linea que el otro no tenga en NINGUNA parte?
// Si cada linea agregada aparece tambien como quitada, el archivo solo se reordeno.
function aportaContenido(diffTexto) {
  const agregadas = []
  const quitadas = new Set()
  for (const l of String(diffTexto).split('\n')) {
    if (l.startsWith('+++') || l.startsWith('---')) continue
    if (l.startsWith('+')) agregadas.push(l.slice(1).trim())
    else if (l.startsWith('-')) quitadas.add(l.slice(1).trim())
  }
  return agregadas.some((l) => l && !quitadas.has(l))
}

// `estadoDeMain` es { limpio, pendientes } leido del checkout de main -o null si no se pudo mirar-.
// Sin eso, el aviso mandaba promover sin saber que hay del otro lado: el 27/08, cerrando ICC-83,
// main tenia 93 lineas STAGED SIN COMMITEAR de otra sesion, y dos de los cuatro archivos a promover
// eran justo esos. La forma obvia de obedecer -`git checkout <RAMA> -- <archivos>` parado en main-
// pisa indice Y working tree, y sin commit git no lo recupera. El gate daba una instruccion que,
// seguida al pie de la letra, destruia trabajo ajeno.
function chequearPromocion(rama, tocadosPorLaRama, difierenHoy, aportaAlgo = () => true, estadoDeMain = null) {
  if (rama === 'main') return ok('promocion', 'estas en main: no hay nada que promover')
  const distintos = new Set(difierenHoy)
  const propios = archivosDeLoop(tocadosPorLaRama)
    .filter((a) => distintos.has(a))
    .filter((a) => aportaAlgo(a))
  if (!propios.length) return ok('promocion', 'el loop que tocaste ya esta en main')

  const detalle = [...propios]

  // No saber como esta main NO es "main esta limpio": se dice, y el consejo se da con esa reserva.
  if (!estadoDeMain) {
    detalle.push('OJO: no pude mirar el checkout de main, asi que no se si tiene trabajo sin commitear.')
    detalle.push('Miralo antes de promover: git -C <worktree-de-main> status --porcelain')
  } else if (!estadoDeMain.limpio) {
    const pendientes = estadoDeMain.pendientes || []
    const chocan = propios.filter((a) => pendientes.includes(a))
    detalle.push(`OJO: main tiene ${pendientes.length} archivo/s sin commitear de otra sesion.`)
    if (chocan.length) {
      detalle.push(`Y ${chocan.length} de ellos son de los que hay que promover: ${chocan.join(', ')}`)
      detalle.push('NO uses `git checkout <RAMA> -- <archivo>` en main: pisa indice y working tree,')
      detalle.push('y lo que no esta commiteado no se recupera. Primero que esa sesion commitee lo suyo.')
    } else {
      detalle.push('Ninguno choca con lo que vas a promover, pero commitealo antes para no mezclar.')
    }
  }

  detalle.push('promovelos a main hoy: una mejora guardada dos semanas se mergea a mano')
  return falta('promocion', `${propios.length} archivo/s de loop que main todavia no tiene`, detalle)
}

// --- 5. el PROGRESO del ticket cuenta ESTA sesion ---------------------------------------------
// Un PROGRESO que no menciona el dia en que se trabajo es un puente que miente: el proximo agente
// lee la entrada anterior y cree que eso es el estado.
// Cuenta las lineas con contenido que hay BAJO la entrada mas nueva del PROGRESO.
//
// Por que: chequearProgreso validaba la FECHA de la entrada, no que la entrada dijera algo. Una
// linea "## AAAA-MM-DD" con el cuerpo vacio pasaba como "al dia", que es exactamente la forma de
// callar al gate sin escribir la bitacora. El objetivo NO es dictar cuanto hay que escribir: es
// cazar la entrada puesta para que el gate se calle.
const ENCABEZADO_FECHA = /^##\s+\d{4}-\d{2}-\d{2}/

function lineasDeLaUltimaEntrada(contenido) {
  const lineas = String(contenido || '').split('\n')
  const i = lineas.findIndex((l) => ENCABEZADO_FECHA.test(l))
  if (i < 0) return 0
  let n = 0
  for (let j = i + 1; j < lineas.length; j++) {
    if (ENCABEZADO_FECHA.test(lineas[j])) break
    const l = lineas[j].trim()
    // Un encabezado suelto no es contenido: "### Hecho" sin nada abajo sigue siendo una entrada
    // vacia. Tampoco cuentan la marca de kove ni un separador.
    if (!l || /^#{1,6}\s/.test(l) || /^<!--/.test(l) || /^-{3,}$/.test(l)) continue
    n++
  }
  return n
}

function chequearProgreso(rutaProgreso, fechasEnElProgreso, hoy, contenido) {
  if (!rutaProgreso) {
    return falta('progreso', 'no se encontro el PROGRESO del ticket',
      ['crealo en jira/<TICKET>/PROGRESO.md'])
  }
  if (!fechasEnElProgreso.length) {
    return falta('progreso', `${rutaProgreso}: sin ninguna entrada con fecha`,
      ['formato: "## AAAA-MM-DD - <que>"'])
  }
  const masReciente = fechasEnElProgreso.slice().sort().pop()
  if (masReciente < hoy) {
    return falta('progreso', `${rutaProgreso}: su ultima entrada es del ${masReciente}, no de hoy (${hoy})`,
      ['anota que paso hoy: que se hizo, que se verifico, que queda'])
  }
  // Entrada mas reciente arriba: lo dice el encabezado del propio archivo.
  const ordenadas = fechasEnElProgreso.slice().sort().reverse()
  if (fechasEnElProgreso.join('|') !== ordenadas.join('|')) {
    return aviso('progreso', `${rutaProgreso}: las entradas no estan de mas nueva a mas vieja`,
      [`orden actual: ${fechasEnElProgreso.join(' -> ')}`])
  }
  // Una entrada con fecha de hoy pero sin cuerpo es la forma de callar al gate sin escribir.
  // Se pide un minimo bajo, no una cuota: tres lineas es "que se hizo, que se verifico, que queda".
  const cuerpo = contenido === undefined ? null : lineasDeLaUltimaEntrada(contenido)
  if (cuerpo !== null && cuerpo < 3) {
    return falta('progreso', `${rutaProgreso}: la entrada de hoy tiene ${cuerpo} linea/s de contenido`,
      ['una fecha sola no es una bitacora: que se hizo, que se verifico, que queda'])
  }
  return ok('progreso', `${rutaProgreso}: al dia (${masReciente})`)
}

// --- 6. los docs del ticket no invocan un loop que ya no existe ----------------------------
// Los tickets viejos guardan comandos en su prosa; el loop se refactoriza y esos comandos
// quedan apuntando a rutas muertas. Copiar y pegar lo documentado falla, y parece culpa de quien
// lo corre. Ver [[refactor-del-loop-rompe-tickets-viejos]].
const OBSOLETOS = [
  { patron: /bash\s+scripts\/[\w-]+\.sh/g, porque: 'los wrappers .sh no existen desde el 10/08: es `node agro.js <tool>`' },
  { patron: /\btests\/e2e\//g, porque: 'los specs viven en jira/<TICKET>/tests/' },
  { patron: /scripts\/[\w-]+\.sh\b/g, porque: 'los wrappers .sh no existen desde el 10/08: es `node agro.js <tool>`' },
]

// Los tres patrones de arriba son HISTORICOS: cazan la migracion .sh -> node agro.js del 10/08 y
// nada mas. Una tool que se saca hoy no los dispara: probado el 26/08, `node agro.js db-deps` -sacada
// el 24/08- pasaba limpio mientras "bash scripts/db-check.sh" se cazaba.
//
// Por eso ahora tambien se validan las invocaciones `node agro.js <tool>` contra la lista REAL, que
// sale del disco (tools-registro). Un doc que manda correr algo que no existe es una instruccion
// rota, sin importar cuando dejo de existir.
//
// `toolsConocidas` es un Set o un array; si no se pasa, ese chequeo no corre (y se dice, no se
// asume verde).
// El nombre del dispatcher NO se clava. Estaba escrito `bf\.js` -el de este repo- y al llevar el
// loop a otro, donde se llama `infra.js`, el chequeo no matcheaba NUNCA: daba verde sin mirar
// una sola invocacion. Un gate que busca el nombre del otro proyecto es un gate apagado, y encima
// silencioso. Ahora matchea cualquier dispatcher de la raiz -`node <algo>.js <tool>`-, y no una
// ruta (`node scripts/lib/x.test.js` no entra: tiene barras).
const INVOCACION = /\bnode\s+[\w-]+\.js\s+([a-z0-9][\w-]*)/g

// Palabras que siguen a `node agro.js` en PROSA, no como nombre de tool. Sin esto, un comentario como
// "// Uso: bash node agro.js no aplica aca" se reportaba como si "no" fuera una tool que falta.
// Salio al probar el chequeo nuevo contra el repo real: un gate tambien hay que ejercitarlo contra
// los archivos de verdad, no solo contra sus tests.
const NO_ES_TOOL = new Set(['no', 'se', 'es', 'y', 'o', 'la', 'el', 'lo', 'un', 'una', 'del', 'de',
  'que', 'con', 'sin', 'para', 'por', 'desde', 'hasta', 'segun', 'aca', 'ahi', 'ya', 'solo', 'nada'])

// `existe(ruta)` lo inyecta el llamador para no tocar disco aca. Sirve para el caso que aparecio el
// 01/09: NO todos los `.sh` murieron el 10/08. `scripts/db-secuencias.sh` sigue vivo -y hay un hecho
// que justamente explica por que no se promueve-, asi que marcarlo como muerto es un falso positivo
// que empuja a "arreglar" un documento que estaba bien. Un script que existe en el disco no es un
// comando muerto, por mas que su forma sea la vieja.
function buscarComandosObsoletos(texto, toolsConocidas = null, existe = null) {
  const hallazgos = []
  for (const { patron, porque } of OBSOLETOS) {
    const encontrados = texto.match(new RegExp(patron.source, patron.flags)) || []
    for (const e of new Set(encontrados)) {
      if (existe) {
        const ruta = (e.match(/scripts\/[\w-]+\.sh/) || [])[0]
        if (ruta && existe(ruta)) continue
      }
      hallazgos.push({ fragmento: e, porque })
    }
  }

  if (toolsConocidas) {
    const conocidas = toolsConocidas instanceof Set ? toolsConocidas : new Set(toolsConocidas)
    const vistas = new Set()
    for (const m of String(texto).matchAll(INVOCACION)) {
      const tool = m[1]
      if (vistas.has(tool) || conocidas.has(tool) || NO_ES_TOOL.has(tool)) continue
      vistas.add(tool)
      hallazgos.push({ fragmento: m[0], porque: `no existe la tool "${tool}": mira \`node agro.js\` para la lista real` })
    }
  }

  return hallazgos
}

// El PROGRESO es una BITACORA: sus entradas viejas citan el loop que existia ese dia, y
// reescribir la historia para que compile es peor que dejarla. Solo avisa. Lo que frena el cierre
// son los docs que le dicen a alguien COMO correr algo hoy (README, docs/, la cabecera de un spec).
//
// El archivo POR MES (`progreso/AAAA-MM.md`) es la misma bitacora, solo que ya archivada: cuenta
// que en julio se corria `scripts/task-start.sh`, y eso era cierto en julio. Se sumo el 18/08, al
// mover el puente del loop a `jira/META/`: el gate empezo a exigirle a la
// historia que hablara del presente y frenaba el cierre por dos archivos de julio.
const esBitacora = (archivo) =>
  /PROGRESO\.md$/i.test(archivo) || /(^|[\\/])progreso[\\/][\d-]+\.md$/i.test(archivo)

function chequearDocs(hallazgosPorArchivo) {
  const conProblemas = Object.entries(hallazgosPorArchivo).filter(([, h]) => h.length)
  if (!conProblemas.length) return ok('docs', 'los docs del ticket no citan comandos muertos')

  const linea = ([archivo, hallazgos]) =>
    hallazgos.map((h) => `${archivo}: "${h.fragmento}" -> ${h.porque}`)

  const instrucciones = conProblemas.filter(([a]) => !esBitacora(a))
  if (!instrucciones.length) {
    return aviso('docs', `solo la bitacora cita comandos viejos (es historia, no instrucciones)`,
      conProblemas.flatMap(linea))
  }
  return falta('docs', `${instrucciones.length} archivo/s le dicen a alguien como correr algo que ya no existe`,
    instrucciones.flatMap(linea))
}

// --- 7. lo que decide otro queda por escrito --------------------------------------------------
// Una pregunta abierta que vive en el chat se pierde al cerrarlo. Va a PREGUNTAS.md del ticket.
//
// Este chequeo se reescribio el 26/08 porque AFIRMABA sin medir, que es peor que no medir. Fallaba
// en las dos direcciones:
//   - sin `--preguntas` devolvia ok con el titulo "la sesion no dejo preguntas abiertas" SIN abrir
//     el archivo. Sobre ICC-127, que tenia 15 abiertas -una bloqueante-, dijo eso.
//   - con `--preguntas` solo comprobaba que el archivo EXISTIERA, asi que un PREGUNTAS.md de cero
//     preguntas tambien daba ok.
// O sea que el flag -autodeclarado por el agente- decidia el veredicto y el archivo no se leia
// nunca. Ahora se CUENTAN las abiertas del archivo y el flag no participa.

// La estructura de PREGUNTAS.md es fija: "## Abiertas" hasta "## Respondidas", con items
// numerados, y adentro los subgrupos "**Bloquean**" / "**No bloquean**".
function contarPreguntasAbiertas(contenido) {
  const texto = String(contenido || '')
  const desde = texto.search(/^##\s+Abiertas\s*$/m)
  if (desde < 0) return { abiertas: 0, bloquean: 0, sinSeccion: true }

  const resto = texto.slice(desde)
  const hasta = resto.search(/^##\s+Respondidas\s*$/m)
  const bloque = hasta < 0 ? resto : resto.slice(0, hasta)

  let bloqueando = false
  let abiertas = 0
  let bloquean = 0
  // Un encabezado en negrita que NO se reconoce se guarda en vez de ignorarse: es la unica pista
  // de que el conteo puede estar subcontando, y subcontar aca significa que una pregunta que FRENA
  // no se reporta. Medido: `**Bloquean el diseño**` daba 0 bloqueantes habiendo dos, porque el
  // patron exigia `**Bloquean**` exacto. La unica forma de enterarse de una pregunta que frena es
  // este contador; un contador que se rompe por una palabra de mas no sirve.
  const encabezadosRaros = []
  // La columna "Bloquea" de una tabla, si la hay: es lo que decide el conteo de bloqueantes en
  // ese formato, igual que los subtitulos **Bloquean** lo deciden en el de lista.
  let colBloquea = -1
  for (const cruda of bloque.split('\n')) {
    const linea = cruda.trim()
    if (/^\*\*No bloquean\b/i.test(linea)) { bloqueando = false; continue }
    if (/^\*\*Bloquean\b/i.test(linea)) { bloqueando = true; continue }

    // --- formato TABLA -------------------------------------------------------------------------
    // Se agrega el 08/09/2026: ICC-180 escribia sus 9 preguntas abiertas en una tabla markdown y
    // este contador -que solo miraba `1. texto`- devolvia CERO, o sea el gate afirmaba "no tiene
    // preguntas abiertas" con nueve sin contestar. Un gate que miente es peor que no tenerlo.
    if (linea.startsWith('|')) {
      const celdas = linea.replace(/^\||\|$/g, '').split('|').map((x) => x.trim())
      if (celdas.every((x) => /^:?-{2,}:?$/.test(x))) continue      // la fila separadora
      const iBloquea = celdas.findIndex((x) => /^\**\s*bloquea\b/i.test(x))
      if (iBloquea >= 0) { colBloquea = iBloquea; continue }        // la cabecera
      if (!/^\d+$/.test(celdas[0])) continue                        // no es una fila numerada
      abiertas++
      // Sin columna "Bloquea" manda el subtitulo, igual que en el formato de lista.
      const celda = colBloquea >= 0 ? (celdas[colBloquea] || '') : ''
      const bloqueaLaFila = colBloquea >= 0 ? /^\**\s*(si|sí)\b/i.test(celda) : bloqueando
      if (bloqueaLaFila) bloquean++
      continue
    }

    // Solo se marca la NEGRITA QUE HABLA DE BLOQUEO y no matcheo: "**Bloqueantes**",
    // "**Las que bloquean**". Cualquier otra negrita adentro de "## Abiertas" es prosa -medido
    // contra el repo real: "**Sin respuesta todavia.**", "**Las tres cosas que hay que saber:**"-
    // y marcarla seria ruido que le quita peso al aviso que importa.
    if (/^\*\*.+\*\*\s*$/.test(linea)) {
      if (/bloquea/i.test(linea)) encabezadosRaros.push(linea)
      continue
    }
    if (/^\d+\.\s+\S/.test(cruda)) { abiertas++; if (bloqueando) bloquean++ }
  }
  return { abiertas, bloquean, sinSeccion: false, encabezadosRaros }
}

// `contenido` es null cuando el archivo no existe. NO se devuelve ok en ese caso: se devuelve
// aviso, porque "no hay archivo" no prueba que no haya preguntas -prueba que no se sabe-.
function chequearPreguntas(contenido) {
  if (contenido === null || contenido === undefined) {
    return aviso('preguntas', 'el ticket no tiene PREGUNTAS.md: no se puede medir si quedaron abiertas',
      ['si la sesion dejo alguna, crealo en jira/<TICKET>/PREGUNTAS.md',
        'si de verdad no quedo ninguna, el archivo igual sirve para dejarlo dicho'])
  }

  const { abiertas, bloquean, sinSeccion, encabezadosRaros = [] } = contarPreguntasAbiertas(contenido)
  if (sinSeccion) {
    return aviso('preguntas', 'PREGUNTAS.md no tiene seccion "## Abiertas": no se puede contar',
      ['el formato es "## Abiertas" ... "## Respondidas", con items numerados'])
  }
  if (abiertas === 0) return ok('preguntas', 'PREGUNTAS.md no tiene preguntas abiertas')

  const detalle = [`${abiertas} abierta/s${bloquean ? `, ${bloquean} de ellas BLOQUEAN` : ''}`,
    'contestalas o dejalas dichas en el reporte de cierre: el dueño no las ve si viven en el chat']
  // Un subtitulo que el contador no entiende se DICE, aunque el conteo haya salido bien: es la
  // pista de que abajo de el puede haber preguntas mal clasificadas.
  for (const e of encabezadosRaros) {
    detalle.push(`ojo: "${e}" no se entiende como grupo; los que se leen son "**Bloquean...**" y "**No bloquean...**"`)
  }
  return bloquean > 0
    ? falta('preguntas', `PREGUNTAS.md tiene ${bloquean} pregunta/s que BLOQUEAN`, detalle)
    : aviso('preguntas', `PREGUNTAS.md tiene ${abiertas} pregunta/s abierta/s`, detalle)
}

// --- 8. cada dia trabajado tiene su entrada en la bitacora ------------------------------------
// El chequeo 5 pregunta "la ultima entrada es de hoy?" y con eso DOS dias sin escribir pasan como
// una sola falta: al anotar la de hoy el gate se calla, y el dia anterior queda sin registrar para
// siempre. Medido el 28/08/2026: dos dias, 17 commits de loop, cero entradas, una sola falta.
//
// La medida no necesita criterio: por cada dia con commits del ticket, una entrada con esa fecha.
//
// La VENTANA es fija (7 dias) y NO se ancla a la entrada mas nueva a proposito. Anclarla reproduce
// el bug: escribir la de hoy moveria el borde y taparia el dia de ayer.
function chequearDiasSinEntrada(diasConCommits, fechasEnLaBitacora, ventanaDias = 7) {
  const escritas = new Set(fechasEnLaBitacora)
  const sinEntrada = diasConCommits.filter((d) => !escritas.has(d.fecha))
  if (!sinEntrada.length) {
    return ok('dias', `los ${diasConCommits.length} dia/s con commits de los ultimos ${ventanaDias} tienen su entrada`)
  }
  const detalle = sinEntrada.map((d) =>
    `${d.fecha}: ${d.commits} commit/s sin entrada en la bitacora${d.muestra ? ` (ej. "${d.muestra}")` : ''}`)
  return falta('dias', `${sinEntrada.length} dia/s con trabajo y sin entrada en la bitacora`, [
    ...detalle,
    'escribi la entrada de ese dia: la bitacora es el puente, y un dia que falta no vuelve',
  ])
}

// --- 9. un "Pendiente / proximo" que ya se hizo -----------------------------------------------
// Es lo PRIMERO que lee una sesion nueva para saber por donde seguir, y envejece solo. Medido el
// 28/08: la entrada del 26/08 decia "las dos fichas del gate de cierre van fusionadas" y eso se
// hizo el 27; quedo mintiendo dos dias.
//
// Se mide sin criterio cuando el pendiente NOMBRA fichas (HN-*): se cruzan contra el ledger. Si ya
// no existen -absorbidas por una fusion- o estan en passes:true, ese pendiente esta vencido.
const FICHA = /\bHN-[A-Z0-9][A-Z0-9-]*\b/g

function pendientesDeLaBitacora(texto) {
  const lineas = String(texto || '').split('\n')
  const pendientes = []
  let fecha = null
  for (let i = 0; i < lineas.length; i++) {
    const m = /^##\s+(\d{4}-\d{2}-\d{2})/.exec(lineas[i])
    if (m) { fecha = m[1]; continue }
    if (!/pendiente\s*\/\s*pr[oó]ximo/i.test(lineas[i])) continue
    // El bloque es el parrafo: de la linea del titulo hasta una linea en blanco o el proximo
    // encabezado. Un pendiente escrito en tres renglones sigue siendo un pendiente.
    // El bloque termina en una linea en blanco, en un encabezado, O EN LA PROXIMA VIÑETA. Lo
    // ultimo no estaba y era el agujero: en una lista de viñetas no hay lineas en blanco, asi que
    // una viñeta que solo MENCIONA la frase -describiendo la regla, por ejemplo- se llevaba todas
    // las de abajo y el cierre acusaba un pendiente que nadie escribio. Medido el 01/09 contra el
    // PROGRESO real del loop.
    const bloque = [lineas[i]]
    for (let j = i + 1; j < lineas.length; j++) {
      if (!lineas[j].trim() || /^#{1,6}\s/.test(lineas[j]) || /^\s*[-*]\s/.test(lineas[j])) break
      bloque.push(lineas[j])
    }
    const ids = [...new Set(bloque.join('\n').match(FICHA) || [])]
    if (ids.length) pendientes.push({ fecha, ids })
  }
  return pendientes
}

// `ledger` mapea id -> passes. Un id ausente es una ficha que NO existe: fusionada, renombrada o
// nunca fichada -las tres dejan al pendiente apuntando a la nada-.
function chequearPendientesVencidos(pendientes, ledger) {
  const vencidos = []
  for (const p of pendientes) {
    for (const id of p.ids) {
      if (!(id in ledger)) vencidos.push(`${p.fecha}: nombra ${id}, que no esta en el ledger (fusionada o nunca fichada)`)
      else if (ledger[id]) vencidos.push(`${p.fecha}: nombra ${id}, que ya esta en passes:true`)
    }
  }
  if (!pendientes.length) return ok('pendientes', 'ningun "Pendiente / proximo" nombra fichas: nada que cruzar')
  if (!vencidos.length) {
    const n = pendientes.reduce((t, p) => t + p.ids.length, 0)
    return ok('pendientes', `las ${n} ficha/s que nombran los pendientes siguen abiertas en el ledger`)
  }
  return falta('pendientes', `${vencidos.length} pendiente/s de la bitacora ya estan hechos`, [
    ...vencidos,
    'reescribi el pendiente: es lo primero que lee la proxima sesion para saber por donde seguir',
  ])
}

// --- 10. las rutas que cita la bitacora existen ------------------------------------------------
// Una instruccion que apunta a un archivo que no esta es peor que ninguna: el proximo agente le
// cree y pierde el rato buscandolo.
//
// Solo se miran rutas entre backticks y CON barra: un `db.md` sin carpeta es ambiguo -hay uno por
// disciplina- y adivinar da falsos. Los placeholders (<TICKET>), los globs y las URL quedan fuera
// por la misma razon: no son rutas, son plantillas.
// El ultimo segmento lleva extension, o la ruta termina en barra. Sin eso, un `N/M` escrito en la
// prosa entra como ruta: paso el 28/08 con la propia entrada que anunciaba este chequeo.
const RUTA = /^[\w.@+-]+(?:\/[\w.@+-]+)*\/(?:[\w@+-]+\.[a-z0-9]{1,6}|)$/i

// Una CITA HISTORICA no es una instruccion rota: "vivia en work/PROGRESO.md" es cierto y contarlo
// es el punto del parrafo. Mismo criterio que buscarComandosObsoletos, que baja a AVISO lo que es
// historia; el discriminador barato es el verbo en pasado en la MISMA linea. Salio al correr el
// chequeo contra el repo real: de las 2 rutas muertas que encontro, una era el README contando de
// donde se mudo la bitacora.
const PASADO = /\b(vivia|vivian|era|eran|estaba|estaban|habia|hubo|solia|antes|ya no|se (movio|saco|migro|borro|renombro))\b/i

// `todoHistorico` lo pone el llamador para las ENTRADAS con fecha de una bitacora: ahi toda cita es
// historia por definicion -cuenta lo que pasaba ese dia- y reescribirla para que compile es peor
// que dejarla. Es el mismo corte que ya hacia buscarComandosObsoletos con `esBitacora`, pero DENTRO
// del archivo: la cabecera del PROGRESO SI son instrucciones vivas, y es justo donde el 28/08
// estaba la ruta muerta que este chequeo encontro.
function rutasCitadas(texto, { todoHistorico = false } = {}) {
  const vistas = new Map()
  for (const linea of String(texto || '').split('\n')) {
    for (const m of linea.matchAll(/`([^`\n]+)`/g)) {
      const t = m[1].trim()
      if (!RUTA.test(t) || /^https?:/.test(t)) continue
      // Si la misma ruta se cita en dos lados, gana la cita VIVA: una historica no absuelve a la
      // instruccion rota de tres parrafos mas abajo.
      const historica = todoHistorico || PASADO.test(linea)
      if (vistas.has(t) && !vistas.get(t).historica) continue
      vistas.set(t, { ruta: t, linea: linea.trim(), historica })
    }
  }
  return [...vistas.values()]
}

// La cabecera de una bitacora (lo que hay ANTES de la primera entrada con fecha) son instrucciones
// vivas; de la primera entrada para abajo es historia.
function partirBitacora(texto) {
  const t = String(texto || '')
  const i = t.search(/^##\s+\d{4}-\d{2}-\d{2}/m)
  return i < 0 ? { cabecera: t, entradas: '' } : { cabecera: t.slice(0, i), entradas: t.slice(i) }
}

// `existe(ruta)` la resuelve el llamador contra las DOS bases -la carpeta del documento y la raiz-
// y con que una de las dos exista alcanza. Probado el 28/08: resolver solo contra la raiz da 5
// falsos positivos de 5, y resolver solo contra el documento rompe toda ruta escrita desde la raiz.
function chequearRutasCitadas(faltantes, cuantasSeMiraron) {
  if (!faltantes.length) return ok('rutas', `las ${cuantasSeMiraron} ruta/s que cita la bitacora existen`)
  const linea = (f) => `${f.doc}: ${f.ruta}${f.historica ? '  (cita en pasado)' : ''}`
  const vivas = faltantes.filter((f) => !f.historica)
  if (!vivas.length) {
    return aviso('rutas', `${faltantes.length} ruta/s muertas, todas en citas en pasado (es historia)`,
      faltantes.map(linea))
  }
  return falta('rutas', `${vivas.length} ruta/s citadas no existen`, [
    ...faltantes.map(linea),
    'corregila o saca la cita: el proximo agente la va a seguir',
  ])
}

// --- 11. ningun archivo tocado quedo con caracteres de control ---------------------------------
// El 21/08 una instruccion del PROGRESO quedo con la ruta destrozada: el escape de una ruta de
// Windows, escrito desde un script dentro de comillas dobles, se convirtio en un BACKSPACE. No se
// ve al leer el archivo y ningun gate lo miraba.
const CONTROL = /[\x00-\x08\x0b\x0c\x0e-\x1f]/

function caracteresDeControl(texto) {
  const lineas = String(texto || '').split('\n')
  const hallazgos = []
  for (let i = 0; i < lineas.length; i++) {
    const m = CONTROL.exec(lineas[i])
    if (m) hallazgos.push({ linea: i + 1, codigo: `0x${m[0].charCodeAt(0).toString(16).padStart(2, '0')}` })
  }
  return hallazgos
}

function chequearCaracteresDeControl(hallazgosPorArchivo, cuantosSeMiraron) {
  const conProblemas = Object.entries(hallazgosPorArchivo).filter(([, h]) => h.length)
  if (!conProblemas.length) return ok('control', `los ${cuantosSeMiraron} archivo/s tocados no tienen caracteres de control`)
  return falta('control', `${conProblemas.length} archivo/s tienen caracteres de control`, [
    ...conProblemas.flatMap(([a, h]) => h.map((x) => `${a}:${x.linea} -> ${x.codigo}`)),
    'reescribi esa linea: el texto largo se escribe a un archivo y se inserta leyendolo, nunca',
    'interpolado dentro de comillas dobles de la shell',
  ])
}

// --- 12. el README no contradice al ledger -----------------------------------------------------
// El README declara el estado del ticket y nadie lo cruza. En IMDX-003 decia "SDD listo, esperando
// compuerta humana" con el ledger en 5/5; el 26/08 el de GMCC-261 decia lo mismo con el ledger en
// 13/18. Se mide lo unico que no es criterio: el N/M escrito a mano.
function estadoDeclarado(textoReadme) {
  for (const linea of String(textoReadme || '').split('\n')) {
    if (!/estado/i.test(linea)) continue
    // Las fechas salen primero: `DD/MM/AAAA` matcheaba como N/M y el gate comparaba 14/9 contra el
    // ledger (ICC-13 e ICC-204, 18/09/2026). El workaround era escribir la fecha en palabras, o
    // sacarla del README: justo lo contrario de lo que se quiere.
    const sinFechas = linea.replace(/\b\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{2,4}\b/g, ' ')
    const m = /(\d+)\s*\/\s*(\d+)/.exec(sinFechas)
    if (m) return { pasan: Number(m[1]), total: Number(m[2]), linea: linea.trim() }
  }
  return null
}

function chequearReadmeVsLedger(declarado, ledger) {
  if (!ledger) return aviso('readme', 'sin ledger del ticket: no se puede cruzar el estado del README')
  if (!declarado) return ok('readme', 'el README no declara un estado con numeros: nada que contradecir')
  if (declarado.pasan === ledger.pasan && declarado.total === ledger.total) {
    return ok('readme', `el README declara ${declarado.pasan}/${declarado.total} y el ledger dice lo mismo`)
  }
  return falta('readme', `el README declara ${declarado.pasan}/${declarado.total} y el ledger dice ${ledger.pasan}/${ledger.total}`, [
    declarado.linea,
    'la cifra escrita a mano se pudre: generala o sacala ([[lo-que-se-pudre-se-genera]])',
  ])
}

// --- resumen ----------------------------------------------------------------------------------
function resumir(chequeos) {
  const faltan = chequeos.filter((c) => c.estado === 'falta')
  const avisos = chequeos.filter((c) => c.estado === 'aviso')
  return {
    completo: faltan.length === 0,
    faltan: faltan.length,
    avisos: avisos.length,
    ok: chequeos.filter((c) => c.estado === 'ok').length,
  }
}


// --- 13. la REGLA DE PARADA del ticket ---------------------------------------------------------
// Del research de loop engineering (31/08): el cierre sabia si el trabajo estaba GUARDADO -limpio,
// pusheado, con bitacora- pero no si estaba HECHO. Eso lo decidia una casilla de `tasks.md` que
// marca el mismo que trabaja. `node agro.js aceptacion` corre el HECHO_CUANDO del ticket; aca solo
// se traduce su veredicto a un chequeo del cierre.
//
// Un ticket SIN criterios da AVISO y no FALTA: encender esto en rojo sobre los ~30 tickets que ya
// existen seria una regla que nace roja y se aprende a ignorar -lo mismo que ya decidimos con el
// lint sin baseline y con los hechos fuera del indice-. Para un ticket nuevo, el scaffold lo crea.
function chequearAceptacion(v) {
  if (!v) return aviso('aceptacion', 'no se corrio el HECHO_CUANDO del ticket')
  if (v.sinCriterios) {
    return aviso('aceptacion', 'el ticket no declara HECHO_CUANDO: "terminado" es una opinion', [
      'un criterio es un COMANDO que devuelve 0 o 1, y lo escribe quien pide',
      'plantilla: node agro.js aceptacion --ticket <CLAVE> te dice donde va',
    ])
  }
  const detalle = []
  for (const c of v.fallaron) detalle.push(`ROJO: ${c.titulo}`)
  for (const c of v.sinCorrer) detalle.push(`sin correr: ${c.titulo}`)
  // Un criterio que no se pudo medir NO es un criterio cumplido. `aceptacion` ya lo trata asi (su
  // `ok` exige `!sinMedir.length`) y hasta el 18/09/2026 el cierre lo ignoraba: en ICC-204,
  // `aceptacion` salia 1 diciendo "NO SE PUDO MEDIR" y `cierre` salia 0 diciendo "los criterios se
  // cumplen". Dos gates sobre el mismo veredicto no pueden decir lo contrario.
  for (const c of (v.sinMedir || [])) detalle.push(`no se pudo medir (exit ${c.exit}): ${c.titulo}`)
  if (detalle.length) {
    const rotos = v.fallaron.length + (v.sinMedir || []).length
    return falta('aceptacion', `${rotos} de ${v.total} criterios de aceptacion NO dan verde`, detalle)
  }
  // Lo manual no rompe el cierre, pero no se calla: es exactamente lo que ninguna maquina miro.
  const manuales = v.manuales.map((c) => `a mano: ${c.titulo}`)
  return ok('aceptacion', `los ${v.total} criterios de aceptacion se cumplen`, manuales)
}


// --- 14. los modos de falla de la tanda --------------------------------------------------------
// "Un cierre encuentra gaps y los corrige sin que yo le diga nada" (pedido del dueño, 28/08). Esta
// es la parte que faltaba: los gaps no salen de mirar el codigo, salen de mirar COMO CORRIO el
// loop. Del research de loop engineering: agrupar las corridas fallidas por modo de falla es el
// paso previo a cualquier auto-correccion, y es el que no teniamos.
//
// Es AVISO, nunca FALTA: un modo de falla repetido es material para una ficha, no un defecto del
// cierre de hoy. Un cierre que se pone rojo por la historia del loop no se puede cerrar nunca.
function chequearModosDeFalla(r) {
  if (!r) return aviso('modos-de-falla', 'no se pudo leer metrics/tool-runs.log')
  const detalle = []
  if (r.rotas) detalle.push(`${r.rotas} linea(s) del log rotas: la telemetria misma esta sucia`)
  for (const g of (r.gaps || []).slice(0, 5)) detalle.push(`${g.veces}x ${g.modo}`)
  for (const t of (r.casiSiempreFalla || []).slice(0, 3)) {
    detalle.push(`${t.tool}: falla ${t.fallos} de ${t.corridas} veces que se usa`)
  }
  if (!detalle.length) return ok('modos-de-falla', 'ningun modo de falla repetido fuera de los gates')
  // El paso siguiente se nombra con su comando: "esto es una ficha candidata" sin decir COMO
  // ficharla es lo que hacia que el hallazgo se perdiera entre una tanda y la otra.
  detalle.push('el detalle: node agro.js fallos   |   ficharlos: node agro.js gaps --escribir')
  return aviso('modos-de-falla', `${(r.gaps || []).length} modo(s) de falla repetidos en el loop`, detalle)
}


// --- 15. .el criterio se escribio ANTES de construir? -------------------------------------------
//
// "Freeze the target so the agent doesn't build something impressive but wrong" (OpenAI, guia de
// tareas largas). El objetivo de un ticket esta escrito -proposal, design- pero nada mira si el
// CRITERIO DE ACEPTACION nacio antes o despues del trabajo. Y ahi esta la trampa: un criterio
// escrito al final, mirando lo que quedo hecho, **se acomoda al trabajo hecho** -es el reward
// hacking que nombra The Verification Horizon, optimizar la medicion en vez del objetivo-.
//
// Se compara la fecha del PRIMER commit que trajo el HECHO_CUANDO contra la del primer commit de
// codigo del ticket. Las dos salen de git: no hay nada que declarar ni que recordar.
//
// Es AVISO y no FALTA, por dos motivos: en un ticket viejo esto es historia y no un defecto que se
// arregle hoy -reescribir el criterio ahora seria justamente acomodarlo-, y porque el orden no
// prueba mala fe: prueba que ese criterio hay que leerlo con mas desconfianza.
function chequearCriterioAntesDeConstruir({ criterio, codigo } = {}) {
  if (!criterio) return null // sin HECHO_CUANDO ya avisa el chequeo de aceptacion; no se repite
  if (!codigo) return ok('criterio-primero', 'el criterio se escribio antes que el primer codigo')
  if (criterio <= codigo) {
    return ok('criterio-primero', `el criterio (${criterio}) es anterior al primer codigo (${codigo})`)
  }
  return aviso('criterio-primero',
    `el criterio se escribio DESPUES de empezar (criterio ${criterio}, primer codigo ${codigo})`, [
      'un criterio escrito mirando el trabajo hecho se acomoda al trabajo hecho',
      'no se reescribe ahora -eso seria acomodarlo mas-: se lee con desconfianza y, si falta algo,',
      'se agrega lo que el pedido pedia y nadie verifico',
    ])
}

module.exports = {
  aportaContenido,
  chequearAceptacion,
  chequearModosDeFalla,
  chequearCriterioAntesDeConstruir,
  contarPreguntasAbiertas,
  parsearStatus,
  chequearLimpio,
  chequearPusheado,
  chequearAtraso,
  chequearPromocion,
  chequearProgreso,
  chequearDocs,
  chequearPreguntas,
  buscarComandosObsoletos,
  chequearDiasSinEntrada,
  pendientesDeLaBitacora,
  chequearPendientesVencidos,
  rutasCitadas,
  chequearRutasCitadas,
  partirBitacora,
  caracteresDeControl,
  chequearCaracteresDeControl,
  estadoDeclarado,
  chequearReadmeVsLedger,
  archivosDeLoop,
  carpetasDeBitacora,
  lineasDeLaUltimaEntrada,
  resumir,
}
