const { test } = require('node:test')
const assert = require('node:assert')
const { hallazgos, EXTENSIONES } = require('./secretos-literales')

test('un valor literal de largo real bajo una clave PASS se marca', () => {
  const contenido = '{\n  "PASS": "AB12cd34EF56gh78IJ90kl12"\n}\n'
  const r = hallazgos([{ ruta: 'API-EXTRACTO-PROD.postman_environment.json', contenido }])
  assert.deepEqual(r, [{ archivo: 'API-EXTRACTO-PROD.postman_environment.json', linea: 2, clave: 'PASS' }])
})

test('una plantilla {{token}} no se marca', () => {
  const contenido = '{\n  "token": "{{token}}"\n}\n'
  const r = hallazgos([{ ruta: 'coleccion.postman_collection.json', contenido }])
  assert.deepEqual(r, [])
})

test('un valor vacio no se marca', () => {
  const contenido = '{\n  "password": ""\n}\n'
  assert.deepEqual(hallazgos([{ ruta: 'x.json', contenido }]), [])
})

test('un valor corto (tipo codigo de ticket) no se marca', () => {
  const contenido = '{\n  "clave": "ICC-18"\n}\n'
  assert.deepEqual(hallazgos([{ ruta: 'x.json', contenido }]), [])
})

// Un `ticket.json` guarda el codigo del ticket bajo "clave", y algunos proyectos (GMCC-247,
// IMDX-001) ya llegan a 8 caracteres: el LARGO_MINIMO por si solo los marcaba como posible
// secreto. Un codigo de ticket real ("PROYECTO-NUMERO") no es una forma de secreto: se reconoce
// por FORMA, no por largo.
test('un codigo de ticket largo (GMCC-247, IMDX-001) no se marca aunque llegue a 8+ caracteres', () => {
  const contenido = '{\n  "clave": "GMCC-247"\n}\n'
  assert.deepEqual(hallazgos([{ ruta: 'x.json', contenido }]), [])
  const contenido2 = '{\n  "clave": "IMDX-001"\n}\n'
  assert.deepEqual(hallazgos([{ ruta: 'x.json', contenido: contenido2 }]), [])
})

// `iniciativa.clave` (ticket.json) cae a un slug del titulo cuando no hay codigo IN##### (ej.
// "ofertas-de-productos"): son palabras de diccionario separadas por guion, la forma opuesta
// a un secreto de alta entropia (ver los fixtures de arriba: mezclan mayus/minus/digitos SIN
// separadores legibles).
test('un slug de palabras (iniciativa.clave sin codigo) no se marca', () => {
  const contenido = '{\n  "clave": "ofertas-de-productos"\n}\n'
  assert.deepEqual(hallazgos([{ ruta: 'x.json', contenido }]), [])
  const largo = '{\n  "clave": "resolucion-19-normas-de-prevision-y-clasificacion-para-prestamo-vivienda"\n}\n'
  assert.deepEqual(hallazgos([{ ruta: 'x.json', contenido: largo }]), [])
})

// La excepcion es por FORMA (identificador legible), no por "tiene guiones": un UUID tambien
// tiene guiones y SI es una forma plausible de secreto/token (session id, api key). No se exime.
test('un UUID (tambien tiene guiones) SI se marca: no es un identificador legible', () => {
  const contenido = '{\n  "clave": "550e8400-e29b-41d4-a716-446655440000"\n}\n'
  const r = hallazgos([{ ruta: 'x.json', contenido }])
  assert.deepEqual(r, [{ archivo: 'x.json', linea: 2, clave: 'clave' }])
})

test('formato KEY=valor (.env) tambien se marca', () => {
  const contenido = 'LDAP_USUARIO=imdx\nDB_PASSWORD=Sup3rSecreta123\n'
  const r = hallazgos([{ ruta: '.env', contenido }])
  assert.deepEqual(r, [{ archivo: '.env', linea: 2, clave: 'DB_PASSWORD' }])
})

test('KEY= vacio (.env.example) no se marca', () => {
  const contenido = 'LDAP_CONTRASENA=\nDB_PASSWORD=\n'
  assert.deepEqual(hallazgos([{ ruta: '.env.example', contenido }]), [])
})

test('un objeto client_secret largo se marca', () => {
  const contenido = '{"client_secret": "n8Fk29xLp0Qz71Rm4Tv6"}'
  const r = hallazgos([{ ruta: 'oauth.json', contenido }])
  assert.deepEqual(r, [{ archivo: 'oauth.json', linea: 1, clave: 'client_secret' }])
})

test('camelCase apiKey largo se marca', () => {
  const contenido = '{"apiKey": "n8Fk29xLp0Qz71Rm4Tv6"}'
  const r = hallazgos([{ ruta: 'config.json', contenido }])
  assert.deepEqual(r, [{ archivo: 'config.json', linea: 1, clave: 'apiKey' }])
})

test('una clave que no es sensible no se marca aunque el valor sea largo', () => {
  const contenido = '{"nombre": "Un texto cualquiera bastante largo"}'
  assert.deepEqual(hallazgos([{ ruta: 'x.json', contenido }]), [])
})

test('EXTENSIONES incluye json, env, yml/yaml, properties, ini, cfg, conf', () => {
  for (const e of ['.json', '.env', '.yml', '.yaml', '.properties', '.ini', '.cfg', '.conf']) {
    assert.ok(EXTENSIONES.includes(e), `falta ${e}`)
  }
})

test('formato Postman ("key": "PASS", "value": "...") tambien se marca (el incidente real)', () => {
  const contenido = [
    '{',
    '  "values": [',
    '    { "key": "USER", "value": "svc_extracto" },',
    '    {',
    '      "key": "PASS",',
    '      "value": "Zx9qLm2Vt7Rp4Ns8Wj1Kd3Yf",',
    '      "type": "default"',
    '    }',
    '  ]',
    '}',
  ].join('\n')
  const r = hallazgos([{ ruta: 'API-EXTRACTO-PROD.postman_environment.json', contenido }])
  assert.deepEqual(r, [{ archivo: 'API-EXTRACTO-PROD.postman_environment.json', linea: 6, clave: 'PASS' }])
})

test('formato Postman con "value" en plantilla {{token}} no se marca', () => {
  const contenido = [
    '{ "key": "token", "value": "{{token}}" }',
  ].join('\n')
  assert.deepEqual(hallazgos([{ ruta: 'coleccion.postman_collection.json', contenido }]), [])
})

test('formato Postman con "key" no sensible (USER) no se marca aunque el valor sea largo', () => {
  const contenido = '{ "key": "USER", "value": "un_usuario_bastante_largo" }'
  assert.deepEqual(hallazgos([{ ruta: 'x.json', contenido }]), [])
})

test('el "key"/"value" de un header no relacionado (name distinto) no cruza entradas', () => {
  const contenido = [
    '{ "key": "USER", "value": "corta" },',
    '{ "key": "extracto_CC", "value": "colocar_cuenta_bastante_larga" },',
    '{ "key": "PASS" },',
  ].join('\n')
  assert.deepEqual(hallazgos([{ ruta: 'x.json', contenido }]), [])
})

test('junta hallazgos de varios archivos', () => {
  const archivos = [
    { ruta: 'a.json', contenido: '{"PASS": "AB12cd34EF56gh78IJ90kl12"}' },
    { ruta: 'b.json', contenido: '{"token": "{{token}}"}' },
  ]
  assert.strictEqual(hallazgos(archivos).length, 1)
})
