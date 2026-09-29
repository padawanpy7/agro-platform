-- 001 -- Core schema: tenancy, access, geography, measurement, irrigation, and history.
--
-- WHAT DATA STAYS AND WHAT IS LOST (mandatory comment, AGENTS.md rule 7):
--   Creates. Nothing to convert: it replaces the Spanish-named draft of 29/09 that never held a
--   single row of real data. Renaming 13 tables cost an afternoon today; with data inside it would
--   have cost a rewrite. That is the whole reason it was done now.
--
--   IRREVERSIBLE DECISIONS INTRODUCED HERE:
--   1. `measurement` is NARROW -- one row per (device, quantity, instant). Going wide later means
--      rewriting every row.
--   2. `raw_value` NOT NULL, `calibrated_value` nullable. The other way round ties the history to
--      the formula of the day it was stored, and a wrong formula becomes unrecoverable.
--   3. `measured_at` and `received_at` SEPARATE. With one you must either lie about when it was
--      measured or lose how long it took to arrive.
--   4. `double precision`, never `real`, on every measured value.
--   5. SRID 4326 as it comes from GPS and Sentinel-2. Projecting on write loses the original.
--   6. `client.id` is the tenant_id of the whole system, and it is a uuid because it travels
--      outside the database -- token, logs, URL -- where a sequential integer leaks how many
--      clients exist and in what order they arrived.
--
-- LANGUAGE (owner's decision, 29/09): schema and code in English. Only user-facing TEXT is in
-- Spanish, and it lives in catalog `name` columns and in the front's translation files -- never in
-- an identifier. See docs/reglas-del-front.md.

begin;

create extension if not exists pgcrypto;
create extension if not exists postgis;
create extension if not exists timescaledb;

-- =============================================================================================
-- ROLES
-- =============================================================================================
-- Three, and the difference is security, not tidiness:
--   agro_admin    owns the tables, runs migrations. No application uses it.
--   agro_app      the product. ALWAYS with app.tenant_id set. RLS boxes it in.
--   agro_control  tenant provisioning, consumed by the owner's management app over the API.
--                 It exists because CREATING a client is precisely what cannot be done from
--                 inside a tenant: there is no tenant yet.
do $$
begin
  if not exists (select 1 from pg_roles where rolname='agro_app') then create role agro_app nologin; end if;
  if not exists (select 1 from pg_roles where rolname='agro_control') then create role agro_control nologin; end if;
end $$;

-- =============================================================================================
-- 1. TENANCY
-- =============================================================================================
create table client (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now(),
  -- Soft delete, never DELETE: the owner keeps the data for ML after a client leaves.
  deleted_at  timestamptz,
  constraint client_name_not_blank check (length(trim(name)) > 0)
);
create unique index client_name_live_unique on client (lower(name)) where deleted_at is null;

create table module (
  code        text primary key,
  name        text not null,          -- Spanish: this one reaches the screen.
  created_at  timestamptz not null default now(),
  constraint module_code_shape check (code ~ '^[a-z][a-z0-9_]*$')
);

-- The column is `tenant_id` and not `client_id` even though it points at `client`, and the reason
-- is not style: every RLS policy in this schema compares `tenant_id`. One table naming the same
-- thing differently means one policy written by hand, which is the one that will be wrong.
create table client_module (
  tenant_id    uuid not null references client(id) on delete restrict,
  module_code  text not null references module(code) on update cascade on delete restrict,
  granted_at   timestamptz not null default now(),
  revoked_at   timestamptz,
  primary key (tenant_id, module_code)
);

-- =============================================================================================
-- 2. ACCESS -- identity is global, membership is per tenant
-- =============================================================================================
-- `app_user` carries NO tenant_id and NO RLS. If it did, the same person working for two clients
-- would be two people, with two passwords and two audit trails.
create table app_user (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  name        text not null,
  status      text not null default 'active',
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint app_user_status_valid check (status in ('active','suspended','deleted'))
);
create unique index app_user_email_unique on app_user (lower(email));

create table credential (
  id          bigint primary key generated always as identity,
  user_id     uuid not null references app_user(id) on delete restrict,
  -- Argon2id. Never plaintext, never reversibly encrypted. The column holds the ENCODED hash,
  -- which carries its own parameters -- so raising the cost later does not invalidate old hashes.
  password_hash text not null,
  created_at  timestamptz not null default now(),
  -- History is not edited: a rotated credential is closed, not overwritten.
  retired_at  timestamptz
);
create unique index credential_one_active on credential (user_id) where retired_at is null;

create table membership (
  id           bigint primary key generated always as identity,
  tenant_id    uuid not null references client(id) on delete restrict,
  user_id      uuid not null references app_user(id) on delete restrict,
  status       text not null default 'active',
  expires_at   timestamptz,
  created_at   timestamptz not null default now(),
  unique (tenant_id, user_id),
  constraint membership_status_valid check (status in ('active','suspended','revoked'))
);

-- Permission = (resource, action), BOTH catalogs. No role is hardcoded anywhere in the code.
create table resource (
  code         text primary key,
  module_code  text not null references module(code) on update cascade on delete restrict,
  constraint resource_code_shape check (code ~ '^[a-z][a-z0-9_]*$')
);
create table action (
  code text primary key,
  constraint action_code_shape check (code ~ '^[a-z][a-z0-9_]*$')
);
create table permission (
  id             bigint primary key generated always as identity,
  resource_code  text not null references resource(code) on update cascade on delete restrict,
  action_code    text not null references action(code)   on update cascade on delete restrict,
  -- The API reasons with 'plot:read'. Generated, so it can never drift from its two parts.
  code           text generated always as (resource_code || ':' || action_code) stored,
  unique (resource_code, action_code),
  unique (code)
);

create table role (
  id          bigint primary key generated always as identity,
  -- NULL tenant_id = global template, cloned into a tenant. See the two-policy note in the RLS
  -- section: a single policy would also let every client WRITE the shared templates.
  tenant_id   uuid references client(id) on delete restrict,
  code        text not null,
  name        text not null,          -- Spanish: reaches the admin screen.
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
-- NULLS NOT DISTINCT: without it, two global roles could share a code, because NULL <> NULL.
create unique index role_code_unique on role (tenant_id, lower(code)) nulls not distinct;

create table role_permission (
  role_id       bigint not null references role(id) on delete restrict,
  permission_id bigint not null references permission(id) on delete restrict,
  primary key (role_id, permission_id)
);
create table membership_role (
  membership_id bigint not null references membership(id) on delete restrict,
  role_id       bigint not null references role(id) on delete restrict,
  primary key (membership_id, role_id)
);

-- =============================================================================================
-- 3. GEOGRAPHY
-- =============================================================================================
create table farm (
  id          bigint primary key generated always as identity,
  tenant_id   uuid not null references client(id) on delete restrict,
  name        text not null,
  -- The outer boundary. THE SUM OF THE PLOTS IS NOT THIS: woodland, tracks, the homestead and the
  -- reservoir sit in between, are real land, and belong to no plot.
  geom        geometry(Polygon, 4326),
  geom_is_draft   boolean not null default true,
  geom_version    integer not null default 1,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint farm_name_not_blank check (length(trim(name)) > 0)
);
create index farm_geom_gist on farm using gist (geom);

create table plot (
  id          bigint primary key generated always as identity,
  tenant_id   uuid not null references client(id) on delete restrict,
  farm_id     bigint not null references farm(id) on delete restrict,
  name        text not null,
  geom        geometry(Polygon, 4326) not null,
  geom_is_draft   boolean not null default true,
  geom_version    integer not null default 1,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint plot_name_not_blank check (length(trim(name)) > 0)
);
create index plot_geom_gist on plot using gist (geom);

-- Device types are a CATALOG, not a CHECK: a new sensor model is a business event, not a code
-- change. This is the line the owner asked for -- nothing hardcoded that grows with the product.
create table device_type (
  code text primary key,
  name text not null,
  constraint device_type_code_shape check (code ~ '^[a-z][a-z0-9_]*$')
);

create table device (
  id            bigint primary key generated always as identity,
  tenant_id     uuid not null references client(id) on delete restrict,
  name          text not null,
  type_code     text not null references device_type(code) on update cascade on delete restrict,
  -- NO plot_id: membership is NOT declared by hand, it comes from ST_Contains. So correcting a
  -- plot boundary recalculates everything on its own.
  location      geometry(Point, 4326),
  installed_at  timestamptz not null default now(),
  removed_at    timestamptz
);
create index device_location_gist on device using gist (location);

-- =============================================================================================
-- 4. MEASUREMENT
-- =============================================================================================
create table unit (
  code text primary key,
  name text not null
);

-- THE table that makes `measurement` narrow. Adding EC, animal weight or rice flood depth is ONE
-- ROW here, never a migration.
create table quantity (
  code       text primary key,
  name       text not null,          -- Spanish: reaches the screen.
  unit_code  text not null references unit(code) on update cascade on delete restrict,
  min_value  double precision,
  max_value  double precision,
  constraint quantity_code_shape check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint quantity_range_sane check (min_value is null or max_value is null or min_value < max_value)
);

create table calibration (
  id            bigint primary key generated always as identity,
  tenant_id     uuid not null references client(id) on delete restrict,
  device_id     bigint not null references device(id) on delete restrict,
  quantity_code text not null references quantity(code) on update cascade on delete restrict,
  formula       text not null,
  -- NOT NULL on purpose: a calibration number without provenance is not a number, it is a
  -- superstition (AGENTS.md rule 7, this project's explicit exception).
  provenance    text not null,
  valid_from    timestamptz not null default now(),
  valid_to      timestamptz,
  constraint calibration_provenance_not_blank check (length(trim(provenance)) > 0),
  constraint calibration_validity_sane check (valid_to is null or valid_to > valid_from)
);
create unique index calibration_one_active on calibration (device_id, quantity_code) where valid_to is null;

create table measurement (
  tenant_id        uuid not null references client(id) on delete restrict,
  device_id        bigint not null references device(id) on delete restrict,
  quantity_code    text not null references quantity(code) on update cascade on delete restrict,
  measured_at      timestamptz not null,
  received_at      timestamptz not null default now(),
  raw_value        double precision not null,
  calibrated_value double precision,
  calibration_id   bigint references calibration(id) on delete restrict,
  -- Nullable: a device without GPS does not lie by claiming the plot centroid. NULL means
  -- "unknown" and is never backfilled.
  location         geometry(Point, 4326),
  primary key (device_id, quantity_code, measured_at)
);
select create_hypertable('measurement','measured_at', chunk_time_interval => interval '7 days');
create index measurement_tenant_time on measurement (tenant_id, measured_at desc);

-- =============================================================================================
-- 5. IRRIGATION
-- =============================================================================================
create table irrigation_method (
  code text primary key,
  name text not null,
  constraint irrigation_method_code_shape check (code ~ '^[a-z][a-z0-9_]*$')
);

create table irrigation_policy (
  id             bigint primary key generated always as identity,
  tenant_id      uuid not null references client(id) on delete restrict,
  plot_id        bigint not null references plot(id) on delete restrict,
  method_code    text not null references irrigation_method(code) on update cascade on delete restrict,
  -- jsonb because the SHAPE depends on the method: drip wants thresholds and a window, rice wants
  -- a target flood depth and dates. It is CONFIGURATION, not measurement -- the dataset is
  -- `measurement` and `irrigation_event`, and those never change shape.
  parameters     jsonb not null,
  days_to_fallback integer not null default 7,
  valid_from     timestamptz not null default now(),
  valid_to       timestamptz,
  created_by     uuid references app_user(id),
  constraint irrigation_policy_validity_sane check (valid_to is null or valid_to > valid_from),
  constraint irrigation_policy_days_sane check (days_to_fallback between 1 and 60),
  -- Validated IN THE DATABASE and not "in the API": a malformed policy reaches the field and
  -- decides irrigations.
  constraint irrigation_policy_parameters_by_method check (
    case method_code
      when 'drip' then parameters ?& array['start_threshold','stop_threshold','window_from','window_to','max_minutes']
      when 'flood' then parameters ?& array['target_depth_cm','water_in','water_out']
      else true
    end
  )
);
create unique index irrigation_policy_one_active on irrigation_policy (plot_id) where valid_to is null;

create table pipe_type (
  code text primary key,
  name text not null
);

create table pipe (
  id            bigint primary key generated always as identity,
  tenant_id     uuid not null references client(id) on delete restrict,
  plot_id       bigint references plot(id) on delete restrict,
  parent_id     bigint references pipe(id) on delete restrict,
  type_code     text not null references pipe_type(code) on update cascade on delete restrict,
  diameter_mm   double precision,
  length_m      double precision,
  -- OPTIONAL: topology is what lets you reason and is what cannot be reconstructed later, because
  -- it lives in the head of whoever installed it. The line can be walked with a phone any day.
  geom          geometry(LineString, 4326),
  installed_at  timestamptz not null default now(),
  -- Drip tape is a CONSUMABLE. Retiring instead of deleting is what yields, for free, a number
  -- nobody has today: how long a tape actually lasts.
  removed_at    timestamptz,
  constraint pipe_length_positive check (length_m is null or length_m > 0),
  constraint pipe_not_its_own_parent check (parent_id is distinct from id)
);
create index pipe_geom_gist on pipe using gist (geom);

create table irrigation_decision (
  code text primary key,
  name text not null
);

create table irrigation_event (
  tenant_id         uuid not null references client(id) on delete restrict,
  plot_id           bigint not null references plot(id) on delete restrict,
  device_id         bigint references device(id) on delete restrict,
  decided_at        timestamptz not null,
  recorded_at       timestamptz not null default now(),
  -- WHAT IT READ, not only what it decided. Without this the history describes but does not
  -- explain, and the condition of that moment cannot be rebuilt afterwards.
  conditions        jsonb not null,
  decision_code     text not null references irrigation_decision(code) on update cascade on delete restrict,
  policy_id         bigint references irrigation_policy(id) on delete restrict,
  reason            text,
  effective_minutes double precision,
  -- TWO columns, never one. If the estimate were ever written into the measured column, in two
  -- years nobody could tell a flow meter from an arithmetic guess.
  measured_litres   double precision,
  estimated_litres  double precision,
  constraint irrigation_event_minutes_sane check (effective_minutes is null or effective_minutes >= 0),
  constraint irrigation_event_litres_sane check (
    (measured_litres is null or measured_litres >= 0) and
    (estimated_litres is null or estimated_litres >= 0)),
  primary key (plot_id, decided_at)
);
select create_hypertable('irrigation_event','decided_at', chunk_time_interval => interval '30 days');
create index irrigation_event_tenant_time on irrigation_event (tenant_id, decided_at desc);

commit;
