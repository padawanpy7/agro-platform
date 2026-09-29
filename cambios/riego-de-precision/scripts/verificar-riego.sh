#!/usr/bin/env bash
# verificar-riego.sh -- que el registro del riego sirva para ML y no solo para mirar.
#
# QUE PRUEBA: las cuatro promesas del proposal que, si se rompen, dejan un historico que describe
# pero no predice -- la condicion que causo la decision, los litros medidos separados de los
# estimados, la politica que no se edita, y que la nube NO pueda mandar una orden de abrir.
#
#   bash cambios/riego-de-precision/scripts/verificar-riego.sh
#
# SALE 0 si todo pasa, 1 si algo falla. No deja basura.

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
  sql "delete from riego_evento where tenant_id in (select id from cliente where nombre='_prueba_R');
       delete from tramo where tenant_id in (select id from cliente where nombre='_prueba_R');
       delete from politica_riego where tenant_id in (select id from cliente where nombre='_prueba_R');
       delete from parcela where tenant_id in (select id from cliente where nombre='_prueba_R');
       delete from campo where tenant_id in (select id from cliente where nombre='_prueba_R');
       delete from cliente where nombre='_prueba_R';" >/dev/null 2>&1
}
trap limpiar EXIT

echo "==> verificar-riego: que el registro del riego sirva para ML ($CONTENEDOR/$BASE)"
limpiar

T=$(sql "insert into cliente (nombre) values ('_prueba_R') returning id;")
C=$(sql "insert into campo (tenant_id, nombre) values ('$T','campo R') returning id;")
P=$(sql "insert into parcela (tenant_id, campo_id, nombre, geom) values
         ('$T',$C,'lote R',
          st_geomfromtext('POLYGON((-56.88 -25.32,-56.85 -25.32,-56.85 -25.35,-56.88 -25.35,-56.88 -25.32))',4326))
         returning id;")

# --- 0. riego_evento es hypertable --------------------------------------------------------------
hyper=$(sql "select count(*) from timescaledb_information.hypertables where hypertable_name='riego_evento';")
paso 0 "riego_evento es una hypertable (segun el catalogo de Timescale)" "1" "$hyper"

# --- 1. NO existe tabla de ORDENES ---------------------------------------------------------------
# La regla del proposal: la nube manda POLITICA, nunca el abrir y cerrar de una valvula. La forma
# de hacerla cumplir en el esquema es que no haya DONDE guardar una orden.
ordenes=$(sql "select count(*) from information_schema.tables
               where table_schema='public' and table_name in ('orden','orden_riego','comando');")
paso 1 "no existe ninguna tabla de ordenes: la nube no tiene donde escribir un 'abri la valvula'" "0" "$ordenes"

# --- 2. Una politica de goteo sin umbral es RECHAZADA --------------------------------------------
# Una politica mal formada llega al campo y decide riegos. Se valida en la base, no en la API.
mala=$(sql_puede_fallar "insert into politica_riego (tenant_id, parcela_id, metodo_codigo, parametros)
        values ('$T',$P,'goteo','{\"umbral_arranque\": 22}'::jsonb);")
if echo "$mala" | grep -qi "viola\|check"; then
  paso 2 "una politica de goteo SIN los cinco parametros es rechazada por la base" "rechazado" "rechazado"
else
  paso 2 "una politica de goteo SIN los cinco parametros es rechazada por la base" "rechazado" "ENTRO"
fi

POL=$(sql "insert into politica_riego (tenant_id, parcela_id, metodo_codigo, parametros, creada_por)
     values ('$T',$P,'goteo',
       '{\"umbral_arranque\":22,\"umbral_corte\":30,\"ventana_desde\":\"05:00\",
         \"ventana_hasta\":\"09:00\",\"minutos_maximos\":45}'::jsonb,'prueba')
     returning id;")

# --- 3. Una sola politica vigente por parcela -----------------------------------------------------
dos=$(sql_puede_fallar "insert into politica_riego (tenant_id, parcela_id, metodo_codigo, parametros)
       values ('$T',$P,'goteo',
         '{\"umbral_arranque\":18,\"umbral_corte\":28,\"ventana_desde\":\"06:00\",
           \"ventana_hasta\":\"08:00\",\"minutos_maximos\":30}'::jsonb);")
if echo "$dos" | grep -qi "duplicate\|unique\|ya existe"; then
  paso 3 "no puede haber DOS politicas vigentes en la misma parcela" "rechazado" "rechazado"
else
  paso 3 "no puede haber DOS politicas vigentes en la misma parcela" "rechazado" "ENTRO"
fi

# --- 4. El arroz usa OTRA forma de politica, sin tocar el esquema ---------------------------------
# El metodo es una FILA. La politica cambia de forma; el evento no.
P2=$(sql "insert into parcela (tenant_id, campo_id, nombre, geom) values
          ('$T',$C,'arrocera R',
           st_geomfromtext('POLYGON((-56.84 -25.32,-56.82 -25.32,-56.82 -25.34,-56.84 -25.34,-56.84 -25.32))',4326))
          returning id;")
sql "insert into politica_riego (tenant_id, parcela_id, metodo_codigo, parametros)
     values ('$T',$P2,'inundacion',
       '{\"lamina_objetivo_cm\":10,\"entrada_agua\":\"2026-11-01\",\"salida_agua\":\"2027-02-15\"}'::jsonb);" >/dev/null
arroz=$(sql "select metodo_codigo from politica_riego where parcela_id=$P2;")
paso 4 "el arroz guarda una politica de OTRA forma, sin migracion" "inundacion" "$arroz"

# --- 5. El evento guarda la CONDICION que lo causo -------------------------------------------------
sql "insert into riego_evento (tenant_id, parcela_id, decidido_en, condicion, decision,
                               politica_id, motivo, minutos_efectivos, litros_medidos, litros_estimados)
     values ('$T',$P, now(),
       '{\"humedad_30cm\":19.4,\"sensores\":[1,2],\"lluvia_24h_mm\":0}'::jsonb,
       'regar', $POL, 'humedad bajo el umbral de arranque', 32.0, 1240.0, 1180.0);" >/dev/null
cond=$(sql "select condicion->>'humedad_30cm' from riego_evento where parcela_id=$P;")
paso 5 "el evento guarda QUE LEYO, no solo que decidio" "19.4" "$cond"

# --- 6. Litros medidos y estimados en columnas SEPARADAS -------------------------------------------
# El que importa: si un dia alguien escribe el estimado en la columna del medido, en dos años
# nadie puede distinguir un caudalimetro de una cuenta.
dif=$(sql "select (litros_medidos <> litros_estimados)::int from riego_evento where parcela_id=$P;")
paso 6 "los litros medidos y los estimados se guardan por separado y NO coinciden" "1" "$dif"

# --- 7. Sin caudalimetro, el medido queda NULL -- no 0 ---------------------------------------------
sql "insert into riego_evento (tenant_id, parcela_id, decidido_en, condicion, decision,
                               politica_id, minutos_efectivos, litros_estimados)
     values ('$T',$P, now() - interval '1 day',
       '{\"humedad_30cm\":21.0}'::jsonb, 'regar', $POL, 20.0, 700.0);" >/dev/null
nulo=$(sql "select (litros_medidos is null)::int from riego_evento
            where parcela_id=$P and decidido_en < now() - interval '12 hours';")
paso 7 "sin caudalimetro, litros_medidos queda NULL y NO se rellena con el estimado" "1" "$nulo"

# --- 8. La decision 'conservador' existe y se registra ---------------------------------------------
# El proposal lo exige: a los N dias sin politica nueva cae al programa conservador Y LO REGISTRA.
# Si no hubiera donde anotarlo, la caida seria silenciosa.
sql "insert into riego_evento (tenant_id, parcela_id, decidido_en, condicion, decision, motivo,
                               minutos_efectivos, litros_estimados)
     values ('$T',$P, now() - interval '2 days',
       '{\"dias_sin_politica\":8}'::jsonb, 'conservador',
       'ocho dias sin politica nueva', 10.0, 300.0);" >/dev/null
consv=$(sql "select count(*) from riego_evento where parcela_id=$P and decision='conservador';")
paso 8 "la caida al programa conservador se REGISTRA, no es silenciosa" "1" "$consv"

# --- 9. La topologia de la cañeria: que cuelga de que -----------------------------------------------
PR=$(sql "insert into tramo (tenant_id, parcela_id, tipo, diametro_mm, largo_m)
          values ('$T',$P,'principal',63,120) returning id;")
PL=$(sql "insert into tramo (tenant_id, parcela_id, padre_id, tipo, diametro_mm, largo_m)
          values ('$T',$P,$PR,'portalaterales',40,100) returning id;")
sql "insert into tramo (tenant_id, parcela_id, padre_id, tipo, largo_m)
     values ('$T',$P,$PL,'cinta_goteo',100);" >/dev/null
cuelgan=$(sql "with recursive bajo as (
                 select id from tramo where id=$PR
                 union all select t.id from tramo t join bajo b on t.padre_id=b.id)
               select count(*) from bajo;")
paso 9 "se puede recorrer que cuelga de la principal (el grafo de la cañeria)" "3" "$cuelgan"

# --- 10. Un tramo sin geometria es valido -----------------------------------------------------------
# La topologia primero, la linea despues: se agrega caminando con el telefono cualquier dia.
sin_geom=$(sql "select (geom is null)::int from tramo where id=$PR;")
paso 10 "un tramo puede tener largo y padre SIN tener la linea dibujada" "1" "$sin_geom"

echo
if [ "$fallo" -eq 0 ]; then
  echo "==> OK: $ok de $((ok+fallo)) pasos en verde"; exit 0
fi
echo "==> FALLA: $fallo de $((ok+fallo)) pasos en rojo"; exit 1
