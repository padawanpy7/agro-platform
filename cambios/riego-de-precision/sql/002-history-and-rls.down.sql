-- 002 down -- removes the history layer, the policies and the grants.
--
-- WHAT DATA STAYS AND WHAT IS LOST (mandatory comment, AGENTS.md rule 7):
--   THE ENTIRE AUDIT TRAIL IS LOST. Every `<tabla>_history` row -- every value as it was before
--   somebody changed it, and who changed it -- goes with the tables. The current data survives
--   untouched; what disappears is how it got that way, and that cannot be reconstructed.
--   It also turns OFF Row-Level Security on eleven tables: after this, a query with no tenant sees
--   everything. Nothing here is a reason to run it in a database with a real client in it.

begin;

do $$
declare t text;
begin
  for t in select tablename from pg_tables
           where schemaname='public' and tablename like '%\_history' loop
    execute format('drop table if exists %I cascade', t);
  end loop;
end $$;

do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname='public' loop
    execute format('drop policy if exists %I on %I', r.policyname, r.tablename);
  end loop;
  for r in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table %I disable row level security', r.tablename);
  end loop;
end $$;

drop function if exists record_history() cascade;
drop function if exists current_app_user() cascade;

-- The seeds go with it: they were inserted by 002, so leaving them would make a re-run of the up
-- migration collide on codes that "should not be there yet".
delete from irrigation_decision; delete from pipe_type; delete from irrigation_method;
delete from quantity; delete from unit; delete from device_type;
delete from permission; delete from resource; delete from action; delete from module;

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname='public' loop
    execute format('revoke all on %I from agro_app, agro_control', t);
  end loop;
end $$;
revoke usage on schema public from agro_app, agro_control;

commit;
