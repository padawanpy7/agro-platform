#!/usr/bin/env bash
# apply-schema.sh -- applies sql/*.up.sql in order against the development database.
#
# It existed nowhere until 29/09, and that was a real gap: the database of this VPS had been built
# by pasting files into psql by hand, so nothing proved that the FILES rebuild it. A schema that
# only exists in a running container is not a schema, it is a survivor.
#
#   bash cambios/riego-de-precision/scripts/apply-schema.sh            # apply, stop at first error
#   bash cambios/riego-de-precision/scripts/apply-schema.sh --reset    # drop everything first
#   bash cambios/riego-de-precision/scripts/apply-schema.sh --down     # run the down files, newest first
#
# --reset DROPS THE SCHEMA. It is for the development database of this VPS, which holds no real
# data and is not exposed to the internet. It refuses to run unless AGRO_ALLOW_RESET=1, so a
# fat-fingered rerun cannot wipe anything by itself.

set -euo pipefail
C="${AGRO_PG_CONTAINER:-agro-postgres}"
DB="${PGDATABASE:-agro}"
OWNER="${PGUSER:-agro_admin}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../sql" && pwd)"

run_sql() { docker exec -i "$C" psql -U "$OWNER" -d "$DB" -v ON_ERROR_STOP=1 -X -q; }

# --down exists so the down migrations are RUN and not just written. A down file that nobody
# executes is a file that claims to be a rollback; `--down` followed by a plain run is the only
# thing that proves it. Same guard as --reset, because it drops just as much.
if [ "${1:-}" = "--down" ]; then
  if [ "${AGRO_ALLOW_RESET:-}" != "1" ]; then
    echo "--down drops what the migrations created. Re-run with AGRO_ALLOW_RESET=1." >&2
    exit 2
  fi
  echo "==> reverting $DIR/*.down.sql (newest first)"
  for f in $(ls -r "$DIR"/*.down.sql); do
    printf '  %s ... ' "$(basename "$f")"
    if run_sql < "$f"; then echo ok; else echo FAIL; exit 1; fi
  done
  echo "==> reverted: $(docker exec -i "$C" psql -U "$OWNER" -d "$DB" -tAX \
    -c "select count(*) from pg_tables where schemaname='public';" | tr -d '[:space:]') tables left"
  exit 0
fi

if [ "${1:-}" = "--reset" ]; then
  if [ "${AGRO_ALLOW_RESET:-}" != "1" ]; then
    echo "--reset drops the schema. Re-run with AGRO_ALLOW_RESET=1 if that is what you want." >&2
    exit 2
  fi
  echo "==> dropping schema public"
  # The roles survive: they are cluster-wide, not schema objects, and 001 recreates them anyway.
  run_sql <<'SQL'
drop schema public cascade;
create schema public;
grant all on schema public to public;
SQL
fi

echo "==> applying $DIR/*.up.sql"
for f in "$DIR"/*.up.sql; do
  printf '  %s ... ' "$(basename "$f")"
  if run_sql < "$f"; then echo ok; else echo FAIL; exit 1; fi
done

echo "==> done: $(docker exec -i "$C" psql -U "$OWNER" -d "$DB" -tAX \
  -c "select count(*) from pg_tables where schemaname='public';" | tr -d '[:space:]') tables"
