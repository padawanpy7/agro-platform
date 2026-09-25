---
name: diagnosticar
when: algo falla, se rompe, miente o anda lento y la causa no es obvia; antes de proponer un arreglo
---

# Skill: diagnosticar

Primero un **loop rojo**, después las hipótesis. Técnica de `mattpocock/skills` (`diagnosing-bugs`),
adaptada a este stack; detalle en `docs/research-2026-09-14-10-repos-fazt.md`. Nace de fichas
como `HN-CERRAR-ACTIVIDAD`: semanas de hipótesis descartadas de a una, sin un comando que reprodujera
el problema.

## Fase 1: el loop rojo

Un **comando** que ya corriste al menos una vez, y que:

- va por el camino real y **afirma el síntoma exacto** que se reportó: se pone rojo con ESTE problema,
  no con uno vecino;
- da el mismo veredicto en cada corrida;
- tarda segundos;
- lo corre un agente sin ayuda (salvo el caso de la persona en el loop, abajo).

Dónde buscarlo, en este orden:

1. un test en `scripts/lib/*.test.js` o `cambios/<nombre>/tests/`;
2. la tool con un argumento fijo, comparando su salida contra una buena conocida;
3. una consulta de solo lectura contra la base que muestre el estado malo (sin tool declarada
   para esto todavía: se corre directo con las credenciales del `.env`);
4. un spec de Playwright que afirme sobre el DOM de la pantalla;
5. volver a pasar una captura real (un payload MQTT guardado, una respuesta de la API, un log) por el camino aislado;
6. el mismo input por la versión vieja y la nueva (`git stash`, un commit anterior) y comparar salidas;
7. **persona en el loop**, para lo que solo se ve en el campo -un sensor enterrado, una valvula que
   abre-: un guion de pasos
   numerados que la persona sigue, con lo que tiene que copiar de vuelta. Sigue siendo un loop, no una charla.

Hecho cuando: podés pegar el comando y su salida en rojo. **Sin eso no hay fase 2**: se dice qué se
probó y se pide lo que falta (acceso, una captura, permiso para instrumentar).

Si el problema es intermitente, el objetivo es subir la tasa de reproducción (repetirlo 20 veces,
cambiar tiempos), no esperar a que salga solo.

## Fase 2: reproducir y achicar

- Confirmá que el rojo es el síntoma reportado y no otro que está al lado: un bloqueante puede
  tapar a otro.
- Achicá el caso de a un elemento por vez (datos, pasos, parámetros), corriendo el loop después de cada
  corte. Termina cuando sacar cualquier elemento lo pone en verde.

## Fase 3: hipótesis

- **Tres a cinco, ordenadas, antes de probar ninguna.** Con una sola, la primera idea plausible gana.
- Cada una con la predicción que la confirma o la descarta.
- Se prueban de a una, con el loop. Las descartadas se escriben con su evidencia en la ficha o el
  PROGRESO del ticket: mañana nadie las vuelve a probar.

## Fase 4: arreglo y cierre

- El loop pasa a ser el test de regresión: verlo **rojo contra el código viejo** y verde con el
  arreglo, para probar que el test de verdad detecta el bug.
- Correrlo contra el caso REAL, no el imaginado.
- Escribir la causa, no "se arregló". Si antes quedó escrita una causa que resultó falsa, se corrige.

## Lo que se muestra

Credenciales, cookies y datos de personas van como `<REDACTED>` en lo que se pega. El loop lee las
credenciales del `.env`, así no aparecen en la salida.
