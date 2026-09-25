// El navegador COMPARTIDO: un solo Chromium para todas las tools que abren pantalla.
//
// Uso: node agro.js navegador [estado|arrancar|parar]
//   estado    (default) que servidor hay, desde cuando, quien lo esta usando
//   arrancar  lo levanta a mano (normalmente no hace falta: la primera tool que lo necesita
//             lo levanta sola)
//   parar     lo apaga ya, sin esperar el TTL
//
// El motivo y los numeros estan en la cabecera de `scripts/lib/navegador.js`. En corto: cada tool
// es un proceso aparte y hasta el 11/08 cada una levantaba su propio Chromium (~3,1 s por
// invocacion); `kove-jornada` spawnea 4-6 tools por corrida.

const nav = require('../lib/navegador')

const args = process.argv.slice(2)
const comando = args.find((a) => !a.startsWith('-')) || 'estado'

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Uso: node agro.js navegador [estado|arrancar|parar]

  estado    (default) el servidor compartido y sus clientes
  arrancar  levanta el servidor (la primera tool que lo necesita ya lo hace sola)
  parar     lo apaga ahora mismo

Interruptores (.env):
  AGRO_NAVEGADOR=0          apaga el compartido: cada tool abre el suyo, como antes
  AGRO_NAVEGADOR_AUTO=0     no lo levanta solo
  AGRO_NAVEGADOR_TTL_MIN=N  minutos sin clientes antes de apagarse (default 20)`)
  process.exit(0)
}

const desde = (iso) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  return min < 1 ? 'recien' : min < 60 ? `hace ${min} min` : `hace ${(min / 60).toFixed(1)} h`
}

function imprimirEstado() {
  const e = nav.estado()
  console.log('navegador compartido: ' + (e.activo ? 'activo' : 'APAGADO (AGRO_NAVEGADOR=0)'))
  if (!e.activo) return
  console.log(`  auto-arranque: ${e.autoArranque ? 'si' : 'no'}    se apaga tras ${e.ttlMin} min sin clientes`)
  if (!e.servidor) { console.log('  servidor: no hay ninguno corriendo'); return }
  if (!e.servidor.vivo) {
    console.log(`  servidor: ANOTADO PERO MUERTO (pid ${e.servidor.pid}). La proxima tool lo limpia y levanta otro.`)
    return
  }
  console.log(`  servidor: pid ${e.servidor.pid}, ${e.servidor.headless ? 'headless' : 'headed'}, arriba ${desde(e.servidor.creado)}`)
  console.log(`  clientes conectados: ${e.clientes.length}${e.clientes.length ? ' (pid ' + e.clientes.join(', ') + ')' : ''}`)
}

async function main() {
  if (comando === 'estado') return imprimirEstado()

  if (comando === 'arrancar') {
    const ya = nav.leerEndpoint()
    if (ya && nav.estaVivo(ya.pid)) { console.log(`ya habia uno corriendo (pid ${ya.pid})`); return imprimirEstado() }
    const e = await nav.arrancarServidor({ headless: process.env.AGRO_NAVEGADOR_HEADLESS !== '0' })
    if (!e) throw new Error('el servidor no anoto su endpoint. Mirá work/navegador/servidor.log')
    console.log(`servidor arriba (pid ${e.pid})`)
    return imprimirEstado()
  }

  if (comando === 'parar') {
    const r = await nav.parar()
    if (!r.paro) { console.log(r.motivo); return }
    console.log(`servidor apagado (pid ${r.pid})`)
    if (r.huerfano) console.log(`  ojo: el Chromium (pid ${r.navegadorPid}) habia quedado vivo; se lo mato aparte`)
    else if (r.navegadorPid) console.log(`  el Chromium (pid ${r.navegadorPid}) se fue con el`)
    return
  }

  console.error(`no conozco "${comando}". Uso: node agro.js navegador [estado|arrancar|parar]`)
  process.exit(2)
}

main()
