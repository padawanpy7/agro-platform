// Audita la salud del loop: placeholders sin llenar, registry desincronizado, playbooks vacios
// o viejos, gates que faltan. Correlo cada tanto para que los docs no se pudran.
//
// Uso: node agro.js doctor

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const cambios = require('../lib/carpeta-cambios')

const leer = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return '' } }
const existe = (f) => fs.existsSync(f)

let aviso = 0
const mal = (msg) => { console.log(`  ! ${msg}`); aviso = 1 }
const bien = (msg) => console.log(`  ok ${msg}`)
const info = (msg) => console.log(`  i ${msg}`)

console.log('==> doctor: salud del loop')

if (leer('AGENTS.md').includes('{{')) mal('AGENTS.md tiene {{PLACEHOLDERS}} sin completar')
else bien('placeholders')

const proyecto = leer('project.yml')
if (/^name: ""/m.test(proyecto)) mal('project.yml: name vacio')
if (/^\s+build: ""/m.test(proyecto)) info('project.yml: commands.build vacio (a proposito, sin comandos declarados todavia hasta que haya codigo)')

// El registry se regenera y se compara: si cambio, es que estaba desactualizado. Va por un proceso
// aparte a proposito -skill-sync escribe y hace su propio print- en vez de requerirlo y silenciar
// su salida, que seria mas rapido pero mas fragil.
if (existe('scripts/loop/skill-sync.js')) {
  const antes = leer('skills/REGISTRY.md')
  spawnSync(process.execPath, ['agro.js', 'skill-sync'], { stdio: 'ignore' })
  if (antes !== leer('skills/REGISTRY.md')) mal('skills/REGISTRY.md estaba desactualizado (lo regenere)')
  else bien('skill registry')
}

// Un playbook con solo titulos y bullets vacios es un archivo que promete y no cumple: el proximo
// agente lo abre esperando practicas y no encuentra nada.
const playbooks = existe('memory/playbooks') ? fs.readdirSync('memory/playbooks').filter((f) => f.endsWith('.md')) : []
for (const p of playbooks) {
  const cuerpo = leer(`memory/playbooks/${p}`).split('\n')
    .filter((l) => !/^\s*(#|-\s*$|$|`)/.test(l)).length
  if (cuerpo < 2) mal(`playbook casi vacio (seedealo): memory/playbooks/${p}`)
}

// Documentos que hace mucho no se tocan: no es un error, es "revisa que no mientan".
const DIAS = 45
const limite = Date.now() - DIAS * 24 * 3600 * 1000
const viejos = []
const barrer = (dir) => {
  if (!existe(dir)) return
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = `${dir}/${e.name}`
    if (e.isDirectory()) barrer(f)
    else if (e.name.endsWith('.md') && fs.statSync(f).mtimeMs < limite) viejos.push(f)
  }
}
barrer('memory/playbooks')
if (viejos.length) console.log(`  ! sin actualizar hace >${DIAS}d (revisar que no mientan): ${viejos.join(' ')}`)

for (const [f, que] of [
  ['scripts/loop/features.js', 'ledger del build'],
  ['agro.js', 'punto de entrada de las tools'],
]) {
  if (!existe(f)) mal(`falta ${f} (${que})`)
}

const PUENTE = cambios.archivoDelLoop('PROGRESO.md')
if (existe(PUENTE)) bien(PUENTE)
else info('sin ' + PUENTE + ' (el puente entre sesiones del loop; empezalo al cerrar)')

const CARPETA_CAMBIOS = cambios.carpeta()
const ledgers = existe(CARPETA_CAMBIOS)
  ? fs.readdirSync(CARPETA_CAMBIOS).filter((c) => existe(path.join(CARPETA_CAMBIOS, c, 'FEATURES.json'))).length
  : 0
if (ledgers) bien(`${ledgers} ledger(s) por-ticket (${CARPETA_CAMBIOS}/<id>/FEATURES.json)`)
else info(`sin ledgers por-ticket (los builds grandes crean ${CARPETA_CAMBIOS}/<id>/FEATURES.json)`)

info('Regla 10: al salir un modelo nuevo, re-examina el loop y desmonta andamiaje viejo')

console.log('')
console.log(aviso === 0 ? 'OK doctor: loop sano' : 'doctor: hay cosas para completar/actualizar (ver arriba)')
