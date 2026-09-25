const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')

const SCRIPT = path.join(__dirname, 'cambio-nuevo.js')

function fixture() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cambio-nuevo-test-'))
}

function correr(raiz, args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: raiz, encoding: 'utf8' })
}

test('cambio-nuevo crea el change bajo la carpeta_cambios declarada, no "cambios" clavado', () => {
  const raiz = fixture()
  fs.writeFileSync(path.join(raiz, 'project.yml'), 'carpeta_cambios: tickets\n')

  const r = correr(raiz, ['mi-cambio', '--que', 'probar'])

  assert.equal(r.status, 0)
  assert.match(r.stdout, /==> tickets\/mi-cambio\//)
  assert.ok(fs.existsSync(path.join(raiz, 'tickets', 'mi-cambio', 'HECHO_CUANDO.md')))
  assert.ok(!fs.existsSync(path.join(raiz, 'cambios')))
})

test('cambio-nuevo escribe la carpeta_cambios declarada adentro del HECHO_CUANDO.md, no clavada', () => {
  const raiz = fixture()
  fs.writeFileSync(path.join(raiz, 'project.yml'), 'carpeta_cambios: tickets\n')

  correr(raiz, ['mi-cambio', '--que', 'probar'])
  const hechoCuando = fs.readFileSync(path.join(raiz, 'tickets', 'mi-cambio', 'HECHO_CUANDO.md'), 'utf8')

  assert.match(hechoCuando, /tickets\/mi-cambio/)
  assert.doesNotMatch(hechoCuando, /cambios\/mi-cambio/)
})

test('cambio-nuevo cae al default de carpeta-cambios.js ("cambios") si no hay project.yml', () => {
  const raiz = fixture()

  const r = correr(raiz, ['mi-cambio'])

  assert.equal(r.status, 0)
  assert.ok(fs.existsSync(path.join(raiz, 'cambios', 'mi-cambio', 'FEATURES.json')))
})
