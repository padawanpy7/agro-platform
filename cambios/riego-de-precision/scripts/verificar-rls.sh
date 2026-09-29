#!/usr/bin/env bash
# verificar-rls.sh -- el test EN ROJO del aislamiento entre clientes.
#
# QUE PRUEBA, y por que estos siete pasos y no otros: los tres primeros los prueba todo el mundo.
# Los que se olvidan son el 5 (que A no pueda ESCRIBIR una fila de B), el 6 (que un token viejo no
# entre despues de la baja) y el 7 (que el dato del que se fue SIGA estando).
#
# QUIEN LO CORRE: cualquiera. No hay que saber nada del codigo -- se corre y dice OK o FALLA.
# Es el guion de QA del que habla `docs/api-de-control.md`.
#
#   bash cambios/riego-de-precision/scripts/verificar-rls.sh
#
# SALE 0 si todo pasa, 1 si algo falla. Lo llama `HECHO_CUANDO.md`.
#
# NO DEJA BASURA: al terminar borra los dos clientes de prueba, pase o falle.

set -uo pipefail

CONTENEDOR="${AGRO_PG_CONTENEDOR:-agro-postgres}"
BASE="${PGDATABASE:-agro}"
DUENIO="${PGUSER:-agro_admin}"

ok=0
fallo=0

# El filtro de TAGS no es cosmetico: con `returning id`, psql imprime el uuid Y la linea
# "INSERT 0 1", y la variable se queda con las dos. El error que sale despues -- "invalid input
# syntax for type uuid" -- manda a buscar el problema en el esquema cuando estaba en el shell.
TAGS='^(INSERT|UPDATE|DELETE|SELECT|CREATE|DROP|GRANT|ALTER|SET|BEGIN|COMMIT|ROLLBACK)[ 0-9]*$'

sql() {
  docker exec -i "$CONTENEDOR" psql -U "$DUENIO" -d "$BASE" -tAX -v ON_ERROR_STOP=1 -c "$1" 2>&1 \
    | grep -vE "$TAGS" | grep -v '^$'
}

# Corre una consulta COMO agro_app y con un tenant puesto. Es la unica forma en que el producto
# toca la base: rol sin privilegios + `app.tenant_id` de la transaccion.
como_app() {
  local tenant="$1" consulta="$2"
  docker exec -i "$CONTENEDOR" psql -U "$DUENIO" -d "$BASE" -tAX 2>&1 <<SQL
begin;
set local role agro_app;
set local app.tenant_id = '$tenant';
$consulta
commit;
SQL
}

paso() {
  local n="$1" desc="$2" esperado="$3" obtenido="$4"
  if [ "$obtenido" = "$esperado" ]; then
    printf '  OK   %s. %s\n' "$n" "$desc"
    ok=$((ok+1))
  else
    printf '  X    %s. %s\n' "$n" "$desc"
    printf '        esperaba: %s\n        obtuvo:   %s\n' "$esperado" "$obtenido"
    fallo=$((fallo+1))
  fi
}

limpiar() {
  sql "delete from tenant_modulo where tenant_id in
         (select id from cliente where nombre in ('_prueba_A','_prueba_B'));
       delete from cliente where nombre in ('_prueba_A','_prueba_B');" >/dev/null 2>&1
}
trap limpiar EXIT

echo "==> verificar-rls: aislamiento entre clientes ($CONTENEDOR/$BASE)"
limpiar

# --- 0. El esquema es el declarado -- contra el CATALOGO, no contra el archivo ------------------
# AGENTS.md §7: que una migracion figure aplicada no prueba que el esquema sea el declarado.
rls=$(sql "select count(*) from pg_tables
           where schemaname='public' and tablename in ('cliente','tenant_modulo')
             and rowsecurity;")
paso 0a "las dos tablas con datos de cliente tienen RLS activa" "2" "$rls"

forzada=$(sql "select count(*) from pg_class
               where relname in ('cliente','tenant_modulo') and relrowsecurity and relforcerowsecurity;")
paso 0b "y ademas FORCE (sin esto el dueño de la tabla saltea su propia RLS)" "2" "$forzada"

concheck=$(sql "select count(*) from pg_policies
                where schemaname='public' and tablename in ('cliente','tenant_modulo')
                  and with_check is not null;")
paso 0c "las policies declaran WITH CHECK explicito, no solo USING" "2" "$concheck"

# --- 1 y 2. Dos clientes, uno con todo y otro con un solo modulo -------------------------------
A=$(sql "insert into cliente (nombre) values ('_prueba_A') returning id;")
B=$(sql "insert into cliente (nombre) values ('_prueba_B') returning id;")
sql "insert into tenant_modulo (tenant_id, modulo_codigo)
     select '$A', codigo from modulo;" >/dev/null
sql "insert into tenant_modulo (tenant_id, modulo_codigo) values ('$B','riego');" >/dev/null

mods_a=$(sql "select count(*) from tenant_modulo where tenant_id='$A';")
mods_b=$(sql "select count(*) from tenant_modulo where tenant_id='$B';")
paso 1 "cliente A creado con todos los modulos" "6" "$mods_a"
paso 2 "cliente B creado con un solo modulo" "1" "$mods_b"

# --- 3. Sin tenant puesto: CERO filas ----------------------------------------------------------
# Es la promesa literal del design.md: "una query sin tenant no devuelve filas".
sin_tenant=$(docker exec -i "$CONTENEDOR" psql -U "$DUENIO" -d "$BASE" -tAX 2>&1 <<SQL
begin;
set local role agro_app;
select count(*) from cliente;
commit;
SQL
)
paso 3 "una consulta SIN app.tenant_id no devuelve ni una fila" "0" "$(echo "$sin_tenant" | grep -E '^[0-9]+$' | head -1)"

# --- 4. A no ve nada de B ----------------------------------------------------------------------
ve_a=$(como_app "$A" "select count(*) from cliente;" | grep -E '^[0-9]+$' | head -1)
paso 4a "con el tenant de A, A se ve a si mismo y a nadie mas" "1" "$ve_a"

ve_mods=$(como_app "$A" "select count(*) from tenant_modulo;" | grep -E '^[0-9]+$' | head -1)
paso 4b "y ve SOLO sus 6 modulos, no los 7 que hay en la tabla" "6" "$ve_mods"

# --- 5. A no puede ESCRIBIR una fila de B ------------------------------------------------------
# El que se olvida.
#
# LO QUE ESTE PASO NO DISTINGUE, medido con un control negativo el 29/09: al borrar la policy
# entera, el paso 5 SIGUE EN VERDE. Es correcto -- con RLS activa y CERO policies, Postgres niega
# todo -- pero significa que este paso no separa "restringido bien" de "negado todo". Los que SI
# cazaron la policy faltante fueron el 0c y el 4b.
#
# El escenario que este paso guarda de verdad es el futuro: el dia que alguien parta la policy en
# `FOR SELECT` + `FOR INSERT` y le ponga al insert un WITH CHECK permisivo. Ahi 0c y 4b siguen
# verdes y este es el unico que se cae.
escritura=$(como_app "$A" "insert into tenant_modulo (tenant_id, modulo_codigo) values ('$B','clima');")
if echo "$escritura" | grep -qi "row-level security\|viola"; then
  paso 5 "A NO puede insertar una fila con el tenant de B" "rechazado" "rechazado"
else
  paso 5 "A NO puede insertar una fila con el tenant de B" "rechazado" "ENTRO -- $(echo "$escritura" | tail -2 | tr '\n' ' ')"
fi

# --- 6. Baja de B: el token viejo deja de servir -----------------------------------------------
sql "update cliente set baja_en = now() where id='$B';" >/dev/null
ve_b=$(como_app "$B" "select count(*) from cliente;" | grep -E '^[0-9]+$' | head -1)
paso 6 "despues de la baja, un token viejo de B ya no ve nada" "0" "$ve_b"

# --- 7. Pero el dato de B SIGUE en la base -----------------------------------------------------
# Es el punto de la baja logica: "si un cliente se da de baja yo puedo seguir usando los datos
# recopilados para el ML". Si este paso da 0, la baja borro y no dio de baja.
queda=$(sql "select count(*) from tenant_modulo where tenant_id='$B';")
paso 7 "y el dato de B sigue existiendo para el ML" "1" "$queda"

echo
if [ "$fallo" -eq 0 ]; then
  echo "==> OK: $ok de $((ok+fallo)) pasos en verde"
  exit 0
fi
echo "==> FALLA: $fallo de $((ok+fallo)) pasos en rojo"
exit 1
