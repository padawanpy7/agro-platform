-- 005 -- Livestock: the animal, where it was, what it ate, and how it ties into everything above.
--
-- WHAT DATA STAYS AND WHAT IS LOST (mandatory comment, AGENTS.md rule 7):
--   Creates five tables and three catalogs, and ADDS nullable columns to four existing tables
--   (`measurement`, `observation`, `treatment`, `photo`). No data is converted and no column is
--   dropped or narrowed; every added column is nullable, so every existing row stays valid.
--
-- WHY NOW, WHEN THE PRODUCT IS STILL ONLY AGRICULTURE:
--   Because it costs nothing today and cannot be done cheaply later. docs/preparado-para-ganaderia
--   is explicit: "no significa construirlo ahora, significa no cerrarse puertas hoy". The tables
--   are empty; the day they hold two years of a client's cattle, adding `measurement.animal_id`
--   means rewriting the biggest table in the system.
--
--   AND THE DESIGN TEST IT PASSES, which is the reason this file is short:
--   Weight is NOT a table here. It is a `measurement`, because `quantity` is a catalog -- exactly
--   the argument that settled the narrow-vs-wide question. Vaccines are NOT a table here: a
--   vaccine is a `treatment` with a product of kind 'vaccine', which is the same question
--   (what, how much, when, by whom) the plant side already answers. Sickness is NOT a table here:
--   it is an `observation` plus a `diagnosis`, the same two-table split. What is genuinely new is
--   only ONE thing: the animal is a MOVING object, and that is `animal_location`.

begin;

-- =============================================================================================
-- 1. CATALOGS
-- =============================================================================================
create table animal_species (
  code text primary key,
  name text not null,
  constraint animal_species_code_shape check (code ~ '^[a-z][a-z0-9_]*$')
);

create table breed (
  code         text primary key,
  species_code text not null references animal_species(code) on update cascade on delete restrict,
  name         text not null,
  constraint breed_code_shape check (code ~ '^[a-z][a-z0-9_]*$')
);

create table animal_status (
  code    text primary key,
  name    text not null,
  is_live boolean not null default true
);

-- How the position was obtained. It matters as much as the position: a GPS collar reading and a
-- "it went through the RFID gate at the water point" reading are both positions and are not the
-- same evidence -- one is continuous and approximate, the other discrete and certain.
create table location_source (
  code      text primary key,
  name      text not null,
  is_exact  boolean not null default false
);

-- =============================================================================================
-- 2. THE ANIMAL and the group
-- =============================================================================================
-- The group, not the animal, is the unit of MANAGEMENT: nobody moves one cow to another paddock,
-- they move the lot. The animal is the unit of MEASUREMENT. Both exist because they answer
-- different questions, and the join between them is dated because animals change groups.
create table animal_group (
  id          bigint primary key generated always as identity,
  tenant_id   uuid not null references client(id) on delete restrict,
  name        text not null,
  purpose     text,
  created_at  timestamptz not null default now(),
  closed_at   timestamptz,
  deleted_at  timestamptz,
  constraint animal_group_name_not_blank check (length(trim(name)) > 0)
);
create index animal_group_tenant on animal_group (tenant_id);

create table animal (
  id            bigint primary key generated always as identity,
  tenant_id     uuid not null references client(id) on delete restrict,
  -- The ear tag. Unique per tenant and NOT globally: two ranches legitimately have a cow number 7.
  tag           text not null,
  -- The RFID number, when there is one. Separate from `tag` because the visual tag and the
  -- electronic one are different identifiers that get replaced independently -- and the reader at
  -- the water point only ever sees this one.
  rfid          text,
  species_code  text not null references animal_species(code) on update cascade on delete restrict,
  breed_code    text references breed(code) on update cascade on delete restrict,
  sex           text,
  born_on       date,
  -- The mother, for the reproduction side. Self-reference, nullable, because the first generation
  -- of a herd bought at auction has no mother in the system.
  mother_id     bigint references animal(id) on delete restrict,
  status_code   text not null references animal_status(code) on update cascade on delete restrict,
  entered_at    timestamptz not null default now(),
  -- Leaving is DATED, never deleted: an animal that was sold or died is exactly the row a weight
  -- gain model needs, and the reason is the label.
  left_at       timestamptz,
  left_reason   text,
  created_at    timestamptz not null default now(),
  constraint animal_tag_not_blank check (length(trim(tag)) > 0),
  constraint animal_sex_valid check (sex is null or sex in ('female','male','castrated')),
  constraint animal_not_its_own_mother check (mother_id is distinct from id),
  constraint animal_left_sane check (left_at is null or left_at >= entered_at),
  constraint animal_left_has_reason check (left_at is null or left_reason is not null)
);
-- Unique INDEXes and not table constraints: `lower(tag)` is an expression and a table constraint
-- cannot hold one. The tag is unique PER TENANT and not globally -- two ranches legitimately have
-- a cow number 7.
create unique index animal_tag_unique on animal (tenant_id, lower(tag));
create unique index animal_rfid_unique on animal (tenant_id, rfid) where rfid is not null;
create index animal_tenant on animal (tenant_id, status_code);

create table animal_group_member (
  id         bigint primary key generated always as identity,
  tenant_id  uuid not null references client(id) on delete restrict,
  animal_id  bigint not null references animal(id) on delete restrict,
  group_id   bigint not null references animal_group(id) on delete restrict,
  joined_at  timestamptz not null default now(),
  left_at    timestamptz,
  constraint animal_group_member_dates_sane check (left_at is null or left_at > joined_at)
);
-- One live group per animal at a time. Two would mean a weight gain could be attributed to two
-- different paddocks, which is the attribution problem this whole project is built to avoid.
create unique index animal_group_member_one_live on animal_group_member (animal_id) where left_at is null;

-- =============================================================================================
-- 3. WHERE IT WAS -- the only genuinely new shape
-- =============================================================================================
-- APPEND-ONLY hypertable, like `measurement`, and for the same reason: it is a series, it is the
-- biggest table the livestock module will have, and a position that gets edited is not evidence.
-- `plot_id` is nullable because a reading from the water-point gate tells you WHICH GATE, not a
-- coordinate; and `location` is nullable because a GPS collar tells you a coordinate with no plot.
-- Whichever the source gives is stored, and the other is left NULL rather than invented.
create table animal_location (
  tenant_id     uuid not null references client(id) on delete restrict,
  animal_id     bigint not null references animal(id) on delete restrict,
  observed_at   timestamptz not null,
  received_at   timestamptz not null default now(),
  source_code   text not null references location_source(code) on update cascade on delete restrict,
  plot_id       bigint references plot(id) on delete restrict,
  location      geometry(Point, 4326),
  -- Which device saw it: the collar, or the reader at the gate. Nullable for a position typed in
  -- by a person, which is a legitimate and much worse datum, and should be distinguishable.
  device_id     bigint references device(id) on delete restrict,
  accuracy_m    double precision,
  primary key (animal_id, observed_at),
  constraint animal_location_has_a_where check (num_nonnulls(plot_id, location) >= 1),
  constraint animal_location_accuracy_sane check (accuracy_m is null or accuracy_m >= 0)
);
select create_hypertable('animal_location','observed_at', chunk_time_interval => interval '7 days');
create index animal_location_tenant_time on animal_location (tenant_id, observed_at desc);
create index animal_location_plot_time on animal_location (plot_id, observed_at desc);

-- =============================================================================================
-- 4. WHAT IT ATE
-- =============================================================================================
-- Offered to a GROUP or to an ANIMAL, and almost always the group -- which is honest: a trough
-- feeds the lot, and claiming to know what each individual ate from it would be a made-up number.
-- The feed is an `input_product` of kind 'feed': one catalog for everything that gets applied,
-- because the traceability question does not change between a vaccine and a ration.
create table ration (
  id               bigint primary key generated always as identity,
  tenant_id        uuid not null references client(id) on delete restrict,
  animal_group_id  bigint references animal_group(id) on delete restrict,
  animal_id        bigint references animal(id) on delete restrict,
  product_code     text not null references input_product(code) on update cascade on delete restrict,
  offered_at       timestamptz not null,
  received_at      timestamptz not null default now(),
  quantity_kg      double precision not null,
  -- What was left over. Offered minus refused is what was actually eaten, and without the second
  -- number the first one is an intention rather than a consumption.
  refused_kg       double precision,
  recorded_by      uuid references app_user(id) on delete restrict,
  constraint ration_has_a_subject check (num_nonnulls(animal_group_id, animal_id) = 1),
  constraint ration_quantity_sane check (quantity_kg >= 0),
  constraint ration_refused_sane check (
    refused_kg is null or (refused_kg >= 0 and refused_kg <= quantity_kg))
);
create index ration_tenant_time on ration (tenant_id, offered_at desc);

-- The product must actually be food. Enforced in the database because "cow ate 4 kg of
-- ivermectin" is the kind of row that gets noticed two years later, in a dataset.
create or replace function check_ration_product_is_feed() returns trigger
language plpgsql as $$
declare k text;
begin
  select kind into k from input_product where code = new.product_code;
  if k <> 'feed' then
    raise exception 'ration product % is of kind %, not feed', new.product_code, k
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger ration_product_is_feed_trg before insert or update of product_code on ration
for each row execute function check_ration_product_is_feed();

-- =============================================================================================
-- 5. Wiring the animal into what already exists
-- =============================================================================================
-- Every one of these is a NULLABLE column added to a table that already knows how to handle a
-- subject that may or may not be set. No existing row changes, no constraint gets stricter.

-- The weight at the walk-over weighing platform is a `measurement` -- scale as the device, and
-- `animal_weight` is already in the `quantity` catalog from 002. What was missing is WHICH ANIMAL,
-- because the scale is one device and the herd is 130 animals. The RFID reader at the platform
-- answers "who"; this column is where that answer lands.
alter table measurement add column animal_id bigint references animal(id) on delete restrict;
create index measurement_animal_time on measurement (animal_id, measured_at desc) where animal_id is not null;

-- Sickness and photos of an animal are the SAME observation and the SAME photo tables as the
-- plant side. That is the point -- the wizard is one flow with two vocabularies, not two systems.
alter table observation add column animal_id       bigint references animal(id) on delete restrict;
alter table observation add column animal_group_id bigint references animal_group(id) on delete restrict;
alter table treatment   add column animal_id       bigint references animal(id) on delete restrict;
alter table treatment   add column animal_group_id bigint references animal_group(id) on delete restrict;
alter table photo       add column animal_id       bigint references animal(id) on delete restrict;
alter table photo       add column animal_group_id bigint references animal_group(id) on delete restrict;

create index observation_animal on observation (animal_id, observed_at desc) where animal_id is not null;
create index treatment_animal on treatment (animal_id, applied_at desc) where animal_id is not null;
create index photo_animal on photo (animal_id) where animal_id is not null;

-- The "at least one subject" checks were written in 004 over the plant columns only. They are
-- REPLACED, not added to: a second check would be ANDed with the first, so an observation about an
-- animal and no plot would fail the original -- which is exactly the case this migration exists
-- to allow.
alter table observation drop constraint observation_has_a_subject;
alter table observation add constraint observation_has_a_subject
  check (num_nonnulls(plot_id, campaign_id, block_id, animal_id, animal_group_id) >= 1);

alter table treatment drop constraint treatment_has_a_subject;
alter table treatment add constraint treatment_has_a_subject
  check (num_nonnulls(observation_id, plot_id, campaign_id, block_id, animal_id, animal_group_id) >= 1);

alter table photo drop constraint photo_has_a_subject;
alter table photo add constraint photo_has_a_subject
  check (num_nonnulls(plot_id, campaign_id, block_id, observation_id, animal_id, animal_group_id) >= 1);

-- =============================================================================================
-- 6. History, RLS and grants
-- =============================================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'animal_species','breed','animal_status','location_source',
    'animal','animal_group','animal_group_member','ration'
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
    execute format('revoke update, delete on %I from agro_app, agro_control', t || '_history');
    execute format('grant select on %I to agro_app', t || '_history');
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'animal','animal_group','animal_group_member','animal_location','ration'
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

grant select on animal_species, breed, animal_status, location_source to agro_app;
grant select, insert, update on animal, animal_group, animal_group_member, ration to agro_app;
-- APPEND-ONLY: a position that can be edited is not evidence. No history table, by the same
-- argument as `measurement` -- a revoked privilege beats an audit of a change that must not happen.
grant select, insert on animal_location to agro_app;

-- =============================================================================================
-- 7. Seed catalogs
-- =============================================================================================
insert into animal_species (code, name) values
  ('cattle','Bovino'), ('sheep','Ovino'), ('goat','Caprino'), ('horse','Equino'), ('pig','Porcino')
on conflict (code) do nothing;

insert into breed (code, species_code, name) values
  ('nelore','cattle','Nelore'),
  ('brangus','cattle','Brangus'),
  ('braford','cattle','Braford'),
  ('brahman','cattle','Brahman'),
  ('angus','cattle','Angus'),
  ('hereford','cattle','Hereford'),
  ('holstein','cattle','Holando'),
  ('jersey','cattle','Jersey'),
  ('crossbred','cattle','Cruza')
on conflict (code) do nothing;

insert into animal_status (code, name, is_live) values
  ('active','En el rodeo',true),
  ('sick','En tratamiento',true),
  ('quarantine','En cuarentena',true),
  ('sold','Vendido',false),
  ('dead','Muerto',false),
  ('slaughtered','Faenado',false)
on conflict (code) do nothing;

insert into location_source (code, name, is_exact) values
  ('rfid_gate','Lectura de caravana en paso obligado',true),
  ('gps_collar','Collar GPS',false),
  ('manual','Cargado a mano',false),
  ('weighing','Pesaje al paso',true)
on conflict (code) do nothing;

-- Feed, so `ration` has something to point at from day one.
insert into input_product (code, name, kind) values
  ('pasture_grazing','Pastoreo directo','feed'),
  ('hay','Heno','feed'),
  ('silage','Silaje','feed'),
  ('balanced_feed','Balanceado','feed'),
  ('mineral_salt','Sal mineral','feed'),
  ('molasses','Melaza','feed')
on conflict (code) do nothing;

insert into module (code, name) values ('livestock','Ganadería')
on conflict (code) do nothing;

insert into resource (code, module_code) values
  ('animal','livestock'), ('animal_group','livestock'),
  ('animal_location','livestock'), ('ration','livestock')
on conflict (code) do nothing;

insert into permission (resource_code, action_code)
  select r.code, a.code from resource r cross join action a
  where (r.code, a.code) in (
    ('animal','read'),('animal','write'),('animal','create'),
    ('animal_group','read'),('animal_group','write'),
    ('animal_location','read'),('animal_location','export'),
    ('ration','read'),('ration','write'))
on conflict do nothing;

commit;
