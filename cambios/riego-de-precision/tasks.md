# Tasks: riego-de-precision

Plan por fases. Cada fase entrega algo **funcionando y verificado** antes de avanzar.

> Las casillas de acá las marca quien trabaja: son un PLAN, no una verificación. Lo que decide
> si el cambio está terminado vive en `HECHO_CUANDO.md`.

Las siete fases son la tabla de **orden de construcción** del [design.md](design.md) §6, una por
paso. El orden no es negociable por una razón sola: **las tres primeras no necesitan comprar
nada**, y la cuarta es la primera que pide hardware (~72 USD, Gs 592.000 con caudalímetro, comprado
entero en Asunción -- ver [PREGUNTAS.md](PREGUNTAS.md) §3).

**La pregunta 0 -quién es el cliente- está abierta y NO bloquea ninguna fase de acá.** Los cuatro
escenarios (productor, cooperativa, junta de agua, organismo) construyen el mismo producto; lo que
cambia es quién firma. Lo único que se reescribe si gana otro escenario es `ECONOMIA.md`. Lo que sí
bloquea a la Fase 4 es la compra del hardware, que es plata del dueño.

**Cada fase cierra con su script de verificación versionado en `scripts/`**, no con una corrida a
mano en la terminal de la sesión: el scratchpad se pierde y el criterio de `HECHO_CUANDO.md` lo
nombra por nombre de archivo. El script es parte del entregable, no un extra.

**Modo: `critical`.** Hay plata (hardware, VPS), hay datos que no se arreglan después (regla 1 del
contrato: un dato mal guardado es irreversible) y hay seguridad (aislamiento entre clientes). Por
`AGENTS.md` §4 eso pide evidencia contra la base real, no compilación, y revisión humana firme.

## Fase 0 - preparar el terreno, sin escribir producto

Hoy `project.yml` tiene `build`, `test`, `lint` y `run` **vacíos a propósito**, porque no hay
código. La Fase 1 crea el primero, y sin estos comandos declarados `check` saltea sus gates y no
mide nada.

- [x] Postgres local con TimescaleDB + PostGIS **LEVANTADA Y VERIFICADA** el 29/09: PG 17.11, Timescale 2.30.1, PostGIS 3.6.4, atada a `127.0.0.1`. Probada creando una hypertable y guardando un `POINT` 4326
      (es lo que necesita el verifier: los estáticos corren en cualquier máquina, los tests contra
      base real necesitan `.env` y una base levantada).
- [x] `lint` y `test` declarados en `project.yml`; `check` ya los corre (9 en verde). **`build` sigue vacio A PROPOSITO**: hoy no hay artefacto que construir, y poner uno falso es el rojo-que-se-ignora que el propio archivo venia evitando.
- [x] Esqueleto: `pyproject.toml` con **versiones fijas**, las ocho pasadas por `check-dep` el 29/09 -- todas en ultima estable y sin vulnerabilidades. Mas `api/config.py` y sus dos tests.
- [x] `memory/playbooks/database.md` escrito el 28/09, **antes** de la primera migracion.

**Prueba de que la fase sirvió**: `node agro.js check` deja de decir "salteado" en lint, build y
tests.

## Fase 1 - Esquema + RLS + hypertables

Las doce tablas del `design.md` §1. `medicion` y `riego_evento` como hypertables de Timescale; el
resto, tablas comunes.

- [ ] Migración up/down de las doce tablas, con `tenant_id` en todas y las policies de RLS.
- [ ] `medicion` y `riego_evento` convertidas a hypertable. **Sólo esas dos**: un catálogo de 200
      filas como hypertable es costo sin beneficio.
- [ ] `calibracion` con procedencia obligatoria (fabricante / ensayo propio / fecha) y **sin UPDATE**:
      se cierra la vigente y se inserta otra. Si se edita, se pierde con qué fórmula se calibró lo
      viejo.
- [ ] Comentarios obligatorios en la migración: qué dato queda y qué se pierde (excepción explícita
      de la regla 7 del contrato; una pérdida de precisión es irreversible).
- [ ] `scripts/verificar-rls.sh`: dos tenants cargados, A no ve nada de B, una query sin tenant
      devuelve cero filas, y el esquema se compara **contra `information_schema`/`pg_catalog`**, no
      contra el archivo de migración.
- [ ] `scripts/verificar-precision.sh`: hora de medición y de llegada separadas, crudo junto a
      calibrado, punto geográfico no nulo.

**Rol**: `database`. **Gate**: el objeto tiene que compilar contra la Postgres real (AGENTS.md §7).

## Fase 2 - Ingesta MQTT -> base, con dedup

- [ ] Broker MQTT y **ChirpStack** levantados en local. ChirpStack es la pieza que el diseño no
      nombraba y entró el 27/09: sin él, cada nodo se da de alta a mano y las claves viven en un
      papel.
- [ ] Worker que consume el tópico, valida, deduplica por (dispositivo, hora de medición) y escribe
      en lote.
- [ ] **El dato no se promedia en la ingesta.** Se guarda crudo y calibrado. Si hay que elegir entre
      disco y precisión, gana la precisión.
- [ ] `scripts/verificar-dedup.sh`: el mismo payload tres veces, una sola fila.

**Rol**: `backend`. **Depende de**: Fase 1.

## Fase 3 - API de política + controlador simulado

Las tres superficies del `design.md` §3 son deployments separados: ingesta (MQTT), api de
aplicación (REST para el front) y api de política (la única que el campo consulta).

- [ ] API de política: la nube entrega umbrales, ventanas y duración máxima. **Nunca** un comando de
      abrir o cerrar una válvula.
- [ ] Controlador simulado: decide con lo que mide, guarda la última política y su fecha, y a los N
      días sin política nueva cae al programa conservador registrándolo.
- [ ] Cada decisión entera en `riego_evento`: condición que la causó, decisión, política vigente y
      resultado (minutos, litros si hay caudalímetro). Sin la acción y su contexto, el histórico
      describe pero no predice.
- [ ] `scripts/verificar-autonomia.sh`: se corta el enlace y sigue regando; pasan N días y cae al
      conservador.

**Rol**: `backend`. **Depende de**: Fases 1 y 2. **Es la última fase que no cuesta plata.**

## Fase 4 - Controlador real en banco (ESP32 + válvula)

Banco de pruebas en el terreno familiar de Misiones ([banco-de-pruebas.md](banco-de-pruebas.md)).
**Acá no se vende ahorro de agua**: es zona húmeda de 1.300-1.800 mm. Se vende cuándo NO regar, el
veranico y la saturación.

- [ ] **Compuerta del dueño**: aprobar la compra (~72 USD). Sin esto la fase no arranca.
- [ ] Sensor de humedad **capacitivo V1.2**, no el FC-28. El resistivo se corroe en semanas y su
      lectura deriva: sirve para escribir software contra un número que cambia, no para medir. Está
      sin stock: se pide por WhatsApp.
- [ ] Calibración del sensor con su procedencia escrita (comentario obligatorio, regla 7). Un número
      de calibración sin procedencia no es un número, es una superstición.
- [ ] Firmware del ESP32: lee el sensor localmente y decide. El lazo vive en el campo.
- [ ] **Dos sensores a un metro de distancia**, y ver si dicen lo mismo. No es funcionalidad, es
      método: esa respuesta decide si se vende uno por parcela o tres, y cambia el precio de la
      instalación.
- [ ] Verificación **a mano** del criterio de la válvula (ninguna tool nuestra ve una válvula
      física).

**Rol**: `implementer` + el dueño en el banco. **Depende de**: Fase 3 y de la compra.

## Fase 5 - Front: mapa, series, historial

- [ ] Mapa de parcelas como pantalla principal: el polígono, los dispositivos, el estado. Todo se
      navega desde ahí porque la parcela es la unidad de análisis.
- [ ] Series de humedad y clima; historial de riego; reportes.
- [ ] Los dispositivos caen dentro del polígono **solos**, por geometría, no asignados a mano.
- [ ] Web responsive. Sin app nativa: es no-objetivo declarado del proposal.

**Rol**: `ui-designer` (diseño con Claude Design antes de codear) + `backend` para la api de
aplicación. **Depende de**: Fase 1.

## Fase 6 - NDVI de Sentinel-2 por parcela

- [ ] Ingesta de NDVI a `indice_espacial` por parcela y fecha. Sentinel-2 es gratis.
- [ ] La salida a Copernicus es una **CCNP declarada en git**: la red es default-deny y cada flujo
      nuevo se declara, no se abre un puerto. Se le pasa a `infra-platform`; no se toca desde acá.
- [ ] `scripts/verificar-ndvi.sh`: un polígono nuevo trae su serie.

**Rol**: `backend`. **Depende de**: Fase 1.

## Fase 7 - Estación meteorológica

- [ ] Sus variables entran al **mismo** modelo de medición, no a una tabla aparte.
- [ ] Decisión de compra pendiente: la Dragino sale 346 USD entre las tres piezas; una comercial
      WiFi con API sale 150-200 y se pierde LoRa. Es decisión del diseño, no del proposal.

**Rol**: `backend`. **Depende de**: Fases 1 y 2. Habilita ETo, balance hídrico, grados-día y horas
de frío -- que son software sobre hardware que ya va a estar, y están en la hoja de ruta del
proposal, fuera de esta ficha.

## Lo que NO entra en esta ficha

Fertirriego, ML en producción, app móvil nativa y los otros tres productos. Son no-objetivos
declarados en el `proposal.md`. Esta ficha **construye el dataset y deja el lugar donde el modelo se
va a enchufar**.
