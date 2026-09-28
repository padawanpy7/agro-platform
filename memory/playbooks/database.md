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
