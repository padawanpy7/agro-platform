// El PRESUPUESTO de los documentos que se leen en cada arranque. Puro: recibe tamaños, no lee disco.
//
// Por que existe: `AGENTS.md` declara desde el dia uno "mantenlo lean (~200, max 500 lineas)" y el
// 12/08 estaba en **892**. La regla estaba escrita y se incumplia hace meses, porque **un techo que
// nadie mide no es un techo, es una intencion**. Lo mismo con `PROGRESO.md`, que llego a 1080
// lineas siendo el archivo que el lead lee entero al arrancar.
//
// El costo no es abstracto: los tres sumaban ~45.000 tokens antes de que el agente hiciera nada, y
// mas contexto no es mejor -contexto de mas diluye la atencion sobre la tarea real-.
//
// Rompe a proposito (decision del dueño, 12/08): "mejor que rompa, y lo arreglamos ya". Un aviso
// que no frena se saltea; y el loop es la herramienta con la que se construye todo lo demas.

// Este default es solo el FALLBACK para un repo que todavia no declaro `presupuesto:` en su
// project.yml: `presupuesto.js` siempre prefiere el del proyecto y solo cae aca si no hay ninguno.
// Por eso los nombres de acá son GENERICOS y no los de ningun proyecto en particular -clavar los
// de un proyecto real fue justo el problema que esta tool vino a resolver: llevarla a otro repo
// arrastraba archivos que ahi no existen (ver el comentario de `presupuesto.js`).
const PRESUPUESTO = [
  { archivo: 'AGENTS.md', tope: 500, porque: 'se lee en CADA tarea; lo que no aplica a todas va a una skill o playbook' },
  { archivo: 'memory/MEMORY.md', tope: 200, porque: 'es un INDICE de punteros; lo de un ticket va a su aprendizajes.md' },

  // Los PLAYBOOKS entran el 25/08: son el gasto fijo mas grande del loop cuando un agente los
  // manda leer ANTES de tocar su area, y sin techo crecen sin limite -un techo que nadie mide no
  // es un techo. Los nombres de aca son de ejemplo: cada proyecto declara los suyos.
  { archivo: 'memory/playbooks/lead.md', tope: 320, porque: 'lo lee el lead al arrancar y al cerrar CADA sesion' },
  { archivo: 'memory/playbooks/backend.md', tope: 400, porque: 'se lee antes de tocar el backend; los casos medidos van a un archivo hermano' },
  { archivo: 'memory/playbooks/database.md', tope: 400, porque: 'se lee antes de tocar el esquema; los casos medidos van a database-hechos.md' },
]

// `medidos` es [{ archivo, lineas }]. Devuelve el veredicto y, por archivo, cuanto sobra.
// Un archivo que NO existe no es una violacion: puede no haberse creado todavia.
function evaluar(medidos, presupuesto = PRESUPUESTO) {
  const filas = presupuesto.map((p) => {
    const m = (medidos || []).find((x) => x.archivo === p.archivo)
    if (!m || m.lineas === null || m.lineas === undefined) {
      return { ...p, lineas: null, sobra: 0, ok: true, ausente: true }
    }
    const sobra = m.lineas - p.tope
    return { ...p, lineas: m.lineas, sobra: sobra > 0 ? sobra : 0, ok: sobra <= 0, ausente: false }
  })
  return { ok: filas.every((f) => f.ok), filas, excedidos: filas.filter((f) => !f.ok) }
}

// El mensaje dice CUANTO sobra y QUE hacer, no solo que se paso: un gate que dice "estas en 892"
// deja al que lo lee decidiendo a ciegas que sacar.
function informe(resultado) {
  return resultado.filas.map((f) => {
    if (f.ausente) return `  ·  ${f.archivo}: no existe`
    const estado = f.ok ? 'OK ' : '✗  '
    const detalle = f.ok
      ? `${f.lineas}/${f.tope} lineas`
      : `${f.lineas}/${f.tope} lineas — SOBRAN ${f.sobra}. ${f.porque}`
    return `  ${estado} ${f.archivo}: ${detalle}`
  }).join('\n')
}

// --- el gate de DELTA: cuanto CRECIO, no cuanto mide ---------------------------------------------
// El tope solo salta cuando ya rompiste, y siempre en mitad de otra tarea: la poda sale grande,
// apurada y a desgano. Lo que hace falta medir es el INCREMENTO, porque es donde esta la decision
// que importa -"esto va como linea en el indice, o como veinte lineas en el playbook"-.
//
// Por que no alcanza con la regla escrita: la cabecera de cada archivo hermano ya la dice, y los
// playbooks se llenaron igual. El comentario de arriba lo explica: agregar una linea tiene premio
// visible y sacarla no tiene ninguno. Un gate cambia el incentivo; un parrafo no.
//
// El TOPE de crecimiento es chico a proposito. Un aprendizaje nuevo entra como UNA fila de indice
// (`| si estas por... | seccion |`) y el detalle nace en el archivo hermano. Si no entra en tres
// lineas, no es una linea de indice: es una seccion, y las secciones van al hermano.
// El maximo de crecimiento es un PARAMETRO, no un numero suelto en el codigo. Tres niveles, del
// mas general al mas especifico, y gana el mas especifico:
//   1. este default                       -> 3
//   2. `maxCrecimiento` de ese documento  -> para el que necesite otro, sin tocar a los demas
//   3. `--max N` en la corrida            -> puntual, para medir sin editar nada
// Vive aca y no en la tool por la misma razon que los topes: es una decision del proyecto.
const CRECIMIENTO_MAXIMO = 3

// `medidos` es [{ archivo, crecio }] con el neto (agregadas - borradas) contra la base.
// Un archivo que ENCOGIO o quedo igual nunca falla: sacar siempre esta permitido.
function evaluarDelta(medidos, { tope, presupuesto = PRESUPUESTO } = {}) {
  const filas = presupuesto.map((p) => {
    const m = (medidos || []).find((x) => x.archivo === p.archivo)
    const crecio = m && Number.isFinite(m.crecio) ? m.crecio : 0
    const suyo = Number.isFinite(tope) ? tope
      : (Number.isFinite(p.maxCrecimiento) ? p.maxCrecimiento : CRECIMIENTO_MAXIMO)
    return { archivo: p.archivo, porque: p.porque, crecio, tope: suyo, ok: crecio <= suyo }
  })
  const excedidos = filas.filter((f) => !f.ok)
  return { ok: excedidos.length === 0, filas, excedidos, tocados: filas.filter((f) => f.crecio !== 0) }
}

function informeDelta(resultado) {
  if (!resultado.tocados.length) return '  ·  ningun documento presupuestado cambio'
  return resultado.tocados.map((f) => {
    const signo = f.crecio > 0 ? `+${f.crecio}` : `${f.crecio}`
    if (f.ok) return `  OK  ${f.archivo}: ${signo} lineas`
    return [
      `  ✗   ${f.archivo}: ${signo} lineas (el maximo es +${f.tope})`,
      `        ${f.porque}`,
      '        El detalle va al archivo hermano; aca va UNA fila de indice que diga cuando ir.',
    ].join('\n')
  }).join('\n')
}

// --- subir un techo es una salida VALIDA, y se paga con un motivo -------------------------------
//
// Hasta el 31/08 la tool trataba el techo como sagrado: cuando saltaba, el unico consejo era sacar
// contenido. Ese dia se rompio TRES veces en el repo de origen -dos playbooks y MEMORY.md- y las
// tres se podaron a las apuradas en medio de un merge, que es la peor situacion para decidir que se
// tira. deepseek-harness tiene el mismo gate y contempla lo que a nosotros nos faltaba: "raise a
// ceiling when the required content genuinely needs more space".
//
// Para que subirlo no sea la salida facil de siempre, subir el `tope` obliga a reescribir el
// `porque`: si el documento necesita mas lugar, la razon por la que tiene techo cambio, y decirla
// es el precio. Quien y cuando lo subio ya lo guarda git; no hace falta un registro aparte que se
// pudra.
//
// Ambos argumentos son la lista de `project.yml`: la de AHORA y la de la base de comparacion.
function evaluarSubidas(actual, base) {
  if (!Array.isArray(base) || !base.length) return { ok: true, subidas: [], sinMotivo: [] }
  const subidas = []
  for (const p of actual || []) {
    const antes = base.find((x) => x.archivo === p.archivo)
    if (!antes || !(Number(p.tope) > Number(antes.tope))) continue
    subidas.push({
      archivo: p.archivo,
      de: Number(antes.tope),
      a: Number(p.tope),
      motivoNuevo: String(p.porque || '').trim() !== String(antes.porque || '').trim(),
    })
  }
  const sinMotivo = subidas.filter((s) => !s.motivoNuevo)
  return { ok: sinMotivo.length === 0, subidas, sinMotivo }
}

function informeSubidas(r) {
  if (!r.subidas.length) return ''
  return r.subidas.map((s) => s.motivoNuevo
    ? `  OK  ${s.archivo}: techo ${s.de} -> ${s.a}, con motivo nuevo`
    : [
      `  ✗   ${s.archivo}: techo ${s.de} -> ${s.a} SIN decir por que`,
      '        Subir un techo es valido; que quede sin explicar, no. Reescribi su `porque`',
      '        en project.yml: que contenido necesita ese lugar y por que no va a un hermano.',
    ].join('\n')).join('\n')
}

module.exports = {
  PRESUPUESTO, CRECIMIENTO_MAXIMO,
  evaluar, informe, evaluarDelta, informeDelta, evaluarSubidas, informeSubidas,
}

