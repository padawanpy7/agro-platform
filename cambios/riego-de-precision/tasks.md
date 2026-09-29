# Tasks: riego-de-precision

Plan por fases. Cada fase entrega algo **funcionando y verificado** antes de avanzar.

> Las casillas de acá las marca quien trabaja: son un PLAN, no una verificación. Lo que decide
> si el cambio está terminado vive en `HECHO_CUANDO.md`.

Las siete fases son la tabla de **orden de construcción** del [design.md](design.md) §6, una por
paso. El orden no es negociable por una razón sola: **las tres primeras no necesitan comprar
nada**, y la cuarta es la primera que pide hardware (~72 USD, Gs 592.000 con caudalímetro, comprado
entero en Asunción -- ver [PREGUNTAS.md](PREGUNTAS.md) §3).

**La pregunta 0 -quién es el cliente- se contestó el 29/09: el PRODUCTOR.** Nunca bloqueó una fase
de acá, y la respuesta lo confirma: no cambia una línea de lo construido, porque los cuatro
escenarios construían el mismo producto y sólo cambiaba quién firma. Lo que sí bloquea a la Fase 4
sigue siendo la compra del hardware, que es plata del dueño.

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

- [x] **Las seis migraciones, aplicadas y verificadas el 29/09**: 001 nucleo, 002 historia y RLS, 003 los tres agujeros de acceso, 004 agronomia, 005 ganaderia, 006 calibracion de solo cierre. **62 tablas de producto y 57 de historia.** Se paso de las doce del design a las 62 porque la mitad del Minimum Data Set no la manda ningun sensor.
- [x] **Las bajadas existen y se CORREN**, no solo se escriben: `apply-schema.sh --down` seguido de una subida limpia deja `verify-schema.sh` en 48/48. Una bajada que nadie ejecuta es un archivo que dice ser un rollback.
- [x] `medicion`, `riego_evento` y `animal_location` son hypertables, **verificado contra el catalogo de Timescale**. **Desviacion declarada**: el plan decia "medicion y riego_evento, el resto no", y `animal_location` es la tercera. Entra porque crece al ritmo de un aparato, que es el criterio real. `indice_espacial` **fue** hypertable durante una hora y se saco: nueve anios de Sentinel-2 sobre veinte parcelas son trece mil filas, y particionar eso no compra nada.
- [x] **Una calibracion se cierra y no se edita, y lo hace cumplir el permiso**: `grant update (valid_to)`, por columna. 002 lo decia en un comentario y otorgaba UPDATE sobre la tabla entera, que permitia exactamente lo que el comentario prohibia.
- [x] **Tres agujeros de acceso cerrados** (migracion 003), los tres de la misma forma -- tablas que nadie penso como "datos de cliente" porque no llevan `tenant_id`: `role_permission` y `membership_role` sin RLS, `app_user` sin permiso para el producto, y `credential` sin un rol que la leyera (ahora `agro_auth`, que no ve un solo dato de cliente).
- [x] **El DER completo**, generado del catalogo de la base que corre: [docs/der.md](docs/der.md), 62 tablas con todas sus columnas y las 130 claves foraneas en Mermaid. Mas dos diagramas de archify en `desarrollo/diagramas/`. Y el generador **falla** si el diagrama dibujado a mano nombra una tabla que ya no existe -- que es como se descubrio que seguia en espaniol.
- [x] `calibracion` con `procedencia` NOT NULL y no-vacia, y una sola vigente por (dispositivo, magnitud). **Las dos cosas probadas en rojo.**
- [x] Comentario de que queda y que se pierde en las cuatro migraciones (001/002, up y down). El de la bajada de la 002 dice explicitamente que **se pierde el historico entero** y que la vuelta atras real es restaurar de backup.
- [x] `cambios/riego-de-precision/scripts/verify-schema.sh`: **48/48 en verde** contra la base que corre. Con control negativo: borrando a proposito una policy, un trigger, una tabla de historia y un permiso, los pasos correspondientes se ponen en rojo. Incluye el paso que prueba que una magnitud nueva es **una FILA y no una migracion**, y el que prueba que una cosecha cargada hoy **etiqueta una foto de hace dos meses sin tocarla**.
- [x] Los dos pasos estructurales dejaron de ser CUENTAS ("11 tablas con RLS", "24 de historia") y pasaron a ser **diferencias de conjunto**: cuantas tablas que DEBERIAN tenerlo no lo tienen. Las cuentas se pusieron en rojo al llegar a 62 tablas sin que nada estuviera mal, que es el peor rojo: el que se aprende a editar en vez de leer.

**Rol**: `database`. **Gate**: el objeto tiene que compilar contra la Postgres real (AGENTS.md §7).

## Fase 2 - Ingesta MQTT -> base, con dedup

- [ ] Broker MQTT y **ChirpStack** levantados en local. ChirpStack es la pieza que el diseño no
      nombraba y entró el 27/09: sin él, cada nodo se da de alta a mano y las claves viven en un
      papel.
- [ ] Worker que consume el tópico, valida, deduplica por (dispositivo, hora de medición) y escribe
      en lote.
- [ ] **El dato no se promedia en la ingesta.** Se guarda crudo y calibrado. Si hay que elegir entre
      disco y precisión, gana la precisión.
- [ ] `verify-ingest.sh` (todavia no existe): el mismo payload tres veces, una sola fila.

**Rol**: `backend`. **Depende de**: Fase 1.

## Fase 3 - API de política + controlador simulado

Las tres superficies del `design.md` §3 son deployments separados: ingesta (MQTT), api de
aplicación (REST para el front) y api de política (la única que el campo consulta).

- [ ] API de política: la nube entrega umbrales, ventanas y duración máxima. **Nunca** un comando de
      abrir o cerrar una válvula.
- [ ] Controlador simulado: decide con lo que mide, guarda la última política y su fecha, y a los N
      días sin política nueva cae al programa conservador registrándolo.
- [x] `riego_evento` con la **condicion** que causo la decision, la politica vigente, y **litros medidos y estimados en columnas SEPARADAS**. Mas `politica_riego` -- validada en la base, no en la API -- `metodo_de_riego` y `tramo`. **11/11 en `cambios/riego-de-precision/scripts/verify-schema.sh`**, con control negativo.
- [ ] `verify-autonomy.sh` (todavia no existe): se corta el enlace y sigue regando; pasan N días y cae al
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
- [ ] `verify-ndvi.sh` (todavia no existe): un polígono nuevo trae su serie.

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
