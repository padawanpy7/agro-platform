-- 002 -- DESHACER la geografia y la medicion.
--
-- QUE DATO QUEDA Y QUE SE PIERDE (comentario obligatorio, AGENTS.md regla 7):
--   SE PIERDE TODO EL HISTORICO DE MEDICIONES, y eso es lo mas caro que este proyecto puede
--   perder: es el activo entero. Un anio de serie de un sensor NO se reconstruye -- ese momento
--   ya paso y nadie lo volvio a medir.
--
--   POR ESO ESTA BAJADA ES DE DESARROLLO Y NADA MAS. En una base con datos reales, volver atras
--   NO es correr esto: es restaurar de backup. Si alguien la corre en produccion, el dato no
--   vuelve.
--
--   `magnitud` se borra tambien, y es catalogo: eso si se reconstruye con la 002 de nuevo.

begin;

drop table if exists medicion;
drop table if exists calibracion;
drop table if exists dispositivo;
drop table if exists parcela;
drop table if exists campo;
drop table if exists magnitud;

commit;
