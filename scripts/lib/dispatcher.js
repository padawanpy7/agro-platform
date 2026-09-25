// Como se llama el dispatcher de ESTE repo. Aca es `agro.js`; en el repo de infra es `infra.js`.
//
// POR QUE EXISTE: el nombre estaba escrito adentro de los cores compartidos -en el regex de que
// cuenta como loop, en el comando que sugiere `task-cerrar`- y eso los ata a un proyecto. Al
// promover el loop al otro repo el 01/09, dos tests fallaron por esto y un tercer chequeo -el de
// comandos muertos- venia APAGADO desde hacia un dia: buscaba `node agro.js <tool>` en un repo donde
// nadie escribe eso, asi que no matcheaba nunca y daba verde sin mirar.
//
// No se declara en config: se DEDUCE. El dispatcher es el archivo que node esta corriendo, y eso ya
// lo sabe el proceso. Un dato que se puede leer no se pide.
const path = require('path')

function nombre(principal = require.main) {
  const archivo = principal && principal.filename
  if (!archivo) return 'agro.js'
  const base = path.basename(archivo)
  // Corriendo bajo `node --test`, el "principal" es el corredor de tests y no el dispatcher. Ahi no
  // se adivina: se cae al default y el que necesita otro lo pasa explicito.
  if (!base.endsWith('.js') || base.includes('.test.')) return 'agro.js'
  return base
}

module.exports = { nombre }
