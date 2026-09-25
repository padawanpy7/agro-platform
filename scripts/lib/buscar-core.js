// buscar-core.js - de que ticket es una carpeta de transcript, puro: sin git ni disco.
//
// POR QUE EXISTE: Claude Code nombra la carpeta de cada proyecto con su ruta ABSOLUTA, cambiando
// '/', '\' y '.' por '-' (ver scripts/lib/transcripts.js). Un worktree es una carpeta HERMANA del
// repo principal, nombrada "<repo>-<ticket>": matchear solo el NOMBRE del repo ("agro-platform")
// sin anclarlo contra su carpeta padre deja pasar cualquier proyecto que termine en esas letras
// -"...-old-agro-platform" daba "main" siendo un repo totalmente distinto, porque el regex viejo
// solo pedia que la carpeta TERMINARA en "agro-platform"-. La unica ancla que no se confunde es
// la carpeta FLATTENED del repo PRINCIPAL entera (con su padre adentro), no solo su basename.

function ticketDeCarpeta(carpeta, carpetaPrincipal) {
  const c = String(carpeta || '')
  const p = String(carpetaPrincipal || '')
  if (!p) return null
  if (c === p) return 'main'
  if (c.startsWith(`${p}-`)) return c.slice(p.length + 1)
  return null
}

module.exports = { ticketDeCarpeta }
