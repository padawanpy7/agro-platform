// Hook PreToolUse de Claude Code sobre Bash: pide confirmacion antes de un git que borra trabajo o
// reescribe historia (reset --hard, clean -f, branch -D, checkout ., push --force/--delete...).
// La decision vive en scripts/lib/git-guard-core.js, que tiene sus tests; aca solo se lee la entrada.
//
// Pide confirmacion ("ask") en vez de bloquear: la regla 1 de AGENTS.md es "nada destructivo sin
// autorizacion explicita", y la autorizacion la da el dueño en el momento, en el mismo prompt.
//
// Cualquier error sale con 0 y sin decision: un hook roto no puede trabar todos los comandos
// (Claude Code trata un exit distinto de 2 como no bloqueante, pero no conviene ni ensuciar el log).
const path = require('path')

let entrada = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (d) => { entrada += d })
process.stdin.on('end', () => {
  try {
    const { revisar } = require(path.join(__dirname, '..', '..', 'scripts', 'lib', 'git-guard-core.js'))
    const comando = JSON.parse(entrada || '{}')?.tool_input?.command
    const r = revisar(comando)
    if (r.pedir) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: r.motivo }
      }))
    }
  } catch { /* falla abierto */ }
  process.exit(0)
})
