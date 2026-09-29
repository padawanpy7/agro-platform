-- 007 -- The three application roles can LOG IN. Their passwords are not here and never will be.
--
-- WHAT DATA STAYS AND WHAT IS LOST (mandatory comment, AGENTS.md rule 7):
--   Nothing is lost. It flips one attribute on three roles.
--
-- WHY IT EXISTS, and it is a hole that only shows up the day something tries to connect:
--   001 and 003 created `agro_app`, `agro_control` and `agro_auth` as NOLOGIN. Nothing could
--   connect as them, so the only role left able to open a session was `agro_admin` -- which is the
--   container superuser. AND A SUPERUSER IS NOT SUBJECT TO ROW-LEVEL SECURITY. An API pointed at
--   `agro_admin` would pass every test in `verify-schema.sh` and serve every client's data to
--   every client, because the isolation the whole schema is built on simply does not apply to it.
--
--   So: the roles log in, none of them is superuser, and none of them owns a table -- which is
--   what makes FORCE ROW LEVEL SECURITY bite.
--
-- WHERE THE PASSWORD IS:
--   Not in this file, not in this repo, not even encrypted. In staging the platform generates it
--   and seals it with SOPS+age; the private key lives in the cluster and does not leave. Locally
--   it comes from `.env`, which is gitignored. Git says WHO logs in; the secret says HOW.
--   A migration that carried a password would put it in the history of the repository forever.

begin;

alter role agro_app     login;
alter role agro_control login;
alter role agro_auth    login;

-- Said explicitly rather than assumed. `nosuperuser` is what keeps RLS applying to them, and
-- `nocreatedb nocreaterole nobypassrls` closes the three ways a role gets around its own box.
alter role agro_app     nosuperuser nocreatedb nocreaterole nobypassrls;
alter role agro_control nosuperuser nocreatedb nocreaterole nobypassrls;
alter role agro_auth    nosuperuser nocreatedb nocreaterole nobypassrls;

commit;
