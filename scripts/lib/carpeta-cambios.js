// Donde viven los cambios/tickets de ESTE repo, y cual de ellos es el del loop.
//
// POR QUE EXISTE: la ruta estaba escrita adentro de cada tool -`jira/META/...` aca, `openspec/
// changes/loop/...` en el repo de infra-. Eso ata la tool a un proyecto: al llevarla al otro,
// busca una carpeta que ahi no existe y, peor, algunos chequeos dan VERDE sin mirar nada (es
// exactamente el modo de falla que el dispatcher ya tuvo: ver scripts/lib/dispatcher.js).
//
// Las dos piezas salen de `project.yml` y no del codigo:
//   carpeta_cambios:     donde viven todos los cambios      (aca `jira`, en infra `cambios`)
//   change_del_loop:  cual de ellos es el del loop    (aca `META`)
//
// Si el proyecto no las declara, se cae a los valores de ESTE repo, que es lo que habia antes.

const fs = require('fs')
const path = require('path')

function config(raiz = process.cwd()) {
  try {
    const yml = path.join(raiz, 'project.yml')
    if (fs.existsSync(yml)) return require('yaml').parse(fs.readFileSync(yml, 'utf8')) || {}
  } catch { /* se cae a los defaults */ }
  return {}
}

/** La carpeta que contiene todos los cambios. Ej: `jira`. */
function carpeta(raiz = process.cwd()) {
  return String(config(raiz).carpeta_cambios || 'jira')
}

/** El nombre del change del loop. Ej: `META`. */
function delLoop(raiz = process.cwd()) {
  return String(config(raiz).change_del_loop || 'META')
}

/** Ruta a un change: `jira/ICC-124`. Sin argumento, la del loop: `jira/META`. */
function ruta(cambio, raiz = process.cwd()) {
  return path.join(carpeta(raiz), cambio || delLoop(raiz))
}

/** Ruta a un archivo adentro del change del loop: `jira/META/FEATURES.json`. */
function archivoDelLoop(...partes) {
  return path.join(ruta(null), ...partes)
}

module.exports = { carpeta, delLoop, ruta, archivoDelLoop }
