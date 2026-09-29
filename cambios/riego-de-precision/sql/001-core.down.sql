-- 001 down -- removes the core schema.
--
-- WHAT DATA STAYS AND WHAT IS LOST (mandatory comment, AGENTS.md rule 7):
--   EVERYTHING. Clients, users, farms, plots, devices, every calibration and every measurement.
--   This is not a rollback that keeps anything: it is the schema going away.
--   The EXTENSIONS stay (postgis, timescaledb, pgcrypto): they are shared with anything else in
--   the database and dropping them is not this migration's business.
--   The ROLES stay for the same reason, and because they are cluster-wide, not schema objects.

begin;

drop table if exists
  irrigation_event, irrigation_decision, pipe, pipe_type, irrigation_policy, irrigation_method,
  measurement, calibration, quantity, unit,
  device, device_type, plot, farm,
  membership_role, role_permission, role, permission, action, resource,
  membership, credential, app_user,
  client_module, module, client cascade;

commit;
