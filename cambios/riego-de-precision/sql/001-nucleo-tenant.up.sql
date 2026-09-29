-- 001 -- El nucleo del multi-cliente: cliente, modulos, y la RLS que los aisla.
--
-- QUE DATO QUEDA Y QUE SE PIERDE (comentario obligatorio, AGENTS.md regla 7):
--   Esta migracion CREA. No transforma ni borra nada: antes de ella la base esta vacia.
--   No hay perdida de precision posible porque no hay dato previo que convertir.
--   Lo unico irreversible que introduce es el MODELO: `cliente.id` pasa a ser el `tenant_id` de
--   todo el sistema, y eso no se cambia despues sin reescribir cada tabla. Se elige `uuid` y no
--   `bigint` a proposito: el id del tenant VIAJA FUERA de la base -- va en el token, en los logs y
--   en la URL -- y un entero secuencial ahi filtra cuantos clientes hay y en que orden entraron.
--
-- ALCANCE: es la rebanada mas chica que ejercita el nucleo entero, por decision del dueño --
-- "lo primero son las APIs de control... ABM de cliente y ABM para asignar modulos". Las otras
-- nueve tablas del design.md entran en 002.

begin;

-- ---------------------------------------------------------------------------------------------
-- 1. Extensiones
-- ---------------------------------------------------------------------------------------------
-- `pgcrypto` por `gen_random_uuid()`. PostGIS y TimescaleDB no hacen falta todavia: entran con
-- `parcela` y `medicion` en la 002. Se crean igual aca para que una base nueva quede completa y
-- la 002 no dependa de que alguien se acuerde.
create extension if not exists pgcrypto;
create extension if not exists postgis;
create extension if not exists timescaledb;

-- ---------------------------------------------------------------------------------------------
-- 2. Roles
-- ---------------------------------------------------------------------------------------------
-- TRES roles y no uno, y la diferencia es de seguridad, no de prolijidad:
--
--   agro_admin    dueño de las tablas. Corre migraciones. NO lo usa ninguna aplicacion.
--   agro_app      el producto. SIEMPRE con `app.tenant_id` puesto. La RLS lo encierra.
--   agro_control  el alta de clientes, que la app de gestion del dueño consume por API.
--                 Existe porque CREAR un cliente es justamente lo que no se puede hacer desde
--                 adentro de un tenant: no hay tenant todavia. Si el producto y el alta
--                 compartieran rol, el producto podria listar todos los clientes.
--
-- El dueño de una tabla SALTEA su propia RLS por default (NOFORCE). Por eso `agro_app` no es
-- dueño de nada y ademas va `FORCE ROW LEVEL SECURITY` mas abajo: sin las dos cosas, la RLS es
-- decorativa.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'agro_app') then
    create role agro_app nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'agro_control') then
    create role agro_control nologin;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 3. cliente -- el TENANT
-- ---------------------------------------------------------------------------------------------
create table cliente (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  creado_en   timestamptz not null default now(),
  -- BAJA LOGICA, nunca DELETE. Decision del dueño: "si un cliente se da de baja yo puedo seguir
  -- usando los datos recopilados para el ML". Un DELETE se llevaria por delante anios de serie
  -- que no se pueden reconstruir.
  baja_en     timestamptz,
  constraint cliente_nombre_no_vacio check (length(trim(nombre)) > 0)
);

comment on table cliente is
  'El tenant. cliente.id ES el tenant_id de todo el sistema. Baja logica: baja_en, nunca DELETE.';

-- Parcial: solo los vivos. Un cliente dado de baja puede repetir nombre con uno nuevo sin que el
-- indice lo impida, y la busqueda del alta solo mira los vivos.
create unique index cliente_nombre_vivo_unico
  on cliente (lower(nombre)) where baja_en is null;

-- ---------------------------------------------------------------------------------------------
-- 4. modulo y tenant_modulo -- que contrato cada cliente
-- ---------------------------------------------------------------------------------------------
-- `modulo` es catalogo GLOBAL: no lleva tenant_id y no lleva RLS. Es la lista de lo que el
-- producto sabe hacer, igual para todos. Un modulo nuevo -ganaderia, hidroponia- es un INSERT.
create table modulo (
  codigo      text primary key,
  nombre      text not null,
  creado_en   timestamptz not null default now(),
  constraint modulo_codigo_forma check (codigo ~ '^[a-z][a-z0-9_]*$')
);

comment on table modulo is
  'Catalogo global de modulos. Sin tenant_id y sin RLS a proposito: es la misma lista para todos.';

create table tenant_modulo (
  tenant_id      uuid not null references cliente(id) on delete restrict,
  modulo_codigo  text not null references modulo(codigo) on update cascade on delete restrict,
  alta_en        timestamptz not null default now(),
  -- Tambien logica: que un cliente haya dejado de pagar un modulo no borra que lo tuvo, y el
  -- historico de mediciones de ese modulo sigue siendo suyo.
  baja_en        timestamptz,
  primary key (tenant_id, modulo_codigo)
);

comment on table tenant_modulo is
  'Que modulos tiene contratados cada cliente. La escribe la app de gestion; el producto la lee.';

-- ---------------------------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------------------------
-- LAS DOS MITADES, y la segunda es la que casi siempre falta:
--
--   USING       que filas VE
--   WITH CHECK  que filas puede ESCRIBIR
--
-- En una policy FOR ALL, PostgreSQL usa `USING` tambien como `WITH CHECK` si se omite -- o sea que
-- omitirlo FUNCIONA hoy. Se escribe igual, explicito, por tres razones: la proteccion seria
-- IMPLICITA y se evapora el dia que alguien parta la policy por comando; quien lee no puede saber
-- si la omision fue deliberada; y las dos expresiones no siempre coinciden.
--
-- Y VA LA CONDICION DE VIVO: sin el `exists`, un token con el tenant_id de un cliente dado de baja
-- entra igual, porque para la base ese tenant existe. La API tampoco debe emitirle token -- pero
-- el aislamiento lo hace cumplir el motor, no la capa de servicio.

alter table cliente enable row level security;
alter table cliente force  row level security;

create policy cliente_propio on cliente
  for all
  to agro_app
  using      (id = current_setting('app.tenant_id', true)::uuid and baja_en is null)
  with check (id = current_setting('app.tenant_id', true)::uuid and baja_en is null);

alter table tenant_modulo enable row level security;
alter table tenant_modulo force  row level security;

create policy tenant_modulo_propio on tenant_modulo
  for all
  to agro_app
  using (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    and exists (select 1 from cliente c where c.id = tenant_id and c.baja_en is null)
  )
  with check (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    and exists (select 1 from cliente c where c.id = tenant_id and c.baja_en is null)
  );

-- ---------------------------------------------------------------------------------------------
-- 6. Permisos
-- ---------------------------------------------------------------------------------------------
-- agro_app: lee y escribe lo suyo, encerrado por la RLS de arriba.
grant usage on schema public to agro_app;
grant select, insert, update on cliente, tenant_modulo to agro_app;
grant select on modulo to agro_app;
-- NUNCA delete: en este sistema no hay borrado fisico de nada que tenga historia.

-- agro_control: da de alta clientes y les asigna modulos. NO tiene policy, y por eso la RLS no lo
-- filtra -- es deliberado: es el unico que puede ver el conjunto de clientes. A cambio NO tiene
-- acceso a ninguna tabla de DATOS (parcela, medicion): esas llegan en la 002 y no se le otorgan.
grant usage on schema public to agro_control;
grant select, insert, update on cliente, tenant_modulo, modulo to agro_control;

-- ---------------------------------------------------------------------------------------------
-- 7. Los modulos que existen hoy
-- ---------------------------------------------------------------------------------------------
insert into modulo (codigo, nombre) values
  ('riego',       'Riego por goteo'),
  ('clima',       'Estacion meteorologica'),
  ('satelite',    'Pasturas e indices por satelite'),
  ('plagas',      'Trampa de plagas'),
  ('hidroponia',  'Hidroponia'),
  ('ganaderia',   'Ganaderia')
on conflict (codigo) do nothing;

commit;
