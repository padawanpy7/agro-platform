-- 003 -- DESHACER el riego.
--
-- QUE DATO QUEDA Y QUE SE PIERDE (comentario obligatorio, AGENTS.md regla 7):
--   SE PIERDE `riego_evento` ENTERO, que es LA ETIQUETA DE ML de este producto: cada decision de
--   riego con la condicion que la causo y el resultado que tuvo. Eso no se reconstruye desde
--   `medicion`: habria que adivinar que sensores miro el controlador y con que politica.
--
--   Tambien se pierde la topologia de la cañeria -- de que tramo cuelga cual --, que solo existe
--   en la cabeza del que la instalo.
--
--   DE DESARROLLO Y NADA MAS. En una base con datos reales la vuelta atras es restaurar de backup.

begin;

drop table if exists riego_evento;
drop table if exists tramo;
drop table if exists politica_riego;
drop table if exists metodo_de_riego;

commit;
