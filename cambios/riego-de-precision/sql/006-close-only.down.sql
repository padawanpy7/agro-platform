-- 006 down -- gives the application back the table-wide UPDATE on `calibration`.
--
-- WHAT DATA STAYS AND WHAT IS LOST: nothing is lost. It widens a privilege back.
--   Note what going down actually means here: the product regains the ability to REWRITE a
--   calibration that measurements already point at. Rolling this one back is the only down in this
--   ticket that makes the database less safe than it was, which is why it says so out loud.

begin;
revoke update (valid_to) on calibration from agro_app;
grant  update on calibration to agro_app;
commit;
