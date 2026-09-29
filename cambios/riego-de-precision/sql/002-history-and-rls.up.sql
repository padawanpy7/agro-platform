-- 002 -- History tables for every mutable table, plus RLS, grants and seed catalogs.
--
-- WHAT DATA STAYS AND WHAT IS LOST (mandatory comment, AGENTS.md rule 7):
--   Creates. Nothing is converted.
--   From here on, EVERY UPDATE AND DELETE on a mutable table leaves a row in `<table>_history`
--   with the values as they were BEFORE the change. That row is never edited and never deleted --
--   a history you can rewrite is not a history.
--
-- WHY NOT EVERY TABLE, and this is the part worth reading:
--   `measurement` and `irrigation_event` get NO history table. They are append-only and huge.
--   Auditing them would DOUBLE the biggest table in the system to record changes that must never
--   happen. So instead of auditing the change, the change is FORBIDDEN: UPDATE and DELETE are
--   revoked from the application role. For an append-only table that is strictly stronger than an
--   audit trail -- an audit tells you afterwards that someone rewrote history; a revoked grant
--   means they could not.

begin;

-- =============================================================================================
-- 1. Who did it
-- =============================================================================================
-- The application sets `app.user_id` in the same transaction where it sets `app.tenant_id`.
-- NULL means "not set" and is recorded as NULL -- never as a made-up user.
create or replace function current_app_user() returns uuid
language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

-- =============================================================================================
-- 2. The generic history trigger
-- =============================================================================================
-- ONE function for every table. The alternative -- one hand-written trigger per table -- is the
-- same logic copied fifteen times, which drifts the first time someone fixes a bug in only one.
create or replace function record_history() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  hist_table text := tg_table_name || '_history';
  old_row jsonb := to_jsonb(old);
begin
  execute format(
    'insert into %I (operation, changed_at, changed_by, row_data) values ($1, now(), $2, $3)',
    hist_table)
  using tg_op, current_app_user(), old_row;
  return null;   -- AFTER trigger: the return value is ignored.
end $$;

-- =============================================================================================
-- 3. One history table per mutable table
-- =============================================================================================
-- Generated in a loop, not written fifteen times, for the same reason as the shared trigger.
-- `row_data` is jsonb: the full row as it was. Typed columns per table would be fifteen more
-- tables to keep in sync with every future ALTER, and history that fails to record because a
-- column was added is worse than history in jsonb.
do $$
declare t text;
begin
  foreach t in array array[
    'client','module','client_module',
    'app_user','credential','membership','role','role_permission','membership_role',
    'resource','action','permission',
    'farm','plot','device','device_type',
    'unit','quantity','calibration',
    'irrigation_method','irrigation_policy','pipe','pipe_type','irrigation_decision'
  ] loop
    execute format($h$
      create table %I (
        id          bigint primary key generated always as identity,
        operation   text not null check (operation in ('UPDATE','DELETE')),
        changed_at  timestamptz not null default now(),
        changed_by  uuid references app_user(id),
        row_data    jsonb not null
      )$h$, t || '_history');

    execute format('create index %I on %I (changed_at desc)', t || '_history_time', t || '_history');

    execute format($g$
      create trigger %I after update or delete on %I
      for each row execute function record_history()
    $g$, t || '_history_trg', t);
  end loop;
end $$;

-- A history row is never edited and never removed. This is not a convention: the application role
-- is simply not granted the privilege.
do $$
declare t text;
begin
  for t in select tablename from pg_tables
           where schemaname='public' and tablename like '%\_history' loop
    execute format('revoke update, delete on %I from agro_app, agro_control', t);
  end loop;
end $$;

-- =============================================================================================
-- 4. RLS
-- =============================================================================================
-- Same pattern everywhere: ENABLE + FORCE + a policy with explicit USING **and** WITH CHECK, plus
-- the live-client condition. Without the `exists`, a token carrying the tenant_id of a deleted
-- client still gets in, because as far as the database is concerned that tenant exists.
do $$
declare t text;
begin
  foreach t in array array[
    'client_module','membership','farm','plot','device','calibration','measurement',
    'irrigation_policy','pipe','irrigation_event'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force  row level security', t);
    execute format($f$
      create policy %I on %I for all to agro_app
        using (tenant_id = current_setting('app.tenant_id', true)::uuid
               and exists (select 1 from client c where c.id = tenant_id and c.deleted_at is null))
        with check (tenant_id = current_setting('app.tenant_id', true)::uuid
               and exists (select 1 from client c where c.id = tenant_id and c.deleted_at is null))
    $f$, t || '_own', t);
  end loop;
end $$;

-- `client` is keyed BY the tenant, so its policy compares `id`, not `tenant_id`.
alter table client enable row level security;
alter table client force  row level security;
create policy client_own on client for all to agro_app
  using      (id = current_setting('app.tenant_id', true)::uuid and deleted_at is null)
  with check (id = current_setting('app.tenant_id', true)::uuid and deleted_at is null);

-- `role` needs TWO policies, and one would not do. Global templates carry tenant_id IS NULL: a
-- single permissive policy that let them be read would also let every client WRITE the templates
-- of all the others.
alter table role enable row level security;
alter table role force  row level security;
create policy role_read on role for select to agro_app
  using (tenant_id is null
         or tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy role_write on role as restrictive for all to agro_app
  using      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================================
-- 5. Grants
-- =============================================================================================
grant usage on schema public to agro_app, agro_control;

-- Read-only catalogs for the product.
grant select on module, resource, action, permission, device_type, unit, quantity,
                irrigation_method, pipe_type, irrigation_decision to agro_app;

-- Tenant data. NEVER delete: nothing with history is physically removed in this system.
grant select, insert, update on client, client_module, membership, membership_role, role,
                role_permission, farm, plot, device, calibration,
                irrigation_policy, pipe to agro_app;

-- APPEND-ONLY. No update, no delete -- which is why they need no history table.
grant select, insert on measurement, irrigation_event to agro_app;

-- Provisioning only. `agro_control` never touches tenant DATA.
grant select, insert, update on client, module, client_module to agro_control;

-- Reading history is allowed; writing it is not (revoked above).
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname='public' and tablename like '%\_history' loop
    execute format('grant select on %I to agro_app', t);
  end loop;
end $$;

-- =============================================================================================
-- 6. Seed catalogs -- code in English, name in Spanish (it reaches the screen)
-- =============================================================================================
insert into module (code, name) values
  ('irrigation','Riego por goteo'), ('weather','Estación meteorológica'),
  ('satellite','Pasturas e índices por satélite'), ('pests','Trampa de plagas'),
  ('hydroponics','Hidroponía'), ('livestock','Ganadería'), ('core','Núcleo')
on conflict (code) do nothing;

insert into action (code) values
  ('read'),('write'),('create'),('delete'),('execute'),('approve'),('export')
on conflict (code) do nothing;

insert into resource (code, module_code) values
  ('farm','core'), ('plot','core'), ('device','core'), ('measurement','core'),
  ('calibration','core'), ('app_user','core'), ('role','core'),
  ('irrigation_policy','irrigation'), ('irrigation_event','irrigation'), ('pipe','irrigation')
on conflict (code) do nothing;

insert into permission (resource_code, action_code)
  select r.code, a.code from resource r cross join action a
  where (r.code, a.code) in (
    ('farm','read'),('farm','write'),('plot','read'),('plot','write'),
    ('device','read'),('device','write'),('measurement','read'),('measurement','export'),
    ('calibration','read'),('calibration','write'),('app_user','read'),('app_user','create'),
    ('role','read'),('role','write'),
    ('irrigation_policy','read'),('irrigation_policy','write'),('irrigation_policy','approve'),
    ('irrigation_event','read'),('irrigation_event','execute'),('pipe','read'),('pipe','write'))
on conflict do nothing;

insert into device_type (code, name) values
  ('soil_sensor','Sensor de suelo'), ('weather_station','Estación meteorológica'),
  ('controller','Controlador'), ('flow_meter','Caudalímetro'), ('pest_trap','Trampa de plagas'),
  ('solution_sensor','Sensor de solución'), ('scale','Balanza'), ('tag_reader','Lector de caravana')
on conflict (code) do nothing;

insert into unit (code, name) values
  ('percent','%'), ('celsius','°C'), ('mm','mm'), ('kmh','km/h'), ('lpm','L/min'),
  ('litre','L'), ('ms_cm','mS/cm'), ('ph','pH'), ('cm','cm'), ('kg','kg')
on conflict (code) do nothing;

insert into quantity (code, name, unit_code, min_value, max_value) values
  ('soil_moisture','Humedad del suelo','percent',0,100),
  ('soil_temperature','Temperatura del suelo','celsius',-10,70),
  ('air_temperature','Temperatura del aire','celsius',-15,55),
  ('air_humidity','Humedad del aire','percent',0,100),
  ('rainfall','Lluvia acumulada','mm',0,null),
  ('wind_speed','Velocidad del viento','kmh',0,250),
  ('flow_rate','Caudal','lpm',0,null),
  ('applied_volume','Volumen aplicado','litre',0,null),
  ('solution_ec','Conductividad de la solución','ms_cm',0,10),
  ('solution_ph','pH de la solución','ph',0,14),
  ('solution_temperature','Temperatura de la solución','celsius',0,50),
  ('solution_level','Nivel de la solución','cm',0,null),
  ('animal_weight','Peso del animal','kg',0,1500),
  ('water_intake','Agua tomada','litre',0,null),
  ('reservoir_level','Nivel del reservorio','cm',0,null)
on conflict (code) do nothing;

insert into irrigation_method (code, name) values
  ('drip','Goteo'), ('flood','Inundación'), ('sprinkler','Aspersión'),
  ('micro_sprinkler','Microaspersión'), ('furrow','Surco')
on conflict (code) do nothing;

insert into pipe_type (code, name) values
  ('main','Tubería principal'), ('manifold','Portalaterales'),
  ('lateral','Lateral'), ('drip_tape','Cinta de goteo')
on conflict (code) do nothing;

insert into irrigation_decision (code, name) values
  ('irrigate','Regar'), ('hold','No regar'),
  ('fallback','Programa conservador'), ('manual_stop','Corte manual')
on conflict (code) do nothing;

commit;
