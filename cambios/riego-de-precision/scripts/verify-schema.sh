#!/usr/bin/env bash
# verify-schema.sh -- the schema's promises, checked against the running database.
#
# Replaces the three Spanish-named scripts of 29/09. Same guarantees, English names, plus the two
# new ones: history on every mutable table, and append-only enforced by grants.
#
# 29/09, second pass: steps 1 and 3 used to be COUNTS -- "11 tables with RLS", "24 history tables".
# Migrations 003-005 took the schema to 120 tables and both went red while nothing was wrong, which
# is the worst kind of red: the one you learn to edit instead of read. They are now set differences
# -- "how many tables that SHOULD have it, do not" -- so the right answer is 0 forever and adding a
# table can never make them lie in either direction.
#
# Anyone can run this. It prints OK or FAIL per step and needs no knowledge of the code.
#
#   bash cambios/riego-de-precision/scripts/verify-schema.sh
#
# Exits 0 if everything passes, 1 otherwise. Leaves no test data behind.

set -uo pipefail
C="${AGRO_PG_CONTAINER:-agro-postgres}"; DB="${PGDATABASE:-agro}"; OWNER="${PGUSER:-agro_admin}"
ok=0; bad=0
TAGS='^(INSERT|UPDATE|DELETE|SELECT|CREATE|DROP|GRANT|REVOKE|ALTER|SET|BEGIN|COMMIT|ROLLBACK|DO)[ 0-9]*$'

q()  { docker exec -i "$C" psql -U "$OWNER" -d "$DB" -tAX -v ON_ERROR_STOP=1 -c "$1" 2>&1 | grep -vE "$TAGS" | grep -v '^$'; }
# Returns "rejected" or "GOT_IN" from psql's EXIT CODE, not from the text of the error.
# Grepping the message was the first attempt and it is fragile: the wording depends on the
# server locale, so the same check passes here and silently stops checking on another machine.
rejects() {
  if docker exec -i "$C" psql -U "$OWNER" -d "$DB" -tAX -v ON_ERROR_STOP=1 -c "$1" >/dev/null 2>&1
  then echo GOT_IN; else echo rejected; fi
}
as_app() {
  docker exec -i "$C" psql -U "$OWNER" -d "$DB" -tAX 2>&1 <<SQL
begin;
set local role agro_app;
set local app.tenant_id = '$1';
set local app.user_id = '${3:-00000000-0000-0000-0000-000000000000}';
$2
commit;
SQL
}
step() {
  if [ "$4" = "$3" ]; then printf '  OK   %s. %s\n' "$1" "$2"; ok=$((ok+1))
  else printf '  FAIL %s. %s\n        want: %s\n        got:  %s\n' "$1" "$2" "$3" "$4"; bad=$((bad+1)); fi
}
cleanup() {
  # Order matters: every foreign key in this schema is ON DELETE RESTRICT on purpose, so a child
  # left behind blocks its parent. Deepest first -- and `measurement` leads, although it is deleted
  # again below, because 005 gave it an `animal_id`: with a weight row still in it, no animal can be
  # removed, so no client can be removed, and the next run fails on a duplicate client name.
  q "delete from measurement where tenant_id in (select id from client where name like '\_t%');
     delete from photo where tenant_id in (select id from client where name like '\_t%');
     delete from treatment where tenant_id in (select id from client where name like '\_t%');
     delete from diagnosis where tenant_id in (select id from client where name like '\_t%');
     delete from observation_symptom where observation_id in
       (select id from observation where tenant_id in (select id from client where name like '\_t%'));
     delete from observation where tenant_id in (select id from client where name like '\_t%');
     delete from harvest where tenant_id in (select id from client where name like '\_t%');
     delete from experiment_block where tenant_id in (select id from client where name like '\_t%');
     delete from campaign_stage where tenant_id in (select id from client where name like '\_t%');
     delete from campaign where tenant_id in (select id from client where name like '\_t%');
     delete from soil_analysis_result where tenant_id in (select id from client where name like '\_t%');
     delete from soil_analysis where tenant_id in (select id from client where name like '\_t%');
     delete from spatial_index where tenant_id in (select id from client where name like '\_t%');
     delete from pest_trap_catch where tenant_id in (select id from client where name like '\_t%');
     delete from ration where tenant_id in (select id from client where name like '\_t%');
     delete from animal_location where tenant_id in (select id from client where name like '\_t%');
     delete from animal_group_member where tenant_id in (select id from client where name like '\_t%');
     delete from animal where tenant_id in (select id from client where name like '\_t%');
     delete from animal_group where tenant_id in (select id from client where name like '\_t%');
     delete from evalscript where provenance like '\_t%';
     delete from membership_role where membership_id in
       (select id from membership where tenant_id in (select id from client where name like '\_t%'));
     delete from role_permission where role_id in
       (select id from role where tenant_id in (select id from client where name like '\_t%'));
     delete from role where tenant_id in (select id from client where name like '\_t%');" >/dev/null 2>&1
  q "delete from measurement where tenant_id in (select id from client where name like '\_t%');
     delete from irrigation_event where tenant_id in (select id from client where name like '\_t%');
     delete from calibration where tenant_id in (select id from client where name like '\_t%');
     delete from device where tenant_id in (select id from client where name like '\_t%');
     delete from plot where tenant_id in (select id from client where name like '\_t%');
     delete from farm where tenant_id in (select id from client where name like '\_t%');
     delete from client_module where tenant_id in (select id from client where name like '\_t%');
     -- BEFORE the client, not after. It used to be last and worked only because no test created a
     -- membership; step 44 does, and then it silently blocked every client delete -- which surfaced
     -- as a duplicate client name on the NEXT run, three steps away from the cause.
     delete from membership where tenant_id in (select id from client where name like '\_t%');
     delete from membership where user_id in (select id from app_user where email='t@example.py');
     delete from client where name like '\_t%';" >/dev/null 2>&1
  # The test user is NOT deleted, and that is a property of the design rather than an oversight:
  # `*_history.changed_by` references `app_user` with ON DELETE RESTRICT, so anyone who has ever
  # changed a row can never be physically removed. That is what we want -- history that points at a
  # user who no longer exists is worthless -- and it is why `app_user` has `deleted_at`.
}
trap cleanup EXIT

echo "==> verify-schema ($C/$DB)"
cleanup

# --- structure --------------------------------------------------------------------------------
# The append-only tables, named ONCE. Every step below that needs the list reads this one, so a
# table added to it cannot be forgotten by half the checks.
AO="'measurement','irrigation_event','spatial_index','diagnosis','animal_location'"

# NOT a count of what is right: a count of what is WRONG, which stays 0 as the schema grows.
step 1 "no table with a tenant_id is missing RLS with FORCE" "0" \
  "$(q "select count(*) from pg_class c
        join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
        where c.relkind='r'
          and exists (select 1 from information_schema.columns col
                      where col.table_schema='public' and col.table_name=c.relname
                        and col.column_name='tenant_id')
          and c.relname not like '%\_history'
          and not (c.relrowsecurity and c.relforcerowsecurity);")"

step 2 "every policy declares WITH CHECK, not only USING" "0" \
  "$(q "select count(*) from pg_policies where schemaname='public'
        and cmd='ALL' and with_check is null;")"

# `not ours($1)` excludes tables that belong to an EXTENSION. PostGIS installs `spatial_ref_sys`
# into `public`, and the first run of this generic check flagged it -- correctly, by its own words,
# and uselessly: auditing PostGIS's list of coordinate systems is not this project's job. Excluding
# it by NAME would have been the wrong fix, because the next extension would slip through.
ours="and not exists (select 1 from pg_depend d join pg_class c2 on c2.oid=d.objid
                      where c2.relname=t.tablename and d.deptype='e')"

step 3 "no mutable table of ours is missing its history table" "0" \
  "$(q "select count(*) from pg_tables t where t.schemaname='public'
          and t.tablename not like '%\_history'
          and t.tablename not in ($AO)
          $ours
          and not exists (select 1 from pg_tables h where h.schemaname='public'
                          and h.tablename = t.tablename || '_history');")"

step 4 "and no append-only table HAS one (auditing a forbidden change is theatre)" "0" \
  "$(q "select count(*) from pg_tables where schemaname='public'
        and tablename in (select unnest(array[$AO]) || '_history');")"

step 5 "the app cannot UPDATE or DELETE an append-only table" "0" \
  "$(q "select count(*) from information_schema.role_table_grants
        where grantee='agro_app' and table_name in ($AO)
          and privilege_type in ('UPDATE','DELETE');")"

step 6 "the app cannot rewrite history either" "0" \
  "$(q "select count(*) from information_schema.role_table_grants
        where grantee='agro_app' and table_name like '%\_history'
          and privilege_type in ('UPDATE','DELETE');")"

step 7 "no table of commands exists: the cloud has nowhere to write 'open the valve'" "0" \
  "$(q "select count(*) from information_schema.tables where table_schema='public'
        and table_name in ('command','order','valve_command');")"

# `%_es` was in this pattern and matched `measured_litres` and `effective_minutes`, which are
# perfectly good English plurals. A check that fires on correct code gets disabled, so it went.
step 8 "no identifier kept a Spanish ending" "0" \
  "$(q "select count(*) from information_schema.columns where table_schema='public'
        and (column_name ~ '(cion|dad|aje)$' or table_name ~ '(cion|dad|aje)$');")"

# --- data -------------------------------------------------------------------------------------
# Reused, not recreated, for the reason in cleanup(). And it must be a REAL user: `changed_by` is
# a foreign key, so a made-up uuid makes the history trigger fail and takes the whole UPDATE with
# it. Loud, which is correct -- but it means the application MUST set app.user_id to a real user.
q "insert into app_user (email,name) values ('t@example.py','tester') on conflict do nothing;" >/dev/null
U=$(q "select id from app_user where email='t@example.py';")
A=$(q "insert into client (name) values ('_tA') returning id;")
B=$(q "insert into client (name) values ('_tB') returning id;")
q "insert into client_module (tenant_id,module_code) select '$A', code from module;" >/dev/null
q "insert into client_module (tenant_id,module_code) values ('$B','irrigation');" >/dev/null

step 9 "a query with no tenant returns no rows at all" "0" \
  "$(docker exec -i "$C" psql -U "$OWNER" -d "$DB" -tAX 2>&1 <<SQL | grep -E '^[0-9]+$' | head -1
begin; set local role agro_app; select count(*) from client; commit;
SQL
)"

step 10 "A sees itself and nobody else" "1" "$(as_app "$A" "select count(*) from client;" | grep -E '^[0-9]+$' | head -1)"
step 11 "A sees only its own modules" "7" "$(as_app "$A" "select count(*) from client_module;" | grep -E '^[0-9]+$' | head -1)"

step 12 "A cannot WRITE a row belonging to B" "rejected" \
  "$(docker exec -i "$C" psql -U "$OWNER" -d "$DB" -tAX -v ON_ERROR_STOP=1 >/dev/null 2>&1 <<SQL && echo GOT_IN || echo rejected
begin; set local role agro_app; set local app.tenant_id = '$A';
insert into client_module (tenant_id,module_code) values ('$B','weather');
commit;
SQL
)"

# --- measurement ------------------------------------------------------------------------------
F=$(q "insert into farm (tenant_id,name) values ('$A','f') returning id;")
P=$(q "insert into plot (tenant_id,farm_id,name,geom) values ('$A',$F,'p',
      st_geomfromtext('POLYGON((-56.88 -25.32,-56.85 -25.32,-56.85 -25.35,-56.88 -25.35,-56.88 -25.32))',4326))
      returning id;")
D=$(q "insert into device (tenant_id,name,type_code,location) values ('$A','d','soil_sensor',
      st_setsrid(st_makepoint(-56.86,-25.33),4326)) returning id;")

step 13 "a device lands in its plot without anyone declaring it" "$P" \
  "$(q "select p.id from plot p, device d where d.id=$D and st_contains(p.geom,d.location);")"

q "insert into measurement (tenant_id,device_id,quantity_code,measured_at,received_at,raw_value)
   values ('$A',$D,'soil_moisture', now()-interval '3 days', now(), 512.0);" >/dev/null
step 14 "measured_at and received_at stay apart (a 3-day gateway backlog)" "3" \
  "$(q "select round(extract(epoch from (received_at-measured_at))/86400)::int from measurement where device_id=$D;")"
step 15 "with no calibration, calibrated_value stays NULL and is not filled with 0" "1" \
  "$(q "select (calibrated_value is null)::int from measurement where device_id=$D;")"

step 16 "a measurement without a raw value is rejected" "rejected" \
  "$(rejects "insert into measurement (tenant_id,device_id,quantity_code,measured_at,calibrated_value)
              values ('$A',$D,'soil_moisture',now(),1.0);")"

step 17 "a calibration without provenance is rejected" "rejected" \
  "$(rejects "insert into calibration (tenant_id,device_id,quantity_code,formula,provenance)
              values ('$A',$D,'soil_moisture','x','   ');")"

# A quantity the product does not support yet: rice flood depth. ONE ROW, not a migration.
q "insert into unit (code,name) values ('cm_water','cm') on conflict do nothing;
   insert into quantity (code,name,unit_code,min_value,max_value)
   values ('flood_depth','Lámina de agua','cm_water',0,50) on conflict do nothing;" >/dev/null
q "insert into measurement (tenant_id,device_id,quantity_code,measured_at,raw_value)
   values ('$A',$D,'flood_depth',now(),12.5);" >/dev/null
step 18 "a NEW quantity (rice) is measured with no schema change: one ROW" "12.5" \
  "$(q "select raw_value::text from measurement where quantity_code='flood_depth' and device_id=$D;")"

# --- history ----------------------------------------------------------------------------------
# The point of the whole audit layer: the row as it was BEFORE, and who changed it.
before=$(q "select count(*) from plot_history;")
as_app "$A" "update plot set name='renamed' where id=$P;" "$U" >/dev/null
step 19 "an UPDATE leaves exactly one history row" "$((before+1))" "$(q "select count(*) from plot_history;")"

# Scoped to THIS plot. Ordering by id alone picked up rows left by the previous run's cleanup --
# a DELETE fires the trigger too, so the newest history row was a deletion, not this update.
step 20 "and that row holds the value as it was BEFORE the change" "p" \
  "$(q "select row_data->>'name' from plot_history where (row_data->>'id')::bigint=$P
        order by id desc limit 1;")"

step 21 "and it records WHO changed it" "$U" \
  "$(q "select changed_by::text from plot_history where (row_data->>'id')::bigint=$P
        order by id desc limit 1;")"

# --- the campaign, and the label that arrives months later ------------------------------------
CA=$(q "insert into campaign (tenant_id,plot_id,crop_code,name,sown_on,objective)
        values ('$A',$P,'tomato','_t campaign', current_date - 90, 'rendimiento') returning id;")
q "insert into photo (tenant_id,storage_uri,content_hash,content_type,taken_at,campaign_id,taken_by)
   values ('$A','s3://_t/one.jpg','_thash1','image/jpeg', now()-interval '60 days', $CA, '$U');" >/dev/null
q "insert into harvest (tenant_id,campaign_id,harvested_on,quantity_kg,units_harvested,units_discarded,discard_reason)
   values ('$A',$CA, current_date, 42.5, 100, 12, 'podredumbre apical');" >/dev/null

# THE point of `campaign`. The photo was taken two months ago and nothing about it was edited; the
# harvest row recorded today is what gives it a label. Without this link the photo trains nothing.
step 22 "a harvest recorded TODAY labels a photo taken two months ago, untouched" "42.5" \
  "$(q "select h.quantity_kg::text from photo ph
        join campaign c on c.id = ph.campaign_id
        join harvest  h on h.campaign_id = c.id
        where ph.content_hash='_thash1';")"

step 23 "a harvest with no number at all is rejected" "rejected" \
  "$(rejects "insert into harvest (tenant_id,campaign_id,harvested_on) values ('$A',$CA,current_date);")"

# The discard is half the story, so it has to be a column and not a note.
step 24 "the discard is stored apart from the yield, not folded into it" "12" \
  "$(q "select units_discarded from harvest where campaign_id=$CA and units_harvested=100;")"

# --- the satellite ----------------------------------------------------------------------------
# `valid_from` is set explicitly and in the past: the first attempt left it at its `now()` default
# and closed it with `now()` in the same statement, which the schema rejected because valid_to has
# to be strictly greater. The constraint was right and the test was wrong.
q "insert into evalscript (index_code,source_code,version,body,provenance,valid_from,valid_to)
   values ('ndvi','sentinel2',1,'// v1','_t primera version',
           now()-interval '30 days', now()-interval '1 day') on conflict do nothing;
   insert into evalscript (index_code,source_code,version,body,provenance)
   values ('ndvi','sentinel2',2,'// v2 con mascara de nubes','_t con mascara') on conflict do nothing;" >/dev/null
E1=$(q "select id from evalscript where provenance='_t primera version';")
E2=$(q "select id from evalscript where provenance='_t con mascara';")

# `date_trunc('day', ...)` and not bare `now()`: the two rows below go in two separate statements,
# so `now()` differs between them by microseconds and they stop being the SAME date -- which is
# exactly what step 27 is trying to prove. The first version of this test passed for the wrong
# reason and then failed for the right one.
DAY="date_trunc('day', now()) - interval '10 days'"
q "insert into spatial_index (tenant_id,plot_id,index_code,source_code,evalscript_id,geom_version,
      interval_from,interval_to,mean_value,sample_count,no_data_count)
   values ('$A',$P,'ndvi','sentinel2',$E1,1, $DAY, $DAY + interval '1 day', 0.72, 3, 997);" >/dev/null

# The row that this whole column set exists for: a mean of 0.72 over THREE valid pixels, because
# clouds covered the rest, is indistinguishable from a good one unless the counts are stored.
step 25 "an NDVI mean over 3 valid pixels of 1000 is visibly worthless" "0.003" \
  "$(q "select round(spatial_index_valid_fraction(sample_count,no_data_count)::numeric,3)::text
        from spatial_index where plot_id=$P and evalscript_id=$E1;")"

step 26 "a spatial index row without its pixel counts is rejected" "rejected" \
  "$(rejects "insert into spatial_index (tenant_id,plot_id,index_code,source_code,evalscript_id,
                geom_version,interval_from,interval_to,mean_value,no_data_count)
              values ('$A',$P,'ndvi','sentinel2',$E2,1,now(),now()+interval '1 day',0.8,0);")"

# Changing the formula does not rewrite the past: it is a new row with a new evalscript. The old
# one stays readable and attributable, exactly like `calibration` on a sensor.
q "insert into spatial_index (tenant_id,plot_id,index_code,source_code,evalscript_id,geom_version,
      interval_from,interval_to,mean_value,sample_count,no_data_count)
   values ('$A',$P,'ndvi','sentinel2',$E2,1, $DAY, $DAY + interval '1 day', 0.55, 950, 50);" >/dev/null
step 27 "a new evalscript adds a row for the SAME date, it does not overwrite the old one" "2" \
  "$(q "select count(*) from spatial_index where plot_id=$P
        and interval_from = (select min(interval_from) from spatial_index where plot_id=$P);")"

# --- what was seen vs what is believed --------------------------------------------------------
O=$(q "insert into observation (tenant_id,observed_at,received_at,plot_id,campaign_id,
         extent_code,affected_count,inspected_count,stage_code,observed_by)
       values ('$A', now()-interval '3 days', now(), $P, $CA, 'patch', 7, 130, 'fruit_set', '$U')
       returning id;")
q "insert into observation_symptom (observation_id,symptom_code) values ($O,'rotten_fruit');" >/dev/null

# The wizard's two clocks. The capataz saw it in the field with no signal; it arrived three days
# later. Storing one would lose either the real date or the delay, and the model needs both.
step 28 "the observation keeps WHEN IT WAS SEEN apart from when it arrived" "3" \
  "$(q "select round(extract(epoch from (received_at-observed_at))/86400)::int from observation where id=$O;")"

# "Tuvo gusano" and "7 de 130 tuvieron gusano" are not the same datum.
step 29 "and it keeps HOW MUCH, which is what makes it comparable between years" "7/130" \
  "$(q "select affected_count || '/' || inspected_count from observation where id=$O;")"

step 30 "an observation about more plants than were inspected is rejected" "rejected" \
  "$(rejects "update observation set affected_count=500 where id=$O;")"

q "insert into diagnosis (tenant_id,observation_id,condition_code,source_code,confidence,model_version)
   values ('$A',$O,'blossom_end_rot','model',0.81,'demo-v0');
   insert into diagnosis (tenant_id,observation_id,condition_code,source_code,stated_by)
   values ('$A',$O,'late_blight','technician','$U');" >/dev/null

# The model guessed one thing and the technician said another. BOTH rows survive, and only the
# technician's trains anything -- which is what keeps the next model from learning its own output.
step 31 "the model's guess and the technician's verdict coexist, and only one trains" "1" \
  "$(q "select count(*) from diagnosis d join diagnosis_source s on s.code=d.source_code
        where d.observation_id=$O and s.trains_model;")"

step 32 "and both are still there: a confirmation ADDS, it does not overwrite" "2" \
  "$(q "select count(*) from diagnosis where observation_id=$O;")"

step 33 "a machine diagnosis with no model version is rejected" "rejected" \
  "$(rejects "insert into diagnosis (tenant_id,observation_id,condition_code,source_code)
              values ('$A',$O,'late_blight','model');")"

# --- the soil, and the same narrow argument as measurement ------------------------------------
SA=$(q "insert into soil_analysis (tenant_id,plot_id,sampled_on,depth_to_cm,laboratory)
        values ('$A',$P, current_date - 30, 20, 'IPTA') returning id;")
q "insert into soil_parameter (code,name,unit_code,min_value,max_value)
   values ('boron','Boro','ppm',0,null) on conflict do nothing;" >/dev/null
q "insert into soil_analysis_result (tenant_id,analysis_id,parameter_code,value)
   values ('$A',$SA,'boron',0.42);" >/dev/null
step 34 "a lab that starts reporting BORON needs one catalog row, not a migration" "0.42" \
  "$(q "select value::text from soil_analysis_result where analysis_id=$SA and parameter_code='boron';")"

# --- a plot outside its farm is a loading error, and the engine says so ------------------------
step 35 "a plot drawn outside its farm is rejected by the database, not by the front" "rejected" \
  "$(rejects "update farm set geom = st_geomfromtext(
                'POLYGON((-56.90 -25.30,-56.89 -25.30,-56.89 -25.31,-56.90 -25.31,-56.90 -25.30))',4326)
              where id=$F;
              update plot set geom = geom where id=$P;")"

# --- livestock: what is genuinely new, and what is deliberately NOT a new table ----------------
G=$(q "insert into animal_group (tenant_id,name) values ('$A','_t rodeo') returning id;")
AN=$(q "insert into animal (tenant_id,tag,rfid,species_code,breed_code,sex,status_code)
        values ('$A','_t007','982000000000001','cattle','brangus','female','active') returning id;")
q "insert into animal_group_member (tenant_id,animal_id,group_id) values ('$A',$AN,$G);" >/dev/null

# The proof that the narrow table was the right call, and the reason livestock needed no weight
# table: the scale is a device, the weight is a quantity, and the RFID says which animal.
q "insert into device (tenant_id,name,type_code) values ('$A','_t balanza','scale');" >/dev/null
SC=$(q "select id from device where tenant_id='$A' and name='_t balanza';")
q "insert into measurement (tenant_id,device_id,quantity_code,measured_at,raw_value,animal_id)
   values ('$A',$SC,'animal_weight', now(), 412.0, $AN);" >/dev/null
step 36 "an animal's weight is a MEASUREMENT with an animal, not a table of its own" "412" \
  "$(q "select m.raw_value::int::text from measurement m join animal a on a.id=m.animal_id
        where a.tag='_t007' and m.quantity_code='animal_weight';")"

# A vaccine is a treatment with a product of kind 'vaccine'. Same table as the plant side, same
# four questions -- what, how much, when, by whom.
q "insert into treatment (tenant_id,animal_id,product_code,dose,dose_unit_code,applied_at,applied_by)
   values ('$A',$AN,'foot_and_mouth_vaccine',2,'ml', now(), '$U');" >/dev/null
step 37 "a vaccine is a TREATMENT, the same table the tomato uses" "1" \
  "$(q "select count(*) from treatment t join input_product p on p.code=t.product_code
        where t.animal_id=$AN and p.kind='vaccine';")"

step 38 "a ration of ivermectin is rejected: the product has to be food" "rejected" \
  "$(rejects "insert into ration (tenant_id,animal_group_id,product_code,offered_at,quantity_kg)
              values ('$A',$G,'ivermectin',now(),4);")"

q "insert into ration (tenant_id,animal_group_id,product_code,offered_at,quantity_kg,refused_kg)
   values ('$A',$G,'silage', now(), 300, 40);" >/dev/null
step 39 "and a real ration keeps what was REFUSED, so eaten is a number and not an intention" "260" \
  "$(q "select (quantity_kg-refused_kg)::int::text from ration where animal_group_id=$G;")"

q "insert into animal_location (tenant_id,animal_id,observed_at,source_code,plot_id,device_id)
   values ('$A',$AN, now(), 'rfid_gate', $P, $SC);" >/dev/null
step 40 "a position with neither plot nor point is rejected" "rejected" \
  "$(rejects "insert into animal_location (tenant_id,animal_id,observed_at,source_code)
              values ('$A',$AN, now()-interval '1 hour', 'gps_collar');")"

# --- the three holes 003 closed ---------------------------------------------------------------
R=$(q "insert into role (tenant_id,code,name) values ('$A','_trole','_t rol') returning id;")
q "insert into role_permission (role_id,permission_id)
   select $R, id from permission where code='plot:read';" >/dev/null

# 41 and 42 are a PAIR and neither is worth much alone: 41 also passes if the policy denies
# everyone -- including A -- which is a broken product, not a secure one. 42 is the positive
# control. Dropping `role_permission_own` on purpose turns 42 red and leaves 41 green, which is
# how that was found.
step 41 "B cannot read which permissions a role of A carries" "0" \
  "$(as_app "$B" "select count(*) from role_permission where role_id=$R;" | grep -E '^[0-9]+$' | head -1)"
step 42 "and A can read its own" "1" \
  "$(as_app "$A" "select count(*) from role_permission where role_id=$R;" | grep -E '^[0-9]+$' | head -1)"
step 43 "and B cannot GRANT itself a permission on a role of A" "rejected" \
  "$(docker exec -i "$C" psql -U "$OWNER" -d "$DB" -tAX -v ON_ERROR_STOP=1 >/dev/null 2>&1 <<SQL && echo GOT_IN || echo rejected
begin; set local role agro_app; set local app.tenant_id = '$B';
insert into role_permission (role_id,permission_id) select $R, id from permission where code='plot:write';
commit;
SQL
)"

q "insert into membership (tenant_id,user_id) values ('$A','$U') on conflict do nothing;" >/dev/null
step 44 "A sees the user it shares a membership with" "1" \
  "$(as_app "$A" "select count(*) from app_user where id='$U';" | grep -E '^[0-9]+$' | head -1)"
step 45 "B does not, although app_user is a GLOBAL table with no tenant_id" "0" \
  "$(as_app "$B" "select count(*) from app_user where id='$U';" | grep -E '^[0-9]+$' | head -1)"
step 46 "and nobody using the product can read a password hash" "0" \
  "$(q "select count(*) from information_schema.role_table_grants
        where grantee='agro_app' and table_name='credential';")"

# --- a calibration is closed, never edited ----------------------------------------------------
CAL=$(q "insert into calibration (tenant_id,device_id,quantity_code,formula,provenance)
         values ('$A',$D,'soil_moisture','x*0.1','_t ensayo de laboratorio') returning id;")

as_app "$A" "update calibration set valid_to = now() where id=$CAL;" "$U" >/dev/null
step 47 "el producto SI puede cerrar una calibracion vigente" "1" \
  "$(q "select (valid_to is not null)::int from calibration where id=$CAL;")"

# And this is the one that matters: closing is allowed, rewriting is not. Not by a rule in the API
# -- by the grant. `formula` was never given to the application role in the first place.
step 48 "y NO puede reescribir la formula de una calibracion ya usada" "rejected" \
  "$(docker exec -i "$C" psql -U "$OWNER" -d "$DB" -tAX -v ON_ERROR_STOP=1 >/dev/null 2>&1 <<SQL && echo GOT_IN || echo rejected
begin; set local role agro_app; set local app.tenant_id = '$A'; set local app.user_id = '$U';
update calibration set formula = 'x*999' where id=$CAL;
commit;
SQL
)"

# --- the roles the applications actually connect as ---------------------------------------------
# A superuser is NOT subject to Row-Level Security. If the API ever points at `agro_admin`, every
# policy in this schema stops applying and every step above keeps passing -- which is why this is
# checked here and not left to a code review of a connection string.
step 49 "los tres roles de aplicacion pueden conectarse" "3" \
  "$(q "select count(*) from pg_roles where rolname in ('agro_app','agro_control','agro_auth')
        and rolcanlogin;")"

step 50 "y ninguno es superusuario ni puede saltear RLS" "0" \
  "$(q "select count(*) from pg_roles where rolname in ('agro_app','agro_control','agro_auth')
        and (rolsuper or rolbypassrls or rolcreaterole or rolcreatedb);")"

# FORCE only bites when the role is not the table's owner. If `agro_app` ever ends up owning a
# table -- a migration run with the wrong user -- its own policies stop constraining it.
step 51 "y ninguno es dueño de una tabla, que es lo que hace morder a FORCE" "0" \
  "$(q "select count(*) from pg_tables where schemaname='public'
        and tableowner in ('agro_app','agro_control','agro_auth');")"

echo
if [ "$bad" -eq 0 ]; then echo "==> OK: $ok of $((ok+bad)) steps green"; exit 0; fi
echo "==> FAIL: $bad of $((ok+bad)) steps red"; exit 1
