// cambio-nuevo.js - arranca un cambio con el LOOP COMPLETO desde el minuto cero.
//
// Uso: node agro.js cambio-nuevo <nombre>        (ej. observabilidad-alertas)
//      node agro.js cambio-nuevo <nombre> --que "una linea de que se busca"
//
// Crea `cambios/<nombre>/` con las cuatro piezas que un cambio necesita para ser un loop
// y no una intencion:
//
//   proposal.md      el OBJETIVO, congelado: que cambia y por que
//   design.md        las decisiones tomadas antes de construir
//   tasks.md         el plan por fases
//   HECHO_CUANDO.md  la REGLA DE PARADA: cuando esta terminado, en comandos
//   FEATURES.json    el ledger: una ficha por entregable, con passes true/false
//
// POR QUE ESTA TOOL: sin ella el cambio nace con objetivo y plan, y **sin regla de parada**. Eso
// deja "terminado" como opinion del que trabaja: `tasks.md` son casillas `- [x]` que marca esa
// misma persona. Un archivo que hay que acordarse de crear no se crea; uno que ya esta, se llena.
//
// ES IDEMPOTENTE y NO PISA: correrla dos veces no borra nada. Lo que existe se respeta y se dice.

const fs = require('fs')
const path = require('path')
const cambios = require('../lib/carpeta-cambios')

const RAIZ = process.cwd()
const args = process.argv.slice(2)

if (!args.length || args.includes('-h') || args.includes('--help')) {
  console.log('Uso: node agro.js cambio-nuevo <nombre> [--que "una linea de que se busca"]')
  console.log('')
  console.log('Crea cambios/<nombre>/ con proposal, design, tasks, HECHO_CUANDO y el')
  console.log('ledger. Idempotente: no pisa lo que ya exista.')
  process.exit(args.length ? 0 : 2)
}

const nombre = args[0]
// El nombre es una carpeta y una clave: se limita a lo que no da sorpresas en ningun sistema de
// archivos ni en una ruta de git.
if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/i.test(nombre)) {
  console.error(`nombre invalido: "${nombre}"`)
  console.error('se admiten letras, numeros y guiones (ej. observabilidad-alertas, ICC-90)')
  process.exit(2)
}

const iQue = args.indexOf('--que')
const QUE = iQue >= 0 ? (args[iQue + 1] || '') : ''

const dir = path.join(RAIZ, cambios.carpeta(), nombre)
fs.mkdirSync(dir, { recursive: true })

const creados = []
const yaEstaban = []

function escribir(archivo, lineas) {
  const ruta = path.join(dir, archivo)
  if (fs.existsSync(ruta)) { yaEstaban.push(archivo); return }
  fs.writeFileSync(ruta, lineas.join('\n') + '\n')
  creados.push(archivo)
}

escribir('proposal.md', [
  `# Proposal: ${nombre}`,
  '',
  QUE || '(una línea: qué se busca, en términos de lo que va a poder hacerse después)',
  '',
  '## Qué cambia',
  '',
  '## Por qué',
  '',
  '## Objetivo y no-objetivos',
  '',
  '- **Objetivo**: ',
  '- **No-objetivo (por ahora)**: ',
])

escribir('design.md', [
  `# Design: ${nombre}`,
  '',
  'Las decisiones que se toman ANTES de construir, con su por qué. Una decisión que se documenta',
  'después es una justificación, no una decisión.',
  '',
  '## D1. ',
  '',
  '**Decisión**: ',
  '',
  '**Por qué**: ',
  '',
  '**Qué se descartó**: ',
])

escribir('tasks.md', [
  `# Tasks: ${nombre}`,
  '',
  'Plan por fases. Cada fase entrega algo **funcionando y verificado** antes de avanzar.',
  '',
  '> Las casillas de acá las marca quien trabaja: son un PLAN, no una verificación. Lo que decide',
  '> si el cambio está terminado vive en `HECHO_CUANDO.md`.',
  '',
  '## Fase 0 - ',
  '- [ ] ',
])

escribir('HECHO_CUANDO.md', [
  `# HECHO_CUANDO - ${nombre}`,
  '',
  '**Cuándo está terminado este cambio.** Un `##` es un criterio; adentro va el COMANDO que lo',
  'verifica -devuelve 0 si se cumple- o una línea `> manual: ...` si ninguna tool lo ve.',
  '',
  'Lo escribe **quien pide**, y **antes** de construir: un criterio escrito después, mirando el',
  'trabajo hecho, se acomoda al trabajo hecho. Sale del objetivo del `proposal.md`.',
  '',
  'Lo corre `node agro.js aceptacion` y el cierre no deja cerrar con uno en rojo. En los comandos,',
  `\`$TICKET\` y \`$TICKET_DIR\` valen \`${nombre}\` y \`${cambios.carpeta()}/${nombre}\`.`,
  '',
  '## Los gates del repo pasan',
  '',
  '```sh',
  'node agro.js check',
  '```',
  '',
  '## (borrar esto y escribir el primer criterio propio del cambio)',
  '',
  '> manual: ',
])

const ledger = path.join(dir, 'FEATURES.json')
if (fs.existsSync(ledger)) yaEstaban.push('FEATURES.json')
else {
  fs.writeFileSync(ledger, JSON.stringify({
    proyecto: nombre,
    nota: "Ledger del cambio. Solo se cambia 'passes'; no se borra ni se edita descripcion/pasos. Lo que dice estar hecho lleva su evidencia.",
    features: [],
  }, null, 2) + '\n')
  creados.push('FEATURES.json')
}

console.log(`==> ${cambios.carpeta()}/${nombre}/`)
for (const c of creados) console.log(`  +  ${c}`)
for (const y of yaEstaban) console.log(`  ·  ${y} (ya estaba, no se toco)`)
console.log('')
console.log('Antes de construir, en este orden:')
console.log('  1. proposal.md  -> el objetivo, y se congela ahi')
console.log('  2. HECHO_CUANDO.md -> como se va a saber que esta hecho, en comandos')
console.log('  3. design.md / tasks.md -> recien despues')
console.log('')
console.log(`Estado: node agro.js aceptacion --ticket ${nombre} --listar`)
