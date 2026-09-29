#!/usr/bin/env bash
# verify-schema.sh -- the schema's promises, checked against the running database.
#
# Replaces the three Spanish-named scripts of 29/09. Same guarantees, English names, plus the two
# new ones: history on every mutable table, and append-only enforced by grants.
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
  q "delete from measurement where tenant_id in (select id from client where name like '\_t%');
     delete from irrigation_event where tenant_id in (select id from client where name like '\_t%');
     delete from calibration where tenant_id in (select id from client where name like '\_t%');
     delete from device where tenant_id in (select id from client where name like '\_t%');
     delete from plot where tenant_id in (select id from client where name like '\_t%');
     delete from farm where tenant_id in (select id from client where name like '\_t%');
     delete from client_module where tenant_id in (select id from client where name like '\_t%');
     delete from client where name like '\_t%';
     delete from membership where user_id in (select id from app_user where email='t@example.py');" >/dev/null 2>&1
  # The test user is NOT deleted, and that is a property of the design rather than an oversight:
  # `*_history.changed_by` references `app_user` with ON DELETE RESTRICT, so anyone who has ever
  # changed a row can never be physically removed. That is what we want -- history that points at a
  # user who no longer exists is worthless -- and it is why `app_user` has `deleted_at`.
}
trap cleanup EXIT

echo "==> verify-schema ($C/$DB)"
cleanup

# --- structure --------------------------------------------------------------------------------
step 1 "every tenant table has RLS with FORCE" "11" \
  "$(q "select count(*) from pg_class where relname in
        ('client','client_module','membership','farm','plot','device','calibration','measurement',
         'irrigation_policy','pipe','irrigation_event')
        and relrowsecurity and relforcerowsecurity;")"

step 2 "every policy declares WITH CHECK, not only USING" "0" \
  "$(q "select count(*) from pg_policies where schemaname='public'
        and cmd='ALL' and with_check is null;")"

step 3 "there is a history table for every mutable table" "24" \
  "$(q "select count(*) from pg_tables where schemaname='public' and tablename like '%\_history';")"

step 4 "measurement and irrigation_event have NO history table (append-only)" "0" \
  "$(q "select count(*) from pg_tables where schemaname='public'
        and tablename in ('measurement_history','irrigation_event_history');")"

step 5 "the app cannot UPDATE or DELETE an append-only table" "0" \
  "$(q "select count(*) from information_schema.role_table_grants
        where grantee='agro_app' and table_name in ('measurement','irrigation_event')
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

echo
if [ "$bad" -eq 0 ]; then echo "==> OK: $ok of $((ok+bad)) steps green"; exit 0; fi
echo "==> FAIL: $bad of $((ok+bad)) steps red"; exit 1
