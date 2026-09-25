// transcripts.js - donde viven los archivos que Claude Code escribe solo, para no clavar la ruta
// en cada tool que los lee (metricas.js, buscar.js y traza.js la necesitaban las tres, cada una
// con su propia copia del mismo string).
//
// Tres ubicaciones, verificadas contra sesiones reales el 09/09/2026:
//   - el transcript de la sesion:            <PROYECTOS>/<carpeta>/<sesion>.jsonl
//   - el transcript de un subagente (VIVE):   <PROYECTOS>/<carpeta>/<sesion>/subagents/agent-<id>.jsonl
//   - el mismo subagente, en Temp (se limpia): <tmp>/claude/<carpeta>/<sesion>/tasks/<id>.output
// La carpeta sale de la ruta del repo con separadores Y PUNTOS cambiados por guiones: es como
// Claude Code nombra la carpeta del proyecto ("C:\bffamiliar\bf-db-workspace" ->
// "C--bffamiliar-bf-db-workspace").
//
// EL PUNTO ENTRA, y no es cosmetico. Aca no se notaba porque esta ruta no tiene ninguno; salio al
// llevar `traza` al repo de infra, que vive en "C:/Users/ian.delvalle/Downloads/infra-platform":
// sin convertir el punto, la tool buscaba en "C--Users-ian.delvalle-..." -carpeta que no existe- y
// contestaba "no encontre transcripts". Un falso negativo, o sea la misma familia de fallo que la
// tool viene a evitar: decir "no hay nada" cuando lo que pasa es que se miro en el lugar equivocado.
const os = require('os')
const path = require('path')

const PROYECTOS = path.join(os.homedir(), '.claude', 'projects')

function carpetaDelProyecto(raiz) {
  return String(raiz).replace(/[:\\/.]/g, '-')
}

function dirDeSesiones(raiz) {
  return path.join(PROYECTOS, carpetaDelProyecto(raiz))
}

function rutaSesion(raiz, sesionId) {
  return path.join(dirDeSesiones(raiz), `${sesionId}.jsonl`)
}

function rutaSubagente(raiz, sesionId, agentId) {
  return path.join(dirDeSesiones(raiz), sesionId, 'subagents', `agent-${agentId}.jsonl`)
}

function rutaSubagenteTemp(raiz, sesionId, agentId) {
  return path.join(os.tmpdir(), 'claude', carpetaDelProyecto(raiz), sesionId, 'tasks', `${agentId}.output`)
}

module.exports = { PROYECTOS, carpetaDelProyecto, dirDeSesiones, rutaSesion, rutaSubagente, rutaSubagenteTemp }
