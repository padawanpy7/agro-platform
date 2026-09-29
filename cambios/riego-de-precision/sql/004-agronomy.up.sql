-- 004 -- The half of the system that no sensor produces: the campaign, the soil, the satellite,
--        the trap, the photo, and what a person saw with their own eyes.
--
-- WHAT DATA STAYS AND WHAT IS LOST (mandatory comment, AGENTS.md rule 7):
--   Creates. Nothing is converted and nothing is dropped. One column is ADDED to `campaign`'s
--   neighbours only; no existing table changes shape here (004 adds `measurement.animal_id`).
--
-- WHY THIS MIGRATION EXISTS AT ALL, in one paragraph, because it is the whole point:
--   001 and 002 store what instruments send. But half of the Minimum Data Set -- the list DSSAT
--   and the FAO already wrote, so we do not have to invent it -- comes from NO instrument: the
--   soil profile, the sowing density, the flowering date, the kilos harvested. Nobody measures
--   those. If nobody WRITES them, they do not exist, and without them the sensor history feeds no
--   agronomic model, however tidy it is. See docs/el-sistema-completo.md section 1.
--
--   IRREVERSIBLE DECISIONS INTRODUCED HERE:
--   1. `soil_analysis_result` is NARROW, for the same reason `measurement` is: a lab that reports
--      boron next year is ONE ROW in `soil_parameter`, never a migration.
--   2. What was SEEN and what is BELIEVED live in different tables (`observation` vs `diagnosis`).
--      Merging them poisons the label, and the observation -- which is the part that never
--      changes -- is the one that gets lost.
--   3. `diagnosis` is APPEND-ONLY. A confirmation is a NEW row by a technician, never an edit of
--      the model's guess. Editing in place is how a model ends up trained on its own output.
--   4. The photo does NOT go in the database. The pointer does.
--   5. `spatial_index` stores `sample_count`, `no_data_count`, `evalscript_id` and `geom_version`.
--      An NDVI mean computed over 3 valid pixels because clouds covered the rest looks IDENTICAL
--      to a good one. Without those four columns there is no way to tell them apart, ever.

begin;

-- =============================================================================================
-- 1. CATALOGS -- nothing about the product's domain is hardcoded in code
-- =============================================================================================
create table crop (
  code            text primary key,
  name            text not null,          -- Spanish: reaches the screen.
  scientific_name text,
  constraint crop_code_shape check (code ~ '^[a-z][a-z0-9_]*$')
);

-- A variety is not a text column on `campaign`. Yield differs more between varieties of the same
-- crop than between two crops, so it is the first thing any model asks for -- and free text means
-- "Santa Cruz", "santa cruz" and "Sta Cruz" are three varieties.
create table crop_variety (
  id         bigint primary key generated always as identity,
  crop_code  text not null references crop(code) on update cascade on delete restrict,
  code       text not null,
  name       text not null,
  cycle_days integer,
  constraint crop_variety_cycle_sane check (cycle_days is null or cycle_days between 1 and 3650)
);
-- A unique INDEX and not a table constraint: `lower(code)` is an expression, and a table
-- constraint cannot hold one. Same effect, and it is why `role` and `client` already use indexes.
create unique index crop_variety_code_unique on crop_variety (crop_code, lower(code));

-- The phenological dates the Minimum Data Set asks for. `crop_code` NULL = a stage that applies to
-- any crop (emergence, harvest); a code with a crop is one only that crop has.
create table phenology_stage (
  code       text primary key,
  crop_code  text references crop(code) on update cascade on delete restrict,
  name       text not null,
  ordinal    integer not null,
  constraint phenology_stage_code_shape check (code ~ '^[a-z][a-z0-9_]*$')
);

-- Mirrors `quantity` exactly, and on purpose: same columns, same role. They are NOT the same table
-- because a lab result is not a time series -- it has a depth, a method and a report, and it
-- arrives a handful of times per year instead of every five minutes.
create table soil_parameter (
  code       text primary key,
  name       text not null,
  unit_code  text not null references unit(code) on update cascade on delete restrict,
  min_value  double precision,
  max_value  double precision,
  constraint soil_parameter_code_shape check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint soil_parameter_range_sane check (min_value is null or max_value is null or min_value < max_value)
);

create table index_type (
  code    text primary key,
  name    text not null,
  min_value double precision,
  max_value double precision,
  constraint index_type_code_shape check (code ~ '^[a-z][a-z0-9_]*$')
);

create table index_source (
  code            text primary key,
  name            text not null,
  resolution_m    double precision,
  constraint index_source_code_shape check (code ~ '^[a-z][a-z0-9_]*$')
);

-- THE EVALSCRIPT IS THE SATELLITE'S CALIBRATION. It is the formula of the index and of the cloud
-- mask. Change it and the numbers move; without knowing which rows came from which version, the
-- history mixes silently. Closed and superseded, never edited -- exactly like `calibration`.
create table evalscript (
  id              bigint primary key generated always as identity,
  index_code      text not null references index_type(code) on update cascade on delete restrict,
  source_code     text not null references index_source(code) on update cascade on delete restrict,
  version         integer not null,
  body            text not null,
  provenance      text not null,
  valid_from      timestamptz not null default now(),
  valid_to        timestamptz,
  unique (index_code, source_code, version),
  constraint evalscript_provenance_not_blank check (length(trim(provenance)) > 0),
  constraint evalscript_validity_sane check (valid_to is null or valid_to > valid_from)
);
create unique index evalscript_one_active on evalscript (index_code, source_code) where valid_to is null;

create table pest (
  code            text primary key,
  name            text not null,
  scientific_name text,
  constraint pest_code_shape check (code ~ '^[a-z][a-z0-9_]*$')
);

-- What a person can SEE. Deliberately not a list of diseases: "hoja amarilla" is a symptom, "virus
-- del mosaico" is a conclusion, and the whole design of this section rests on not confusing them.
-- `applies_to` because a capataz choosing from a list of forty symptoms, half of them about cows,
-- picks worse than one choosing from twelve.
create table symptom (
  code        text primary key,
  name        text not null,
  applies_to  text not null default 'plant',
  constraint symptom_code_shape check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint symptom_applies_valid check (applies_to in ('plant','animal','both'))
);

-- What it might BE. This is the catalog a diagnosis points at.
create table condition (
  code        text primary key,
  name        text not null,
  kind        text not null,
  applies_to  text not null default 'plant',
  constraint condition_code_shape check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint condition_kind_valid check (kind in ('disease','pest','disorder','deficiency','injury')),
  constraint condition_applies_valid check (applies_to in ('plant','animal','both'))
);

-- Three levels of certainty, and they are NOT interchangeable: only `technician` trains anything.
-- See docs/wizard-de-eventos.md -- a model trained on its own suggestions gets confident and wrong.
create table diagnosis_source (
  code         text primary key,
  name         text not null,
  trains_model boolean not null default false,
  constraint diagnosis_source_code_shape check (code ~ '^[a-z][a-z0-9_]*$')
);

-- "Cuanto" is the field everybody forgets. "Tuvo gusano" and "3 de 130 tuvieron gusano" are not
-- the same datum: without magnitude there is nothing to predict and no way to say whether it is
-- getting better or worse.
create table observation_extent (
  code     text primary key,
  name     text not null,
  ordinal  integer not null
);

-- What can be APPLIED: agrochemical, fertiliser, vaccine, feed. One catalog, because the
-- traceability question is the same for all four -- what, how much, when, by whom.
create table input_product (
  code             text primary key,
  name             text not null,
  kind             text not null,
  active_ingredient text,
  withdrawal_days  integer,
  constraint input_product_code_shape check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint input_product_kind_valid check (kind in ('agrochemical','fertiliser','vaccine','medicine','feed','amendment')),
  constraint input_product_withdrawal_sane check (withdrawal_days is null or withdrawal_days >= 0)
);

-- The ONE thing that differs between blocks. Writing it down is what makes a block an experiment
-- instead of four plots that happened to grow differently -- docs/como-aprender-de-cada-ciclo.md.
create table experiment_factor (
  code       text primary key,
  name       text not null,
  unit_code  text references unit(code) on update cascade on delete restrict,
  constraint experiment_factor_code_shape check (code ~ '^[a-z][a-z0-9_]*$')
);

-- =============================================================================================
-- 2. CAMPAIGN -- the label everything else hangs from
-- =============================================================================================
-- The photo is taken in November. The yield is known in February. If a result cannot be hung on
-- an old photo, the dataset never gets labelled -- and an unlabelled photo trains nothing.
-- `campaign` is what solves it: the photo points at the campaign, the campaign learns its yield
-- months later, and EVERY photo of that campaign is labelled at once without touching one of them.
create table campaign (
  id              bigint primary key generated always as identity,
  tenant_id       uuid not null references client(id) on delete restrict,
  plot_id         bigint not null references plot(id) on delete restrict,
  crop_code       text not null references crop(code) on update cascade on delete restrict,
  variety_id      bigint references crop_variety(id) on delete restrict,
  name            text not null,
  -- The Minimum Data Set's "management" block. None of this comes from a sensor.
  sown_on         date,
  plant_density   double precision,        -- plants per hectare
  row_spacing_cm  double precision,
  irrigated       boolean not null default true,
  -- Declared BEFORE the cycle, not after: a loop without a stated objective does not converge,
  -- it oscillates (docs/como-aprender-de-cada-ciclo.md).
  objective       text,
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  constraint campaign_name_not_blank check (length(trim(name)) > 0),
  constraint campaign_dates_sane check (ended_at is null or ended_at > started_at),
  constraint campaign_density_sane check (plant_density is null or plant_density > 0)
);
-- One live campaign per plot. Two at once means every measurement of that week belongs to both,
-- and no label can be assigned. (A second crop on the same ground is a second PLOT.)
create unique index campaign_one_open_per_plot on campaign (plot_id) where ended_at is null and deleted_at is null;
create index campaign_tenant on campaign (tenant_id, started_at desc);

-- The phenological dates. An event table and not six columns on `campaign`, because which stages
-- exist depends on the crop -- and six columns means a migration the day somebody grows rice.
create table campaign_stage (
  id           bigint primary key generated always as identity,
  tenant_id    uuid not null references client(id) on delete restrict,
  campaign_id  bigint not null references campaign(id) on delete restrict,
  stage_code   text not null references phenology_stage(code) on update cascade on delete restrict,
  observed_on  date not null,
  recorded_at  timestamptz not null default now(),
  recorded_by  uuid references app_user(id) on delete restrict,
  unique (campaign_id, stage_code)
);

-- Four blocks of fifty plants, each with ONE thing different, same week and same water: 45 days
-- gives four answers instead of one, and the comparison is cleaner than between two cycles,
-- because comparing October against December mixes your variable with the whole summer.
create table experiment_block (
  id           bigint primary key generated always as identity,
  tenant_id    uuid not null references client(id) on delete restrict,
  campaign_id  bigint not null references campaign(id) on delete restrict,
  code         text not null,
  name         text not null,
  factor_code  text references experiment_factor(code) on update cascade on delete restrict,
  -- The level of that factor. Numeric when it is a number (EC 1.2), text when it is not (shade /
  -- no shade). Both nullable so the CONTROL block -- the one with nothing changed -- is expressible.
  level_value  double precision,
  level_text   text,
  is_control   boolean not null default false,
  plant_count  integer,
  geom         geometry(Polygon, 4326),
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint experiment_block_control_has_no_level check (
    not is_control or (level_value is null and level_text is null)),
  constraint experiment_block_plants_sane check (plant_count is null or plant_count > 0)
);
create unique index experiment_block_code_unique on experiment_block (campaign_id, lower(code));
create index experiment_block_geom_gist on experiment_block using gist (geom);

-- THE OUTCOME. Everybody logs the sensors; almost nobody logs the harvest, the discard and why.
-- Many rows per campaign and not one column on `campaign`, because tomato and lettuce are picked
-- repeatedly -- a single `yield_kg` would either lose the curve or be overwritten every week.
create table harvest (
  id              bigint primary key generated always as identity,
  tenant_id       uuid not null references client(id) on delete restrict,
  campaign_id     bigint not null references campaign(id) on delete restrict,
  block_id        bigint references experiment_block(id) on delete restrict,
  harvested_on    date not null,
  quantity_kg     double precision,
  units_harvested integer,
  -- The discard is half the story: a campaign with 100 kg of which 40 were thrown away is not the
  -- same as one with 60 kg and nothing wasted, and a single yield number cannot tell them apart.
  units_discarded integer,
  discard_reason  text,
  quality_note    text,
  recorded_at     timestamptz not null default now(),
  recorded_by     uuid references app_user(id) on delete restrict,
  constraint harvest_quantity_sane check (quantity_kg is null or quantity_kg >= 0),
  constraint harvest_units_sane check (
    (units_harvested is null or units_harvested >= 0) and
    (units_discarded is null or units_discarded >= 0)),
  constraint harvest_has_a_number check (quantity_kg is not null or units_harvested is not null)
);
create index harvest_campaign on harvest (campaign_id, harvested_on);

-- =============================================================================================
-- 3. SOIL -- the profile no sensor sends
-- =============================================================================================
create table soil_analysis (
  id              bigint primary key generated always as identity,
  tenant_id       uuid not null references client(id) on delete restrict,
  plot_id         bigint not null references plot(id) on delete restrict,
  sampled_on      date not null,
  received_at     timestamptz not null default now(),
  -- The depth is part of the datum, not metadata: 0-20 cm and 20-40 cm of the same hole are two
  -- different soils, and a result without its depth cannot be compared with anything.
  depth_from_cm   double precision not null default 0,
  depth_to_cm     double precision not null,
  location        geometry(Point, 4326),
  laboratory      text not null,
  report_ref      text,
  constraint soil_analysis_lab_not_blank check (length(trim(laboratory)) > 0),
  constraint soil_analysis_depth_sane check (depth_to_cm > depth_from_cm and depth_from_cm >= 0)
);
create index soil_analysis_plot on soil_analysis (plot_id, sampled_on desc);
create index soil_analysis_geom_gist on soil_analysis using gist (location);

-- NARROW, for the reason at the top of this file. A lab that starts reporting boron is one row in
-- `soil_parameter`; with a column per parameter it would be a migration, and the old rows would
-- carry a NULL that cannot be told apart from "measured and came out zero".
create table soil_analysis_result (
  id              bigint primary key generated always as identity,
  tenant_id       uuid not null references client(id) on delete restrict,
  analysis_id     bigint not null references soil_analysis(id) on delete restrict,
  parameter_code  text not null references soil_parameter(code) on update cascade on delete restrict,
  value           double precision not null,
  method          text,
  unique (analysis_id, parameter_code)
);

-- =============================================================================================
-- 4. SPATIAL INDEX -- satellite and drone, one table
-- =============================================================================================
-- The raster is NOT stored: one flight is gigabytes. What is stored is the aggregate per plot
-- plus a pointer to the file. Satellite and drone share the table because they answer the same
-- question at different resolutions, and `source_code` is what tells them apart.
create table spatial_index (
  tenant_id       uuid not null references client(id) on delete restrict,
  plot_id         bigint not null references plot(id) on delete restrict,
  index_code      text not null references index_type(code) on update cascade on delete restrict,
  source_code     text not null references index_source(code) on update cascade on delete restrict,
  -- WHICH FORMULA produced this row. Without it, changing the cloud mask silently mixes two
  -- different measurements in the same series.
  evalscript_id   bigint not null references evalscript(id) on delete restrict,
  -- WHICH POLYGON produced this row. Fixing a plot boundary does NOT recompute these numbers --
  -- an external API computed them against the geometry of that day -- so they have to be asked
  -- for again. Without this column, correcting a boundary invalidates the history in silence.
  geom_version    integer not null,
  interval_from   timestamptz not null,
  interval_to     timestamptz not null,
  retrieved_at    timestamptz not null default now(),
  mean_value      double precision,
  p10_value       double precision,
  p90_value       double precision,
  min_value       double precision,
  max_value       double precision,
  stddev_value    double precision,
  -- THE TWO COLUMNS THAT DECIDE WHETHER THE ROW IS USABLE. A mean over 3 valid pixels looks
  -- exactly like a mean over 3000. The API gives both numbers for free; not storing them is the
  -- irreversible kind of mistake rule 1 forbids.
  sample_count    integer not null,
  no_data_count   integer not null,
  raster_uri      text,
  primary key (plot_id, index_code, source_code, evalscript_id, interval_from),
  constraint spatial_index_interval_sane check (interval_to > interval_from),
  constraint spatial_index_counts_sane check (sample_count >= 0 and no_data_count >= 0),
  constraint spatial_index_percentiles_sane check (
    p10_value is null or p90_value is null or p10_value <= p90_value)
);
-- NOT a hypertable, and it was one for an hour. `measurement` is a hypertable because it grows at
-- the rate of a sensor: one row every five minutes, per device, forever. `spatial_index` grows at
-- the rate of a SATELLITE PASS over a plot: nine years of Sentinel-2 at five-day intervals over
-- twenty plots is about thirteen thousand rows. Partitioning that buys nothing and costs the rule
-- that every unique index must carry the partition column -- a real constraint, paid for a table
-- that fits in memory. `tasks.md` said it first: hypertable where the volume justifies it, plain
-- table where it does not.
create index spatial_index_tenant_time on spatial_index (tenant_id, interval_from desc);

-- A convenience the product will want on every screen, and it belongs HERE and not in the API:
-- the fraction of valid pixels. Computed, never stored, so it can never disagree with its parts.
create or replace function spatial_index_valid_fraction(sample_count integer, no_data_count integer)
returns double precision language sql immutable as $$
  select case when coalesce(sample_count,0) + coalesce(no_data_count,0) = 0 then null
              else sample_count::double precision / (sample_count + no_data_count) end
$$;

-- =============================================================================================
-- 5. PEST TRAP
-- =============================================================================================
-- A count, not a measurement: it is read by a person opening a trap, it has a species, and it is
-- correctable -- which is why it is mutable with history while `measurement` is append-only.
create table pest_trap_catch (
  id           bigint primary key generated always as identity,
  tenant_id    uuid not null references client(id) on delete restrict,
  device_id    bigint not null references device(id) on delete restrict,
  pest_code    text not null references pest(code) on update cascade on delete restrict,
  counted_on   date not null,
  received_at  timestamptz not null default now(),
  count_value  integer not null,
  -- Days since the trap was last emptied. Twelve moths in two days and twelve in three weeks are
  -- opposite news, and without this column the series cannot tell them apart.
  days_exposed integer,
  recorded_by  uuid references app_user(id) on delete restrict,
  unique (device_id, pest_code, counted_on),
  constraint pest_trap_catch_count_sane check (count_value >= 0),
  constraint pest_trap_catch_days_sane check (days_exposed is null or days_exposed > 0)
);

-- =============================================================================================
-- 6. OBSERVATION / DIAGNOSIS / TREATMENT -- the wizard
-- =============================================================================================
-- The single decision that, if it goes wrong, ruins the dataset forever:
--
--   observation  <- FACTS: what was seen, where, when, HOW MUCH, the photo. Never changes.
--   diagnosis    <- BELIEF: what it might be, who said so, how sure. Added, never edited.
--   treatment    <- WHAT WAS ACTUALLY APPLIED. This is traceability, not a prescription.
--
-- It is the same principle as `raw_value` and `calibrated_value`, for the same reason: the
-- observation is the raw value and the diagnosis is the calibration. If the capataz says "gusano"
-- and that is stored as the fact, then when he is wrong the label is poisoned and the symptoms --
-- the part that could have been re-read by a better model -- are gone.
create table observation (
  id                bigint primary key generated always as identity,
  tenant_id         uuid not null references client(id) on delete restrict,
  -- TWO CLOCKS, and here they stop being a design detail: there is no signal in the field, so the
  -- wizard saves on the phone and syncs later. Three days can pass between them, and the model
  -- needs both -- the real date of the event and how long it took to arrive.
  observed_at       timestamptz not null,
  received_at       timestamptz not null default now(),
  -- What it is about. Several may be set at once, and that is the useful case rather than a flaw:
  -- an observation is almost always "this plot, during this campaign". What is forbidden is none.
  plot_id           bigint references plot(id) on delete restrict,
  campaign_id       bigint references campaign(id) on delete restrict,
  block_id          bigint references experiment_block(id) on delete restrict,
  location          geometry(Point, 4326),
  extent_code       text not null references observation_extent(code) on update cascade on delete restrict,
  affected_count    integer,
  inspected_count   integer,
  -- The crop stage. Without it "tomate podrido" cannot be compared between campaigns, because
  -- rot at flowering and rot at fruit set are not the same event.
  stage_code        text references phenology_stage(code) on update cascade on delete restrict,
  notes             text,
  observed_by       uuid references app_user(id) on delete restrict,
  created_at        timestamptz not null default now(),
  constraint observation_has_a_subject check (num_nonnulls(plot_id, campaign_id, block_id) >= 1),
  constraint observation_counts_sane check (
    (affected_count is null or affected_count >= 0) and
    (inspected_count is null or inspected_count > 0) and
    (affected_count is null or inspected_count is null or affected_count <= inspected_count))
);
create index observation_tenant_time on observation (tenant_id, observed_at desc);
create index observation_campaign on observation (campaign_id, observed_at desc);
create index observation_geom_gist on observation using gist (location);

-- Many symptoms per observation, because a sick plant shows several at once and picking one is
-- already a diagnosis in disguise.
create table observation_symptom (
  observation_id  bigint not null references observation(id) on delete restrict,
  symptom_code    text not null references symptom(code) on update cascade on delete restrict,
  primary key (observation_id, symptom_code)
);

-- APPEND-ONLY, and this is the point of the table. A confirmation is a NEW row whose source is a
-- technician, not an edit of the model's guess. That is what keeps the model's own output from
-- becoming its next training set -- the failure that sinks ML projects quietly, because every
-- round reinforces the previous round's errors until the system is confident and wrong.
create table diagnosis (
  id              bigint primary key generated always as identity,
  tenant_id       uuid not null references client(id) on delete restrict,
  observation_id  bigint not null references observation(id) on delete restrict,
  condition_code  text not null references condition(code) on update cascade on delete restrict,
  source_code     text not null references diagnosis_source(code) on update cascade on delete restrict,
  confidence      double precision,
  -- Which model said it. A suggestion without its version cannot be audited when the model is
  -- replaced -- the same argument as `evalscript` and `calibration`.
  model_version   text,
  stated_by       uuid references app_user(id) on delete restrict,
  stated_at       timestamptz not null default now(),
  rationale       text,
  constraint diagnosis_confidence_sane check (confidence is null or confidence between 0 and 1),
  -- A machine diagnosis has a model version and no person; a human one has a person and no model.
  constraint diagnosis_source_is_consistent check (
    case source_code
      when 'model' then stated_by is null and model_version is not null
      else stated_by is not null
    end)
);
create index diagnosis_observation on diagnosis (observation_id, stated_at desc);

-- WHAT WAS ACTUALLY APPLIED. Not a prescription: this product does not give doses. A system that
-- suggests a dose from a photo is a residue problem with SENACSA and with the EUDR -- which is
-- exactly the market the frigorifico needs to protect. What it does instead is record, and that
-- record is precisely what traceability demands and nobody keeps today.
create table treatment (
  id               bigint primary key generated always as identity,
  tenant_id        uuid not null references client(id) on delete restrict,
  observation_id   bigint references observation(id) on delete restrict,
  plot_id          bigint references plot(id) on delete restrict,
  campaign_id      bigint references campaign(id) on delete restrict,
  block_id         bigint references experiment_block(id) on delete restrict,
  product_code     text not null references input_product(code) on update cascade on delete restrict,
  dose             double precision,
  dose_unit_code   text references unit(code) on update cascade on delete restrict,
  applied_at       timestamptz not null,
  received_at      timestamptz not null default now(),
  -- Computed by the application from `input_product.withdrawal_days` and stored, NOT computed on
  -- read: the withdrawal period in force is the one of the day it was applied. If the label
  -- changes next year, last year's applications must not silently change their answer.
  withdrawal_until date,
  applied_by       uuid references app_user(id) on delete restrict,
  notes            text,
  constraint treatment_dose_sane check (dose is null or dose >= 0),
  constraint treatment_dose_has_unit check (dose is null or dose_unit_code is not null),
  constraint treatment_has_a_subject check (
    num_nonnulls(observation_id, plot_id, campaign_id, block_id) >= 1)
);
create index treatment_tenant_time on treatment (tenant_id, applied_at desc);

-- =============================================================================================
-- 7. PHOTO -- the pointer, never the file
-- =============================================================================================
-- A phone photo is 2 to 5 MB. Twenty a day is ~36 GB per year per farm, and this VPS's disk
-- already went to 3 seconds per fsync on 07/09. The original goes to object storage untouched;
-- Postgres holds the row with the pointer, the metadata and the labels.
create table photo (
  id              bigint primary key generated always as identity,
  tenant_id       uuid not null references client(id) on delete restrict,
  storage_uri     text not null,
  -- The hash is what lets the same photo be recognised after a resend, and what proves the file
  -- in storage is the file that was uploaded.
  content_hash    text not null,
  content_type    text not null,
  byte_size       bigint,
  taken_at        timestamptz,
  received_at     timestamptz not null default now(),
  location        geometry(Point, 4326),
  -- Where the point came from. A photo whose EXIF had no GPS is stored anyway and MARKED, never
  -- filled in with the plot centroid: an invented position cannot be told from a real one later.
  location_source text,
  plot_id         bigint references plot(id) on delete restrict,
  campaign_id     bigint references campaign(id) on delete restrict,
  block_id        bigint references experiment_block(id) on delete restrict,
  observation_id  bigint references observation(id) on delete restrict,
  stage_code      text references phenology_stage(code) on update cascade on delete restrict,
  taken_by        uuid references app_user(id) on delete restrict,
  -- EXTRACTED ON UPLOAD, not left inside the file: resizing strips EXIF, and some clients strip
  -- it for privacy before it ever arrives. If it lives only in the file, the first processing
  -- step loses it.
  exif            jsonb,
  deleted_at      timestamptz,
  unique (tenant_id, content_hash),
  constraint photo_uri_not_blank check (length(trim(storage_uri)) > 0),
  constraint photo_size_sane check (byte_size is null or byte_size > 0),
  constraint photo_location_source_valid check (
    location_source is null or location_source in ('exif','device','manual')),
  constraint photo_located_or_not check (
    (location is null) = (location_source is null)),
  constraint photo_has_a_subject check (
    num_nonnulls(plot_id, campaign_id, block_id, observation_id) >= 1)
);
create index photo_tenant_time on photo (tenant_id, taken_at desc);
create index photo_campaign on photo (campaign_id);
create index photo_geom_gist on photo using gist (location);

-- =============================================================================================
-- 8. A plot that falls outside its farm is a loading error
-- =============================================================================================
-- The engine can check this by itself, and it is worth having it shout when the polygon is drawn
-- instead of six months later. Only when the farm HAS a boundary: `farm.geom` is nullable because
-- a client may start with plots and draw the perimeter afterwards.
create or replace function check_plot_inside_farm() returns trigger
language plpgsql as $$
declare farm_geom geometry;
begin
  select geom into farm_geom from farm where id = new.farm_id;
  if farm_geom is not null and not st_contains(farm_geom, new.geom) then
    raise exception 'plot % falls outside farm %', coalesce(new.name,'?'), new.farm_id
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger plot_inside_farm_trg before insert or update of geom, farm_id on plot
for each row execute function check_plot_inside_farm();

-- =============================================================================================
-- 9. HISTORY for the new mutable tables
-- =============================================================================================
-- Same generic trigger as 002. The list is explicit and not "every table", because the ones left
-- out are left out ON PURPOSE: `spatial_index` and `diagnosis` are append-only, and for an
-- append-only table a revoked grant is strictly stronger than an audit trail -- an audit tells
-- you afterwards that someone rewrote history; a missing privilege means they could not.
do $$
declare t text;
begin
  foreach t in array array[
    'crop','crop_variety','phenology_stage','soil_parameter',
    'index_type','index_source','evalscript','pest','symptom','condition',
    'diagnosis_source','observation_extent','input_product','experiment_factor',
    'campaign','campaign_stage','experiment_block','harvest',
    'soil_analysis','soil_analysis_result','pest_trap_catch',
    'observation','observation_symptom','treatment','photo'
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

-- =============================================================================================
-- 10. RLS
-- =============================================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'campaign','campaign_stage','experiment_block','harvest',
    'soil_analysis','soil_analysis_result','spatial_index','pest_trap_catch',
    'observation','diagnosis','treatment','photo'
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

-- `observation_symptom` is a pure join table with no `tenant_id`, so its tenancy comes from the
-- parent -- the same shape as the two holes 003 closed, and written the same way on purpose.
alter table observation_symptom enable row level security;
alter table observation_symptom force  row level security;
create policy observation_symptom_own on observation_symptom for all to agro_app
  using (exists (select 1 from observation o where o.id = observation_symptom.observation_id
                 and o.tenant_id = current_setting('app.tenant_id', true)::uuid))
  with check (exists (select 1 from observation o where o.id = observation_symptom.observation_id
                 and o.tenant_id = current_setting('app.tenant_id', true)::uuid));

-- =============================================================================================
-- 11. Grants
-- =============================================================================================
grant select on crop, crop_variety, phenology_stage, soil_parameter, index_type, index_source,
                evalscript, pest, symptom, condition, diagnosis_source, observation_extent,
                input_product, experiment_factor to agro_app;

grant select, insert, update on campaign, campaign_stage, experiment_block, harvest,
                soil_analysis, soil_analysis_result, pest_trap_catch,
                observation, observation_symptom, treatment, photo to agro_app;

-- APPEND-ONLY, which is why neither has a history table.
--   `spatial_index`: an external API computed it against a polygon and an evalscript. Correcting
--                    it is asking again with a new `geom_version` or a new `evalscript_id`, which
--                    is a new row.
--   `diagnosis`:     a correction is a technician's row, not an edit of the model's guess.
grant select, insert on spatial_index, diagnosis to agro_app;

-- =============================================================================================
-- 12. Seed catalogs -- code in English, name in Spanish (it reaches the screen)
-- =============================================================================================
insert into crop (code, name, scientific_name) values
  ('tomato','Tomate','Solanum lycopersicum'),
  ('lettuce','Lechuga','Lactuca sativa'),
  ('strawberry','Frutilla','Fragaria x ananassa'),
  ('watermelon','Sandía','Citrullus lanatus'),
  ('rice','Arroz','Oryza sativa'),
  ('maize','Maíz','Zea mays'),
  ('soybean','Soja','Glycine max'),
  ('pasture','Pastura',null)
on conflict (code) do nothing;

insert into phenology_stage (code, crop_code, name, ordinal) values
  ('sowing',      null, 'Siembra',      10),
  ('emergence',   null, 'Emergencia',   20),
  ('vegetative',  null, 'Vegetativo',   30),
  ('flowering',   null, 'Floración',    40),
  ('fruit_set',   null, 'Cuaje',        50),
  ('ripening',    null, 'Maduración',   60),
  ('harvest',     null, 'Cosecha',      70),
  ('tillering',   'rice', 'Macollaje',  35),
  ('heading',     'rice', 'Espigazón',  45)
on conflict (code) do nothing;

-- The units the lab reports in. `unit` already exists (001); these are the ones it lacked.
insert into unit (code, name) values
  ('ppm','ppm'), ('cmol_kg','cmol/kg'), ('g_kg','g/kg'), ('pct_sat','% sat'),
  ('g_cm3','g/cm³'), ('ml','mL'), ('g','g'), ('unit','u'), ('kg_ha','kg/ha'), ('l_ha','L/ha')
on conflict (code) do nothing;

insert into soil_parameter (code, name, unit_code, min_value, max_value) values
  ('soil_ph','pH del suelo','ph',0,14),
  ('organic_matter','Materia orgánica','percent',0,100),
  ('phosphorus','Fósforo','ppm',0,null),
  ('potassium','Potasio','cmol_kg',0,null),
  ('calcium','Calcio','cmol_kg',0,null),
  ('magnesium','Magnesio','cmol_kg',0,null),
  ('aluminium','Aluminio','cmol_kg',0,null),
  ('cec','Capacidad de intercambio catiónico','cmol_kg',0,null),
  ('base_saturation','Saturación de bases','pct_sat',0,100),
  ('sand','Arena','percent',0,100),
  ('silt','Limo','percent',0,100),
  ('clay','Arcilla','percent',0,100),
  ('bulk_density','Densidad aparente','g_cm3',0,3),
  ('total_nitrogen','Nitrógeno total','g_kg',0,null)
on conflict (code) do nothing;

insert into index_type (code, name, min_value, max_value) values
  ('ndvi','NDVI - verdor',-1,1),
  ('ndwi','NDWI - agua',-1,1),
  ('ndre','NDRE - borde rojo',-1,1),
  ('evi','EVI - verdor mejorado',-1,1),
  ('lai','Índice de área foliar',0,null)
on conflict (code) do nothing;

insert into index_source (code, name, resolution_m) values
  ('sentinel2','Sentinel-2',10),
  ('landsat8','Landsat 8',30),
  ('drone_rgb','Dron - cámara RGB',0.05),
  ('drone_multispectral','Dron - multiespectral',0.1)
on conflict (code) do nothing;

insert into pest (code, name, scientific_name) values
  ('fruit_fly','Mosca de la fruta','Ceratitis capitata'),
  ('tomato_moth','Polilla del tomate','Tuta absoluta'),
  ('whitefly','Mosca blanca','Bemisia tabaci'),
  ('fall_armyworm','Cogollero','Spodoptera frugiperda'),
  ('thrips','Trips','Frankliniella occidentalis'),
  ('aphid','Pulgón','Aphididae'),
  ('screwworm','Gusanera','Cochliomyia hominivorax'),
  ('cattle_tick','Garrapata','Rhipicephalus microplus')
on conflict (code) do nothing;

insert into symptom (code, name, applies_to) values
  ('rotten_fruit','Fruta podrida','plant'),
  ('yellow_leaf','Hoja amarilla','plant'),
  ('burnt_leaf','Hoja quemada','plant'),
  ('spotted_leaf','Hoja con manchas','plant'),
  ('wilting','Planta marchita','plant'),
  ('chewed_leaf','Hoja comida','plant'),
  ('brown_root','Raíz marrón','plant'),
  ('bolting','Se espigó','plant'),
  ('stunted','Planta chica','plant'),
  ('visible_insect','Insecto a la vista','both'),
  ('lameness','Cojea','animal'),
  ('not_eating','No come','animal'),
  ('separated','Se aparta del lote','animal'),
  ('thin','Flaco','animal'),
  ('bleeding','Sangra','animal'),
  ('maggots','Bichera','animal'),
  ('diarrhoea','Diarrea','animal'),
  ('coughing','Tose','animal')
on conflict (code) do nothing;

insert into condition (code, name, kind, applies_to) values
  ('blossom_end_rot','Podredumbre apical','disorder','plant'),
  ('late_blight','Tizón tardío','disease','plant'),
  ('early_blight','Alternaria','disease','plant'),
  ('powdery_mildew','Oídio','disease','plant'),
  ('bacterial_wilt','Marchitez bacteriana','disease','plant'),
  ('nitrogen_deficiency','Falta de nitrógeno','deficiency','plant'),
  ('water_stress','Estrés hídrico','disorder','plant'),
  ('frost_damage','Daño por helada','injury','plant'),
  ('sunscald','Golpe de sol','injury','plant'),
  ('tuta_damage','Daño de polilla del tomate','pest','plant'),
  ('myiasis','Gusanera','pest','animal'),
  ('tick_infestation','Garrapatosis','pest','animal'),
  ('foot_rot','Pietín','disease','animal'),
  ('parasitism','Parasitosis','disease','animal'),
  ('malnutrition','Desnutrición','deficiency','animal')
on conflict (code) do nothing;

insert into diagnosis_source (code, name, trains_model) values
  ('model','Sugerencia del sistema',false),
  ('person','Quien lo vio en el campo',false),
  ('technician','Confirmado por técnico o veterinario',true)
on conflict (code) do nothing;

insert into observation_extent (code, name, ordinal) values
  ('one','Una planta o un animal',10),
  ('patch','Un pedazo',20),
  ('whole','Todo el lote',30)
on conflict (code) do nothing;

insert into experiment_factor (code, name, unit_code) values
  ('solution_ec','Conductividad de la solución','ms_cm'),
  ('solution_ph','pH de la solución','ph'),
  ('shading','Sombra',null),
  ('irrigation_threshold','Umbral de riego','percent'),
  ('plant_density','Densidad de plantación',null),
  ('variety','Variedad',null),
  ('fertiliser_dose','Dosis de fertilizante','kg_ha')
on conflict (code) do nothing;

insert into input_product (code, name, kind, active_ingredient, withdrawal_days) values
  ('urea','Urea','fertiliser',null,null),
  ('npk_15_15_15','NPK 15-15-15','fertiliser',null,null),
  ('agricultural_lime','Cal agrícola','amendment',null,null),
  ('copper_oxychloride','Oxicloruro de cobre','agrochemical','oxicloruro de cobre',7),
  ('bacillus_thuringiensis','Bacillus thuringiensis','agrochemical','Bacillus thuringiensis',0),
  ('ivermectin','Ivermectina','medicine','ivermectina',null),
  ('foot_and_mouth_vaccine','Vacuna antiaftosa','vaccine',null,null),
  ('rabies_vaccine','Vacuna antirrábica','vaccine',null,null)
on conflict (code) do nothing;

-- `resource` rows for the new tables: without them no role can be granted anything over them, and
-- the permission system would be silently incomplete. The permission itself is (resource, action).
insert into resource (code, module_code) values
  ('campaign','core'), ('harvest','core'), ('experiment_block','core'),
  ('soil_analysis','core'), ('photo','core'),
  ('observation','core'), ('diagnosis','core'), ('treatment','core'),
  ('spatial_index','satellite'), ('pest_trap_catch','pests')
on conflict (code) do nothing;

insert into permission (resource_code, action_code)
  select r.code, a.code from resource r cross join action a
  where (r.code, a.code) in (
    ('campaign','read'),('campaign','write'),('campaign','create'),
    ('harvest','read'),('harvest','write'),
    ('experiment_block','read'),('experiment_block','write'),
    ('soil_analysis','read'),('soil_analysis','write'),
    ('photo','read'),('photo','create'),('photo','export'),
    ('observation','read'),('observation','create'),
    ('diagnosis','read'),('diagnosis','create'),('diagnosis','approve'),
    ('treatment','read'),('treatment','create'),
    ('spatial_index','read'),('spatial_index','export'),
    ('pest_trap_catch','read'),('pest_trap_catch','write'))
on conflict do nothing;

commit;
