// Las DECISIONES del navegador compartido, sin fs, sin red y sin playwright (`path` si: no toca
// disco, solo arma rutas).
//
// Vive aparte de `navegador.js` para que se pueda testear lo unico que tiene reglas: cuando se
// reusa el servidor de otro, cuando se levanta uno, cuando conviene abrir el propio, y cuando el
// servidor ya no le sirve a nadie y se tiene que apagar solo.

const path = require('path')

const TTL_MIN_DEFAULT = 20

// Que hacer cuando una tool pide un navegador.
//
// `endpoint` es lo anotado por el servidor (o null si no hay nada); `vivo` dice si ese proceso
// todavia corre. La distincion entre "no hay servidor" y "hay uno anotado pero muerto" importa:
// el segundo caso deja un archivo que hay que limpiar antes de arrancar otro, y si se lo trata
// igual que al primero el endpoint podrido sobrevive y cada corrida vuelve a intentar conectarse
// contra un puerto que no contesta.
function decidir({ endpoint, quiere = {}, compartir = true, autoArranque = true, vivo = true, propio = false } = {}) {
  // Pedido POR INVOCACION (opcion `propio:true` en `abrirContexto`), distinto de `AGRO_NAVEGADOR=0`
  // (que apaga el compartido para TODA la sesion). Un flujo de escritura pide el suyo sin afectar
  // a las lecturas que corren en el mismo proceso o en procesos vecinos.
  if (propio) return { accion: 'propio', motivo: 'se pidio browser propio para esta invocacion (opcion propio:true)' }
  if (!compartir) return { accion: 'propio', motivo: 'compartir desactivado (AGRO_NAVEGADOR=0)' }

  if (!endpoint || !endpoint.ws) {
    return autoArranque
      ? { accion: 'arrancar', motivo: 'no hay servidor compartido corriendo' }
      : { accion: 'propio', motivo: 'no hay servidor compartido y el auto-arranque esta apagado' }
  }

  if (!vivo) {
    return autoArranque
      ? { accion: 'arrancar', motivo: 'el servidor anotado ya no corre (endpoint viejo)', limpiar: true }
      : { accion: 'propio', motivo: 'el servidor anotado ya no corre y el auto-arranque esta apagado', limpiar: true }
  }

  // `headless` se decide al LANZAR el servidor: no se puede cambiar por conexion. Un pedido
  // headed contra un servidor headless tiene que abrir su propio browser -y NO levantar un
  // segundo servidor, que dejaria dos Chromium compartidos peleandose el archivo de endpoint-.
  // (`slowMo` si viaja por conexion, asi que no entra en la comparacion.)
  if (Boolean(endpoint.headless) !== Boolean(quiere.headless !== false)) {
    return {
      accion: 'propio',
      motivo: `el servidor compartido esta ${endpoint.headless ? 'headless' : 'headed'} y se pidio ` +
        `${quiere.headless !== false ? 'headless' : 'headed'}`,
    }
  }

  return { accion: 'conectar', motivo: 'servidor compartido vivo y compatible' }
}

// Si conviene intentar levantar el servidor ahora.
//
// Existe por un modo de fallo concreto: si el servidor NO puede arrancar (no estan bajados los
// browsers, por ejemplo), sin esto cada tool spawnea un proceso que muere, para siempre. Un
// intento reciente y sin endpoint dice "ya probe hace nada y no salio": se sigue con el browser
// propio y se vuelve a intentar recien pasada la espera.
function puedeIntentarArranque({ ultimoIntento = 0, ahora = 0, esperaMs = 60000 } = {}) {
  return ahora - ultimoIntento >= esperaMs
}

// De los pids anotados, los que todavia existen. `estaVivo` se inyecta para poder testear sin
// procesos de verdad.
function clientesVivos(pids, estaVivo) {
  return pids.filter((pid) => estaVivo(pid))
}

// El servidor se apaga solo cuando no le sirve a nadie hace rato. Las dos condiciones son AND a
// proposito: apagar por tiempo sin mirar los clientes mata una corrida larga (un spec de e2e
// tranquilamente pasa de 20 minutos), y apagar apenas se va el ultimo cliente tira justo el
// arranque que la proxima tool iba a reusar -que es todo el punto de esto-.
function debeApagarse({ clientesVivos: vivos = 0, ultimoUso = 0, ahora = 0, ttlMs = TTL_MIN_DEFAULT * 60000 } = {}) {
  if (vivos > 0) return false
  return ahora - ultimoUso >= ttlMs
}

// `kove-explorar` y `envx-explorar` SOLO LEEN por default; `--click` es la unica escritura
// posible (el propio codigo de cada uno avisa "ESCRIBE en la pantalla SI ese link hace algo").
// No es ambiguo, es CONDICIONAL a ese flag: se centraliza aca para no repetir el criterio entre
// los dos exploradores y para poder testearlo sin abrir un browser.
function propioParaExplorador(clicPedido) {
  return Boolean(clicPedido)
}

// Mismo fallback que `agro.js` (que lo fija al arrancar cualquier tool): los browsers de Playwright
// viven fuera del repo, HERMANOS de la raiz (junto a jdk/pmd/python/sqlcl), no adentro.
function rutaBrowsersPorDefecto(raiz) {
  return path.join(path.dirname(raiz), 'tools', 'playwright-browsers')
}

module.exports = {
  decidir, clientesVivos, debeApagarse, puedeIntentarArranque, TTL_MIN_DEFAULT,
  propioParaExplorador, rutaBrowsersPorDefecto,
}
