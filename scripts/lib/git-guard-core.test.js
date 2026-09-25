const { test } = require('node:test')
const assert = require('node:assert')

const { revisar } = require('./git-guard-core')

// Comandos que borran trabajo o reescriben historia: el hook tiene que pedir confirmacion.
const PIDEN = [
  'git reset --hard',
  'git reset --hard origin/main',
  'git -C C:/bffamiliar/bf-db-workspace-ICC-124 reset --hard HEAD~1',
  'git -c core.quotepath=false reset --hard',
  'git clean -fd',
  'git clean -xdf',
  'git clean --force',
  'git branch -D ICC-13',
  'git branch --delete --force ICC-13',
  'git checkout .',
  'git checkout -- .',
  'git restore .',
  'git push --force',
  'git push -f origin main',
  'git push --force-with-lease origin main',
  'git push origin +main',
  'git push -q origin --delete ICC-13',
  'git push origin :ICC-13',
  'git stash drop',
  'git stash clear',
  'git worktree remove --force ../bf-db-workspace-ICC-13',
  'git filter-branch --tree-filter x HEAD',
  'echo hola && git reset --hard',
  'cd C:/x; git clean -f',
  'git status\ngit branch -D vieja',
  'W=C:/x; git -C "$W" reset --hard'
]

// Lo que el flujo normal usa todo el tiempo: no puede preguntar nada.
const PASAN = [
  'git status --short',
  'git push -q origin main',
  'git push origin ICC-192',
  'git branch -d ICC-13',
  'git restore --staged .',
  'git checkout main',
  'git checkout -- scripts/loop/features.js',
  'git clean -n',
  'git reset HEAD archivo.js',
  'git reset --soft HEAD~1',
  'git stash',
  'git stash pop',
  'git worktree remove ../bf-db-workspace-ICC-13',
  'git commit -m "no usar git reset --hard ni git push --force"',
  "git commit -q -F - <<'EOF'\nexplica por que no se hizo git reset --hard\ngit branch -D tampoco\nEOF",
  'node agro.js task-cerrar ICC-13 --cerrar',
  'grep -n "git push --force" docs/research.md',
  'echo git clean -fd',
  '',
  'ls -la'
]

for (const cmd of PIDEN) {
  test(`pide confirmacion: ${cmd.replace(/\n/g, ' \\n ')}`, () => {
    const r = revisar(cmd)
    assert.strictEqual(r.pedir, true, `deberia pedir confirmacion y dio ${JSON.stringify(r)}`)
    assert.ok(r.motivo && r.motivo.length > 10, 'el motivo tiene que decir que se freno y por que')
  })
}

for (const cmd of PASAN) {
  test(`pasa sin preguntar: ${cmd.replace(/\n/g, ' \\n ').slice(0, 80)}`, () => {
    assert.deepStrictEqual(revisar(cmd), { pedir: false })
  })
}

test('una entrada que no es texto no rompe ni frena', () => {
  assert.deepStrictEqual(revisar(undefined), { pedir: false })
  assert.deepStrictEqual(revisar(null), { pedir: false })
})
