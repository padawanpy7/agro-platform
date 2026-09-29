-- 001 -- DESHACER el nucleo del multi-cliente.
--
-- QUE DATO QUEDA Y QUE SE PIERDE (comentario obligatorio, AGENTS.md regla 7):
--   SE PIERDE TODO. Esta bajada borra `cliente`, `modulo` y `tenant_modulo` con sus filas.
--   No hay forma de "deshacer parcialmente": si habia clientes cargados, se van.
--   POR ESO ESTA BAJADA ES DE DESARROLLO. En una base con datos de un cliente real, la vuelta
--   atras NO es correr esto: es restaurar de backup. Un `drop table cliente` en produccion se
--   lleva por delante el historico que la regla 1 del contrato dice que no se puede reconstruir.
--
--   Las extensiones NO se borran: `postgis` y `timescaledb` pueden tener otros usuarios en la
--   misma base, y tirarlas por deshacer una migracion es romper de mas.
--   Los roles TAMPOCO: pueden tener permisos en otras bases del mismo cluster.

begin;

drop table if exists tenant_modulo;
drop table if exists modulo;
drop table if exists cliente;

commit;
