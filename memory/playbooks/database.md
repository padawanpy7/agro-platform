# Playbook database

Arranca VACIO a proposito: los hechos del repo de origen eran de Oracle y APEX.
Cada linea que entre aca tiene que salir de algo que se rompio en ESTE proyecto.

## RLS (de `docs/usuarios-roles-permisos.md`, 28/09/2026)

- Toda policy de tenant se escribe con `USING` **Y** `WITH CHECK`, aunque en `FOR ALL` Postgres use
  `USING` como `WITH CHECK` solo: ese default **se evapora** al partir la policy por comando.
- `ENABLE` + `FORCE ROW LEVEL SECURITY` siempre. El rol de app no es dueño ni superusuario.
- Policy que mezcla filas globales (`tenant_id IS NULL`) con propias: **partirla** en `FOR SELECT`
  (permite NULL) y `FOR ALL` (solo el tenant). Una sola tambien deja **escribir** lo global.
- Un solo tenant activo por transaccion (`SET LOCAL app.tenant_id`). Nunca una lista de tenants en
  el GUC: convierte el aislamiento en un parseo de string por fila.
- Una funcion `SECURITY DEFINER` saltea RLS: re-filtra por tenant adentro o es un tunel.
- Las tablas SIN tenant (identidad, catalogos) son lo unico que el motor no cubre: no se exponen
  por API directa.
- Test en rojo con dos tenants: A no **lee** lo de B **y** A no puede **escribir** una fila de B.

## Tipos, claves, borrado

- `timestamptz` siempre, nunca `timestamp`. Sufijo `_en` (`creado_en`, `vence_en`).
- `double precision` en todo valor medido; `real` nunca (la perdida es irreversible).
- PK `bigint generated always as identity`, salvo ids que viajan fuera de la base (tenant, usuario,
  sesion): `uuid`.
- PK de una tabla candidata a hypertable **incluye la columna de tiempo desde el dia uno**.
- Lo que crece con el producto (recursos, acciones, modulos, magnitudes) va a **tabla catalogo**
  con `codigo text` y FK `ON UPDATE CASCADE`. Lo que define el nucleo va a `CHECK` cerrado.
- `ON DELETE RESTRICT` por default. `CASCADE` solo en tablas puente puras. **Nunca** `CASCADE` hacia
  historia o auditoria.
- Historia no se edita ni se borra: se cierra la fila vigente y se inserta otra (`calibracion`,
  `credencial`).
- `UNIQUE` sobre columnas nullable necesita `NULLS NOT DISTINCT`, si no admite duplicados.

## Indices, secretos, auditoria

- Ningun indice sin un query escrito que lo justifique. Parcial (`WHERE ... IS NULL`) para lo vivo.
- Nunca un secreto reversible: contraseña Argon2id, token por sha256. Lo que hay que poder leer
  (TOTP) va cifrado con clave FUERA de la base.
- Al rol de app: `INSERT`/`SELECT` en auditoria, `UPDATE`/`DELETE` revocados.

## Lo que RLS no cubre, y se descubre tarde (29/09/2026, migraciones 003 y 007)

- **Una tabla puente no tiene `tenant_id`, asi que el bucle que activa RLS no la toca.** La tenencia
  sale del PADRE: `using (exists (select 1 from <padre> p where p.id = <fk> and p.tenant_id = ...))`.
  Medido en `role_permission` y `membership_role`: con un token de A se leian **y escribian** los
  permisos de los roles de B.
- **El rol de app tiene que poder CONECTARSE.** Tres roles quedaron `NOLOGIN`, asi que lo unico que
  abria sesion era el dueño de las tablas -- que en el contenedor es **superusuario, y un
  superusuario NO esta sujeto a RLS**. Todos los tests seguian verdes. Se verifica con
  `rolcanlogin` y con `not (rolsuper or rolbypassrls)`, no leyendo la cadena de conexion.
- **`FORCE` solo muerde si el rol no es dueño de la tabla**: verificar `tableowner`.
- **Un comentario no es un permiso.** "La calibracion se cierra, no se edita" convivia con
  `GRANT UPDATE` sobre la tabla entera. Postgres otorga **por columna**: `grant update (valid_to)`.
- **Append-only vence a auditar**: en una tabla que no debe cambiar, el privilegio revocado es mas
  fuerte que una tabla de historia -- la auditoria cuenta despues que alguien reescribio.

## Chequeos de esquema: diferencias de conjunto, nunca cuentas (29/09/2026)

- `"11 tablas con RLS"` y `"24 de historia"` se pusieron en rojo al crecer el esquema **sin que nada
  estuviera mal**. Se reescriben como *cuantas tablas que DEBERIAN tenerlo no lo tienen*: la
  respuesta correcta es **0 para siempre** y agregar una tabla no puede hacerlas mentir.
- Excluir las tablas de una **extension** por `pg_depend` (`deptype='e'`), no por nombre: PostGIS
  instala `spatial_ref_sys` en `public`.
- Un chequeo negativo ("B no ve lo de A") pasa igual si la policy no deja ver a **nadie**. Va
  siempre en par con su control positivo.
- Un `CHECK` de "al menos un sujeto" se **reemplaza** al agregar columnas, no se agrega otro: dos
  checks se combinan con AND y el nuevo caso falla el viejo.
- Una restriccion de tabla no admite expresiones (`unique (x, lower(y))`): va como indice unico.
- Las bajadas se **corren**: subida -> bajada -> subida, y el verificador en verde. Una bajada que
  nadie ejecuta es un archivo que dice ser un rollback.
