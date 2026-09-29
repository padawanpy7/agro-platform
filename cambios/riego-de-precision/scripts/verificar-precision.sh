#!/usr/bin/env bash
# verificar-precision.sh -- que el dato se guarde de forma que SIRVA PARA ML.
#
# QUE PRUEBA: las cinco promesas del design.md que, si se rompen, no se arreglan despues --
# crudo junto a calibrado, los dos relojes, NULL que no es 0, la geometria que ata todo, y que
# `medicion` sea de verdad una hypertable.
#
# Y EL ULTIMO PASO ES EL QUE MAS IMPORTA: que agregar una magnitud nueva sea UNA FILA y no una
# migracion. Es la decision de la pregunta 4 puesta a prueba.
#
#   bash cambios/riego-de-precision/scripts/verificar-precision.sh
#
# SALE 0 si todo pasa, 1 si algo falla. Lo llama `HECHO_CUANDO.md`. No deja basura.

set -uo pipefail

CONTENEDOR="${AGRO_PG_CONTENEDOR:-agro-postgres}"
BASE="${PGDATABASE:-agro}"
DUENIO="${PGUSER:-agro_admin}"

ok=0; fallo=0
TAGS='^(INSERT|UPDATE|DELETE|SELECT|CREATE|DROP|GRANT|ALTER|SET|BEGIN|COMMIT|ROLLBACK|DO)[ 0-9]*$'

sql() {
  docker exec -i "$CONTENEDOR" psql -U "$DUENIO" -d "$BASE" -tAX -v ON_ERROR_STOP=1 -c "$1" 2>&1 \
    | grep -vE "$TAGS" | grep -v '^$'
}
# Sin ON_ERROR_STOP: se usa cuando se ESPERA que falle.
sql_puede_fallar() {
  docker exec -i "$CONTENEDOR" psql -U "$DUENIO" -d "$BASE" -tAX -c "$1" 2>&1
}

paso() {
  local n="$1" desc="$2" esperado="$3" obtenido="$4"
  if [ "$obtenido" = "$esperado" ]; then
    printf '  OK   %s. %s\n' "$n" "$desc"; ok=$((ok+1))
  else
    printf '  X    %s. %s\n' "$n" "$desc"
    printf '        esperaba: %s\n        obtuvo:   %s\n' "$esperado" "$obtenido"; fallo=$((fallo+1))
  fi
}

limpiar() {
  sql "delete from medicion where tenant_id in (select id from cliente where nombre='_prueba_P');
       delete from calibracion where tenant_id in (select id from cliente where nombre='_prueba_P');
       delete from dispositivo where tenant_id in (select id from cliente where nombre='_prueba_P');
       delete from parcela where tenant_id in (select id from cliente where nombre='_prueba_P');
       delete from campo where tenant_id in (select id from cliente where nombre='_prueba_P');
       delete from cliente where nombre='_prueba_P';
       delete from magnitud where codigo='lamina_agua_pru';" >/dev/null 2>&1
}
trap limpiar EXIT

echo "==> verificar-precision: que el dato sirva para ML ($CONTENEDOR/$BASE)"
limpiar

# --- 0. Es una hypertable DE VERDAD ------------------------------------------------------------
# Contra el catalogo de Timescale, no contra el archivo: que la migracion diga
# `create_hypertable` no prueba que haya quedado.
hyper=$(sql "select count(*) from timescaledb_information.hypertables
             where hypertable_name='medicion';")
paso 0 "medicion es una hypertable (segun el catalogo de Timescale)" "1" "$hyper"

# --- Datos de prueba ---------------------------------------------------------------------------
T=$(sql "insert into cliente (nombre) values ('_prueba_P') returning id;")
C=$(sql "insert into campo (tenant_id, nombre, geom) values
         ('$T','campo de prueba',
          st_geomfromtext('POLYGON((-56.90 -25.30,-56.80 -25.30,-56.80 -25.40,-56.90 -25.40,-56.90 -25.30))',4326))
         returning id;")
P=$(sql "insert into parcela (tenant_id, campo_id, nombre, geom) values
         ('$T',$C,'lote de prueba',
          st_geomfromtext('POLYGON((-56.88 -25.32,-56.85 -25.32,-56.85 -25.35,-56.88 -25.35,-56.88 -25.32))',4326))
         returning id;")
D=$(sql "insert into dispositivo (tenant_id, nombre, tipo, punto) values
         ('$T','sensor de prueba','sensor_suelo',
          st_setsrid(st_makepoint(-56.86,-25.33),4326))
         returning id;")

# --- 1. La parcela cae DENTRO del campo ---------------------------------------------------------
dentro=$(sql "select st_contains(c.geom, p.geom)::int from campo c join parcela p on p.campo_id=c.id
              where c.id=$C;")
paso 1 "la parcela cae adentro del campo (los dos niveles del mapa)" "1" "$dentro"

# --- 2. El dispositivo se asigna SOLO, por geometria ---------------------------------------------
# Nadie declaro que este sensor pertenece a esta parcela. Sale de ST_Contains.
asignada=$(sql "select p.id from parcela p, dispositivo d
                where d.id=$D and st_contains(p.geom, d.punto);")
paso 2 "el dispositivo cae en su parcela SIN que nadie lo declare" "$P" "$asignada"

# --- 3. Los dos relojes se guardan separados ----------------------------------------------------
# Se simula lo que pasa de verdad: el gateway encolo tres dias y recien ahi llego.
sql "insert into medicion (tenant_id, dispositivo_id, magnitud_codigo, medido_en, recibido_en,
                           valor_crudo, valor_calibrado, punto)
     values ('$T',$D,'humedad_suelo', now() - interval '3 days', now(),
             512.0, 23.4, st_setsrid(st_makepoint(-56.86,-25.33),4326));" >/dev/null

atraso=$(sql "select round(extract(epoch from (recibido_en - medido_en))/86400)::int
              from medicion where dispositivo_id=$D and magnitud_codigo='humedad_suelo';")
paso 3 "medido_en y recibido_en quedan separados (3 dias de atraso del gateway)" "3" "$atraso"

# --- 4. El crudo sobrevive al lado del calibrado -------------------------------------------------
crudo=$(sql "select valor_crudo::text from medicion where dispositivo_id=$D;")
paso 4 "el valor CRUDO se guarda, no solo el calibrado" "512" "$crudo"

# --- 5. Sin crudo no entra ----------------------------------------------------------------------
sin_crudo=$(sql_puede_fallar "insert into medicion (tenant_id, dispositivo_id, magnitud_codigo,
              medido_en, valor_calibrado) values ('$T',$D,'humedad_suelo', now(), 20.0);")
if echo "$sin_crudo" | grep -qi "null value\|not-null\|viola"; then
  paso 5 "una medicion SIN valor crudo es rechazada" "rechazado" "rechazado"
else
  paso 5 "una medicion SIN valor crudo es rechazada" "rechazado" "ENTRO"
fi

# --- 6. NULL NO es 0 ----------------------------------------------------------------------------
# Un sensor sin calibracion vigente guarda crudo y deja calibrado en NULL. Si alguna vez eso se
# rellena con 0, el modelo aprende que el suelo se seca de golpe.
sql "insert into medicion (tenant_id, dispositivo_id, magnitud_codigo, medido_en, valor_crudo)
     values ('$T',$D,'temperatura_suelo', now(), 800.0);" >/dev/null
es_null=$(sql "select (valor_calibrado is null)::int from medicion
               where dispositivo_id=$D and magnitud_codigo='temperatura_suelo';")
paso 6 "sin calibracion, el calibrado queda NULL y NO se rellena con 0" "1" "$es_null"

# --- 7. La calibracion exige procedencia ---------------------------------------------------------
sin_proc=$(sql_puede_fallar "insert into calibracion (tenant_id, dispositivo_id, magnitud_codigo,
             formula, procedencia) values ('$T',$D,'humedad_suelo','x*0.1','   ');")
if echo "$sin_proc" | grep -qi "viola\|check"; then
  paso 7 "una calibracion SIN procedencia es rechazada" "rechazado" "rechazado"
else
  paso 7 "una calibracion SIN procedencia es rechazada" "rechazado" "ENTRO"
fi

# --- 8. Una sola calibracion vigente por dispositivo y magnitud ----------------------------------
sql "insert into calibracion (tenant_id, dispositivo_id, magnitud_codigo, formula, procedencia)
     values ('$T',$D,'humedad_suelo','(x-320)/6.4','ensayo propio en balde, 29/09/2026');" >/dev/null
dos=$(sql_puede_fallar "insert into calibracion (tenant_id, dispositivo_id, magnitud_codigo,
        formula, procedencia) values ('$T',$D,'humedad_suelo','otra','fabricante');")
if echo "$dos" | grep -qi "duplicate\|unique\|ya existe"; then
  paso 8 "no puede haber DOS calibraciones vigentes del mismo sensor y magnitud" "rechazado" "rechazado"
else
  paso 8 "no puede haber DOS calibraciones vigentes del mismo sensor y magnitud" "rechazado" "ENTRO"
fi

# --- 9. RLS en las cinco tablas nuevas ------------------------------------------------------------
rls=$(sql "select count(*) from pg_class
           where relname in ('campo','parcela','dispositivo','calibracion','medicion')
             and relrowsecurity and relforcerowsecurity;")
paso 9 "las cinco tablas nuevas tienen RLS con FORCE" "5" "$rls"

# --- 10. UNA MAGNITUD NUEVA ES UNA FILA -----------------------------------------------------------
# El codigo va SIN guion bajo adelante: la primera version de este test usaba `_prueba_lamina` y el
# check `^[a-z][a-z0-9_]*$` de `magnitud` lo rechazo. Era el test el que estaba mal, no el esquema --
# y que la restriccion lo cazara es justamente lo que se queria.
# EL PASO QUE JUSTIFICA LA DECISION DE LA PREGUNTA 4. Se agrega la lamina de agua del arroz --una
# magnitud de un metodo de riego que este producto todavia no soporta-- y se mide con ella. Sin
# tocar el esquema. Con la tabla ANCHA, esto habria sido una migracion.
sql "insert into magnitud (codigo, nombre, unidad, minimo, maximo)
     values ('lamina_agua_pru','Lamina de agua sobre el lote','cm',0,50);" >/dev/null
sql "insert into medicion (tenant_id, dispositivo_id, magnitud_codigo, medido_en, valor_crudo)
     values ('$T',$D,'lamina_agua_pru', now(), 12.5);" >/dev/null
nueva=$(sql "select valor_crudo::text from medicion where magnitud_codigo='lamina_agua_pru';")
paso 10 "una magnitud NUEVA (arroz) se mide sin tocar el esquema: una FILA, no una migracion" "12.5" "$nueva"

echo
if [ "$fallo" -eq 0 ]; then
  echo "==> OK: $ok de $((ok+fallo)) pasos en verde"; exit 0
fi
echo "==> FALLA: $fallo de $((ok+fallo)) pasos en rojo"; exit 1
