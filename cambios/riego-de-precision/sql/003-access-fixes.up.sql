-- 003 -- Three holes in the access layer, found while extending the schema, not while writing it.
--
-- WHAT DATA STAYS AND WHAT IS LOST (mandatory comment, AGENTS.md rule 7):
--   Nothing is lost. Adds policies, one role and one grant. No column changes, no data conversion.
--
-- WHY THIS IS A SEPARATE MIGRATION AND NOT AN EDIT OF 002:
--   002 is applied. Editing an applied migration makes the file disagree with the database, which
--   is the failure this project already hit once with a tool that existed and never ran. A fix
--   gets its own number.
--
-- THE THREE HOLES, and all three are of the same shape: a table nobody thought of as "tenant
-- data" because it carries no `tenant_id` column.
--
--   1. `role_permission` and `membership_role` have RLS DISABLED. They were skipped by the loop in
--      002 because that loop keys on `tenant_id`, and a pure join table has none. The consequence
--      is real: with a valid token for tenant A you could read which permissions the roles of
--      tenant B carry, and -- worse -- INSERT a row granting a permission to a role of B.
--      The fix is not to add a `tenant_id`: it is to ask the PARENT, which is where the tenancy
--      actually lives.
--
--   2. `app_user` is not granted to `agro_app` AT ALL. So the product cannot render the name of
--      the person who owns a membership -- every screen that shows "quien" was going to fail.
--      Granting it plainly is worse than the bug: `app_user` is global on purpose, so a plain
--      grant lets any tenant list every user of the system. It needs RLS scoped by membership.
--
--   3. `credential` has no reader. Authentication happens BEFORE there is a tenant -- that is what
--      authentication IS -- so it cannot be done by `agro_app`, which is defined by always having
--      one. It needs its own role, and that role must never see tenant data.

begin;

-- =============================================================================================
-- 1. The join tables: tenancy comes from the parent
-- =============================================================================================
-- Read mirrors `role`'s two-policy split exactly: the permissions of a GLOBAL template are
-- readable (you have to see what you are about to clone), the permissions of another tenant's
-- role are not. Write is narrower than read, and deliberately: `with check` omits the global case,
-- so nobody can edit a shared template through its join table.
alter table role_permission enable row level security;
alter table role_permission force  row level security;
create policy role_permission_own on role_permission for all to agro_app
  using (exists (select 1 from role r where r.id = role_permission.role_id
                 and (r.tenant_id is null
                      or r.tenant_id = current_setting('app.tenant_id', true)::uuid)))
  with check (exists (select 1 from role r where r.id = role_permission.role_id
                 and r.tenant_id = current_setting('app.tenant_id', true)::uuid));

-- `membership_role` has no global case: a membership always belongs to exactly one tenant.
alter table membership_role enable row level security;
alter table membership_role force  row level security;
create policy membership_role_own on membership_role for all to agro_app
  using (exists (select 1 from membership m where m.id = membership_role.membership_id
                 and m.tenant_id = current_setting('app.tenant_id', true)::uuid))
  with check (exists (select 1 from membership m where m.id = membership_role.membership_id
                 and m.tenant_id = current_setting('app.tenant_id', true)::uuid));

-- =============================================================================================
-- 2. `app_user`: global identity, visible only through membership
-- =============================================================================================
-- The row is global -- the same person working for two clients is ONE person, with one password
-- and one audit trail (001, section 2). What is per-tenant is the RIGHT TO SEE IT, and that right
-- is exactly "we share a membership".
alter table app_user enable row level security;
alter table app_user force  row level security;

create policy app_user_visible on app_user for select to agro_app
  using (exists (select 1 from membership m
                 where m.user_id = app_user.id
                   and m.tenant_id = current_setting('app.tenant_id', true)::uuid));

-- INSERT is separate and its check is `true`, which looks loose and is not: creating an identity
-- grants nothing. A brand-new user has no membership yet -- that is the whole point of the next
-- statement in the same transaction -- so a membership-scoped `with check` would make it
-- impossible to ever create the first user. The privilege that matters is INSERT on `membership`,
-- and that one is tenant-scoped by 002.
create policy app_user_create on app_user for insert to agro_app with check (true);

create policy app_user_update on app_user for update to agro_app
  using (exists (select 1 from membership m
                 where m.user_id = app_user.id
                   and m.tenant_id = current_setting('app.tenant_id', true)::uuid))
  with check (exists (select 1 from membership m
                 where m.user_id = app_user.id
                   and m.tenant_id = current_setting('app.tenant_id', true)::uuid));

grant select, insert, update on app_user to agro_app;

-- =============================================================================================
-- 3. `agro_auth`: the role that exists because login has no tenant
-- =============================================================================================
-- It sees identities and password hashes and NOTHING ELSE. No farm, no plot, no measurement. If
-- the authentication endpoint is ever compromised, what leaks is the hash list -- which is what
-- Argon2id is for -- and not the data of every client.
do $$
begin
  if not exists (select 1 from pg_roles where rolname='agro_auth') then create role agro_auth nologin; end if;
end $$;

grant usage on schema public to agro_auth;
grant select on app_user to agro_auth;
grant select, insert, update on credential to agro_auth;

-- `agro_auth` needs every row of `app_user`, because it has to find the user BY EMAIL before it
-- knows which tenant they belong to.
create policy app_user_auth on app_user for all to agro_auth using (true) with check (true);

-- `credential` gets RLS too, with a single policy for a single role. Not because a tenant could
-- read it -- `agro_app` has no grant -- but so that adding a grant later cannot silently open it:
-- with FORCE on and no policy for that role, the table reads as empty instead of as everything.
alter table credential enable row level security;
alter table credential force  row level security;
create policy credential_auth on credential for all to agro_auth using (true) with check (true);

commit;
