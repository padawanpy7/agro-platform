# El patron de fondo: esto es un AI loop

Salio de `AGENTS.md` §4 el 13/08/2026: es el por que del protocolo de sesion (`memory/playbooks/lead.md`),
no algo que haga falta releer para ejecutar una tarea puntual. Leelo si necesitas entender el
fundamento del loop, o al diseñar un loop nuevo.

Lo de arriba no es burocracia: es un **loop**. La diferencia entre promptear y esto es que el
prompt busca *una buena respuesta* y el loop **hace que el trabajo siga avanzando**: ejecuta,
verifica, reitera y **recuerda**. El ciclo es siempre el mismo:

```
Objetivo -> Contexto -> Acción -> Verificación -> ¿suficiente? --No--> reiterar
                                                        |Sí
                                                        v
                                                     Memoria
```

Cada pieza del loop ES un componente del loop:

| Componente | Dónde vive acá |
|---|---|
| Objetivo | el ticket + `jira/<id>/proposal.md` |
| Contexto | `AGENTS.md`, `project.yml`, el playbook de la disciplina, `MEMORY.md` |
| Acción | el especialista (database/implementer) |
| Verificación | el **verifier** (estáticos + compila en desmond + funcional) |
| Decisión (reiterar/avanzar) | veredicto OK/VOLVER, máx. N rondas (`verify_max_rounds`) |
| Memoria | `MEMORY.md` + playbooks + el PROGRESO del ticket |
| Criterio de "hecho" | los `pasos` de cada feature en `FEATURES.json` |

Lo que hay que hacer **explícito** en cada tarea (es donde los loops se caen):

1. **Criterio de éxito por paso**, no al final. Si no sabés qué hace pasar un paso, el verifier
   no puede juzgarlo: va en los `pasos` de la feature.
2. **Terminación explícita**: cuándo para (criterio cumplido), cuándo **escala al humano**
   (riesgo, decisión de producto, N rondas sin verde). Nunca "seguí hasta que salga".
3. **Qué se guarda**: la lección durable va a `MEMORY.md`/playbook *al cerrar*, no "cuando me
   acuerde". Antes de una tarea parecida, se lee primero (por eso el checklist de arranque).
4. **Routing por modelo**: el modelo justo por fase (`model:` de cada rol). Lo mecánico barato,
   el juicio caro.
5. **El humano en rol crítico**: fija el objetivo, define el gusto, aprueba lo riesgoso y mejora
   el sistema entre corridas. No está pegado a cada paso.

Regla práctica: lo que hacés **todos los días no debería vivir dentro de un solo chat**. Si una
tarea se repite, conviene convertirla en loop (o en skill) en vez de re-promptearla cada vez.
