// Lee `entornos.yml`: que cambia entre correr en la maquina y correr en el cluster.
//
// Existe porque el YAML se parseaba SUELTO en varias tools, cada una con su
// `YAML.parse(readFileSync(...))` y su propio manejo de errores. Varias copias del mismo
// `path.join(RAIZ, ...)` son varios lugares donde renombrar el archivo rompe algo distinto.
//
// Lo que vive aca son RUTAS, URLs y nombres. **Las credenciales no**: van en `.env` con su nombre
// real. La version anterior de este archivo, en el repo de origen, derivaba credenciales de
// conexion a partir de esta config; se reescribio el 25/09/2026 al portar el loop. Un secreto
// derivado es un secreto que despues nadie sabe de donde salio.

const fs = require('fs')
const path = require('path')
const YAML = require('yaml')

const RAIZ = path.join(__dirname, '..', '..')
const ARCHIVO = path.join(RAIZ, 'entornos.yml')

let cache = null

function leer() {
  if (cache) return cache
  if (!fs.existsSync(ARCHIVO)) {
    throw new Error(`no encuentro ${path.relative(RAIZ, ARCHIVO)}: es el mapa de entornos del workspace.`)
  }
  cache = YAML.parse(fs.readFileSync(ARCHIVO, 'utf8')) || {}
  return cache
}

const entornos = () => leer().entornos || {}

// Un entorno que no existe se dice con los que SI hay. Devolver `undefined` deja que el error
// aparezca tres llamadas mas arriba, sobre un campo, y sin decir cual era el nombre malo.
function entorno(nombre) {
  const todos = entornos()
  const e = todos[nombre]
  if (!e) {
    const hay = Object.keys(todos).join(', ') || '(ninguno declarado)'
    throw new Error(`no conozco el entorno "${nombre}". Declarados en entornos.yml: ${hay}`)
  }
  return e
}

// Las variables de ambiente que el dispatcher publica si no estan ya en `.env`.
const variables = () => (leer().apps || {}).env || {}

// Solo para los tests: el cache es por proceso y sin esto un test no puede releer el archivo.
const _resetCache = () => { cache = null }

module.exports = { leer, entornos, entorno, variables, _resetCache, ARCHIVO }
