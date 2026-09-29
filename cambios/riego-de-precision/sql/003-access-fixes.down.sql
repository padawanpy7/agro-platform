-- 003 down -- REOPENS the three holes. Read that sentence again before running it.
--
-- WHAT DATA STAYS AND WHAT IS LOST (mandatory comment, AGENTS.md rule 7):
--   No data is lost, and that is what makes this down the dangerous one in the ticket: it does not
--   remove a table, it removes a DEFENCE. After running it, a token for one tenant can read and
--   write the role/permission joins of every other, and `app_user` goes back to being unreadable
--   by the product. It exists because a migration has to be reversible; it is not something to run
--   because a deploy looked odd.

begin;

drop policy if exists credential_auth on credential;
alter table credential disable row level security;

drop policy if exists app_user_auth   on app_user;
drop policy if exists app_user_update on app_user;
drop policy if exists app_user_create on app_user;
drop policy if exists app_user_visible on app_user;
alter table app_user disable row level security;
revoke select, insert, update on app_user from agro_app;

revoke select, insert, update on credential from agro_auth;
revoke select on app_user from agro_auth;
revoke usage on schema public from agro_auth;
-- The ROLE is not dropped: dropping a role that owns nothing is harmless, but if anything in the
-- cluster still references it the drop fails and takes the whole transaction with it. A nologin
-- role with no privileges is inert.

drop policy if exists membership_role_own on membership_role;
alter table membership_role disable row level security;
drop policy if exists role_permission_own on role_permission;
alter table role_permission disable row level security;

commit;
