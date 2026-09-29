-- 007 down -- takes LOGIN away from the three application roles.
--
-- WHAT DATA STAYS AND WHAT IS LOST: nothing is lost, and nothing can connect either. After this,
-- the only role able to open a session is the superuser -- which is exactly the situation 007 was
-- written to end. It is here because a migration has to be reversible, not because it is a good
-- idea to run.

begin;
alter role agro_app     nologin;
alter role agro_control nologin;
alter role agro_auth    nologin;
commit;
