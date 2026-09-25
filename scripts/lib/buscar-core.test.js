const { test } = require('node:test')
const assert = require('node:assert/strict')
const { ticketDeCarpeta } = require('./buscar-core')

const PRINCIPAL = '-home-devops-agro-platform'

test('la carpeta del repo principal es "main"', () => {
  assert.equal(ticketDeCarpeta(PRINCIPAL, PRINCIPAL), 'main')
})

test('un worktree "<repo>-<ticket>" da el ticket', () => {
  assert.equal(ticketDeCarpeta(`${PRINCIPAL}-ICC-13`, PRINCIPAL), 'ICC-13')
})

test('un worktree con guiones en el nombre de la rama tambien', () => {
  assert.equal(ticketDeCarpeta(`${PRINCIPAL}-feat-x`, PRINCIPAL), 'feat-x')
})

// El regex viejo no estaba anclado: "-home-devops-old-agro-platform" terminaba en "agro-platform"
// y daba "main" siendo un repo distinto ("old-agro-platform", una sola carpeta bajo /home/devops).
test('una carpeta que solo TERMINA en el nombre del repo, de otro repo, no es de este', () => {
  assert.equal(ticketDeCarpeta('-home-devops-old-agro-platform', PRINCIPAL), null)
})

// Mismo caso con un prefijo distinto DELANTE del nombre del repo, en vez de detras: tampoco es
// este repo, aunque el sufijo despues del nombre ("-extra") parezca un ticket valido.
test('un repo con un prefijo distinto no se confunde con un ticket de este', () => {
  assert.equal(ticketDeCarpeta(`${PRINCIPAL.replace('-agro-platform', '')}-super-agro-platform-extra`, PRINCIPAL), null)
})

test('sin carpeta principal (git no se pudo leer y tampoco hay fallback) no se inventa nada', () => {
  assert.equal(ticketDeCarpeta(PRINCIPAL, ''), null)
})

test('carpeta vacia o undefined no rompe', () => {
  assert.equal(ticketDeCarpeta('', PRINCIPAL), null)
  assert.equal(ticketDeCarpeta(undefined, PRINCIPAL), null)
})
