-- 006 -- A calibration is CLOSED, never edited. Enforced by a column grant, not by a convention.
--
-- WHAT DATA STAYS AND WHAT IS LOST (mandatory comment, AGENTS.md rule 7):
--   Nothing is lost. It narrows one privilege on two tables. No column, row or constraint changes.
--
-- WHY THIS EXISTS:
--   `tasks.md` and the ledger have said since the first day that a calibration is not edited: the
--   one in force is closed and another is inserted. 002 wrote that down in a comment and then
--   granted plain UPDATE on the whole table, which allows exactly what the comment forbids --
--   rewriting `formula` or `provenance` of a calibration that is already in force, silently
--   changing what every measurement stored under it meant.
--
--   The fix is not a trigger and not a rule in the API. Postgres grants privileges PER COLUMN:
--   the application can write `valid_to` and nothing else. Closing still works; editing does not
--   reach the database. Same argument as the append-only tables -- a revoked privilege beats an
--   audit of a change that must not happen.
--
--   `evalscript` -- the satellite's calibration, same idea -- needs nothing here: 004 grants the
--   product only SELECT on it. Closing and superseding an evalscript is an operator action that
--   runs as `agro_admin`, so there is no privilege to narrow.

begin;

-- REVOKE then GRANT, in that order. A column grant does not replace a table-wide one: they add up,
-- so granting update(valid_to) while the table-wide grant is still there changes nothing at all.
revoke update on calibration from agro_app;
grant  update (valid_to) on calibration to agro_app;

commit;
