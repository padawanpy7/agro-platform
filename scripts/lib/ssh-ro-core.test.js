const { test } = require('node:test')
const assert = require('node:assert')
const { revisar } = require('./ssh-ro-core')

function ok(cmd) {
  const r = revisar(cmd)
  assert.equal(r.ok, true, `deberia permitir "${cmd}" pero dijo: ${r.motivo}`)
}

function rechaza(cmd, fragmentoDelMotivo) {
  const r = revisar(cmd)
  assert.equal(r.ok, false, `deberia rechazar "${cmd}"`)
  if (fragmentoDelMotivo) {
    assert.match(r.motivo, new RegExp(fragmentoDelMotivo, 'i'),
      `el motivo de "${cmd}" fue "${r.motivo}"`)
  }
}

test('permite los comandos de lectura que hacen falta para mirar DIR_CAJA', () => {
  ok('ls -la /archivos_aplicacion/caja')
  ok('cat /archivos_aplicacion/caja/imprimir_imdx.sh')
  ok('head -50 capd11c_imdx_1.txt')
  ok('tail -n 20 error_imp_imdx.log')
  ok('find /archivos_aplicacion/caja -name "capd35_*.txt"')
  ok('stat capd11c.txt')
  ok('od -c capd35.txt')
  ok('wc -l archivo.txt')
  ok('md5sum a.txt')
})

test('permite encadenar por pipe: conecta stdout con stdin, no toca el disco', () => {
  ok('cat archivo.txt | grep -c ESC')
  ok('ls -la /dir | sort | head -5')
  ok('od -c a.txt | grep 033')
})

test('permite asignaciones de entorno delante del binario', () => {
  ok('LC_ALL=C grep -c x archivo.txt')
})

test('rechaza cualquier redireccion a archivo', () => {
  rechaza('cat a.txt > b.txt', 'redireccion')
  rechaza('echo hola >> log.txt', 'redireccion')
  rechaza('ls | tee salida.txt', 'redireccion|tee|escribir')
})

test('rechaza los binarios que escriben, nombrandolos', () => {
  rechaza('rm -rf /archivos_aplicacion/caja', 'rm')
  rechaza('mv a.txt b.txt', 'mv')
  rechaza('cp a.txt b.txt', 'cp')
  rechaza('mkdir nueva', 'mkdir')
  rechaza('chmod 777 a.txt', 'chmod')
  rechaza('truncate -s 0 a.txt', 'truncate')
})

test('rechaza los interpretes: pueden escribir desde su propio lenguaje', () => {
  rechaza('sed -i s/a/b/ archivo.txt', 'sed')
  rechaza("awk '{print > \"otro.txt\"}' a.txt", 'awk|redireccion')
  rechaza('python3 -c "open(1,2)"', 'python3')
  rechaza('bash -c "rm x"', 'bash')
})

test('rechaza el encadenamiento y la sustitucion de comandos', () => {
  rechaza('ls; rm -rf /', 'encadenamiento')
  rechaza('ls && rm x', 'encadenamiento')
  rechaza('cat $(echo a.txt)', 'sustitucion')
  rechaza('cat `echo a.txt`', 'sustitucion')
})

test('rechaza un binario prohibido AUNQUE este despues de un pipe', () => {
  rechaza('cat a.txt | sed -i s/x/y/ b.txt', 'sed')
  rechaza('ls | xargs rm', 'xargs|rm|lista blanca')
})

test('rechaza find con acciones que ejecutan o borran', () => {
  rechaza('find . -name x -delete', 'find')
  rechaza('find . -exec rm {} ;', 'encadenamiento|find')
  ok('find . -name "*.txt" -newermt "-1 day"')
})

test('rechaza lo desconocido en vez de asumir que es inofensivo', () => {
  rechaza('lpr -Pce0007 a.txt', 'lpr')
  rechaza('herramienta_nueva --flag', 'lista blanca')
  rechaza('', 'vacio')
})
