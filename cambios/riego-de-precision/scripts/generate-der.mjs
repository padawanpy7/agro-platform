#!/usr/bin/env node
// generate-der.mjs -- builds the ER diagram FROM THE RUNNING DATABASE, never from the .sql files.
//
// Why from the catalog and not from the migrations: a diagram drawn by hand is a claim, and this
// repo's rule is that a claim is not a fact until something measures it. The Spanish
// `modelo-de-datos.html` that shipped on 25/09 is the proof -- it still showed `parcela`,
// `campania` and `medicion` four days after the schema was renamed to English, and nobody noticed,
// because nothing could notice. This script cannot be wrong about a column: it asks Postgres.
//
//   node cambios/riego-de-precision/scripts/generate-der.mjs
//
// It writes one file and checks another:
//   WRITES  cambios/riego-de-precision/docs/der.md   every table, every column, every key, plus a
//           complete Mermaid `erDiagram` with all 130 foreign keys
//   CHECKS  desarrollo/diagramas/modelo-de-datos.json -- the hand-drawn presentation diagram. It
//           does not generate it; it refuses to pass if that diagram names a table that no longer
//           exists. That check is the whole reason the Spanish diagram could rot for four days.
//
// WHY THE COMPLETE DER IS MERMAID AND NOT ARCHIFY, because it was tried:
//   archify draws diagrams where every line is placed on purpose -- it rejects an edge that
//   crosses another or passes through a box, at BOTH quality profiles. A generated DER with 62
//   tables and 100 arrows cannot satisfy that and should not: there is no arrangement of 62 boxes
//   in which a hundred relationships do not cross. So the two jobs are split. archify draws the
//   map a person reads (`modelo-de-datos`); Mermaid carries the exhaustive graph, where crossings
//   are the honest shape of the data and the reader zooms instead of admiring it.

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CONTAINER = process.env.AGRO_PG_CONTAINER || 'agro-postgres';
const DB = process.env.PGDATABASE || 'agro';
const USER = process.env.PGUSER || 'agro_admin';

function q(sql) {
  const out = execFileSync('docker',
    ['exec', '-i', CONTAINER, 'psql', '-U', USER, '-d', DB, '-tAX', '-F', '\u0001', '-c', sql],
    { encoding: 'utf8' });
  return out.split('\n').filter(Boolean).map((l) => l.split('\u0001'));
}

// ---------------------------------------------------------------------------------------------
// The regions. Written here BY HAND on purpose, and the script dies if a table is missing from
// them: a new table that nobody placed would otherwise quietly vanish from the diagram, which is
// the exact failure this script exists to prevent.
// ---------------------------------------------------------------------------------------------
const REGIONS = [
  ['Cliente, identidad y permisos', [
    'client', 'module', 'client_module', 'app_user', 'credential', 'membership',
    'role', 'role_permission', 'membership_role', 'resource', 'action', 'permission']],
  ['El terreno y los aparatos', [
    'farm', 'plot', 'device', 'device_type']],
  ['La medicion', [
    'unit', 'quantity', 'calibration', 'measurement']],
  ['Riego', [
    'irrigation_method', 'irrigation_policy', 'pipe_type', 'pipe',
    'irrigation_decision', 'irrigation_event']],
  ['La campania: lo que se sembro y cuanto rindio', [
    'crop', 'crop_variety', 'phenology_stage', 'campaign', 'campaign_stage',
    'experiment_factor', 'experiment_block', 'harvest']],
  ['Suelo, satelite y plagas', [
    'soil_parameter', 'soil_analysis', 'soil_analysis_result',
    'index_type', 'index_source', 'evalscript', 'spatial_index', 'pest', 'pest_trap_catch']],
  ['Lo que se vio, lo que se cree y lo que se aplico', [
    'observation_extent', 'symptom', 'condition', 'diagnosis_source', 'input_product',
    'observation', 'observation_symptom', 'diagnosis', 'treatment', 'photo']],
  ['Ganaderia', [
    'animal_species', 'breed', 'animal_status', 'location_source',
    'animal', 'animal_group', 'animal_group_member', 'animal_location', 'ration']],
];

// ---------------------------------------------------------------------------------------------
// Read the catalog
// ---------------------------------------------------------------------------------------------
const tables = q(`
  select t.tablename,
         c.relrowsecurity::int,
         (select count(*) from pg_tables h where h.schemaname='public'
            and h.tablename = t.tablename || '_history')::int,
         (select count(*) from information_schema.role_table_grants g
            where g.grantee='agro_app' and g.table_name=t.tablename
              and g.privilege_type in ('UPDATE','DELETE'))::int,
         (select count(*) from information_schema.role_table_grants g
            where g.grantee='agro_app' and g.table_name=t.tablename
              and g.privilege_type='INSERT')::int
  from pg_tables t join pg_class c on c.relname=t.tablename
  where t.schemaname='public' and t.tablename not like '%\\_history'
    and t.tablename <> 'spatial_ref_sys'
  order by 1;`).map(([name, rls, hist, mut, ins]) => ({
    name, rls: rls === '1', history: hist !== '0', mutable: mut !== '0', insertable: ins !== '0',
  }));

const columns = q(`
  select c.table_name, c.ordinal_position::int, c.column_name, c.data_type, c.udt_name,
         c.is_nullable, coalesce(c.column_default,'')
  from information_schema.columns c
  join pg_tables t on t.tablename=c.table_name and t.schemaname='public'
  where c.table_schema='public' and c.table_name not like '%\\_history'
  order by c.table_name, c.ordinal_position;`);

const pks = q(`
  select r.relname, a.attname
  from pg_constraint k
  join pg_class r on r.oid=k.conrelid
  join unnest(k.conkey) with ordinality u(attnum, ord) on true
  join pg_attribute a on a.attrelid=r.oid and a.attnum=u.attnum
  where k.contype='p' and k.connamespace='public'::regnamespace
    and r.relname not like '%\\_history'
  order by r.relname, u.ord;`);

const fks = q(`
  select r.relname, a.attname, f.relname
  from pg_constraint k
  join pg_class r on r.oid=k.conrelid
  join pg_class f on f.oid=k.confrelid
  join unnest(k.conkey) with ordinality u(attnum, ord) on true
  join pg_attribute a on a.attrelid=r.oid and a.attnum=u.attnum
  where k.contype='f' and k.connamespace='public'::regnamespace
    and r.relname not like '%\\_history'
  order by r.relname, a.attname;`);

const histCount = Number(q(
  `select count(*) from pg_tables where schemaname='public' and tablename like '%\\_history';`)[0][0]);

// ---------------------------------------------------------------------------------------------
// Cross-check the hand-written regions against what is actually there
// ---------------------------------------------------------------------------------------------
const placed = new Set(REGIONS.flatMap(([, list]) => list));
const real = new Set(tables.map((t) => t.name));
const missing = [...real].filter((t) => !placed.has(t));
const ghost = [...placed].filter((t) => !real.has(t));
if (missing.length || ghost.length) {
  if (missing.length) console.error(`tablas sin region en REGIONS: ${missing.join(', ')}`);
  if (ghost.length) console.error(`regiones que nombran tablas inexistentes: ${ghost.join(', ')}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------------------------
// der.md -- the exhaustive reference
// ---------------------------------------------------------------------------------------------
const pkOf = new Map();
for (const [t, c] of pks) { if (!pkOf.has(t)) pkOf.set(t, []); pkOf.get(t).push(c); }
const fkOf = new Map();
for (const [t, c, target] of fks) { if (!fkOf.has(t)) fkOf.set(t, new Map()); fkOf.get(t).set(c, target); }
const colsOf = new Map();
for (const [t, , name, type, udt, nullable, def] of columns) {
  if (!colsOf.has(t)) colsOf.set(t, []);
  colsOf.get(t).push({ name, type: udt === 'geometry' ? 'geometry' : type, nullable: nullable === 'YES', def });
}

const today = new Date().toISOString().slice(0, 10).split('-').reverse().join('/');
let md = `# DER - el modelo de datos completo

**Generado el ${today} por \`scripts/generate-der.mjs\`, leyendo el catalogo de la base que corre.**
No se edita a mano: se regenera.

| | |
|---|---|
| Tablas del producto | **${tables.length}** |
| Tablas de historia (\`<tabla>_history\`) | **${histCount}** |
| Claves foraneas | **${fks.length}** |
| Tablas con RLS | **${tables.filter((t) => t.rls).length}** |
| Tablas append-only (sin UPDATE ni DELETE) | **${tables.filter((t) => t.insertable && !t.mutable).map((t) => t.name).join(', ')}** |

**Como leer las marcas de cada tabla:**

- **RLS** -- el aislamiento entre clientes lo hace cumplir el motor en esa tabla.
- **historia** -- todo UPDATE y DELETE deja la fila anterior en \`<tabla>_history\`.
- **append-only** -- no tiene historia **porque no se puede cambiar**: el permiso esta revocado,
  que es mas fuerte que auditar.
- **catalogo** -- solo lectura para el producto. Agregar una fila aca es lo que evita una migracion.

`;

for (const [region, list] of REGIONS) {
  md += `## ${region}\n\n`;
  for (const name of list) {
    const t = tables.find((x) => x.name === name);
    const marks = [];
    if (t.rls) marks.push('RLS');
    if (t.history) marks.push('historia');
    if (t.insertable && !t.mutable) marks.push('**append-only**');
    if (!t.insertable) marks.push('catalogo');
    md += `### \`${name}\`${marks.length ? ` -- ${marks.join(', ')}` : ''}\n\n`;
    md += '| columna | tipo | | |\n|---|---|---|---|\n';
    const pk = new Set(pkOf.get(name) || []);
    const fk = fkOf.get(name) || new Map();
    for (const c of colsOf.get(name) || []) {
      const flags = [];
      if (pk.has(c.name)) flags.push('PK');
      if (fk.has(c.name)) flags.push(`FK -> \`${fk.get(c.name)}\``);
      md += `| \`${c.name}\` | ${c.type} | ${c.nullable ? '' : 'NOT NULL'} | ${flags.join(', ')} |\n`;
    }
    md += '\n';
  }
}

md += `## Las tablas de historia

Son **${histCount}** y todas tienen la misma forma, porque las genera un solo bucle y las llena un
solo trigger. Listarlas una por una seria repetir ${histCount} veces lo mismo:

| columna | tipo | |
|---|---|---|
| \`id\` | bigint | PK |
| \`operation\` | text | \`UPDATE\` o \`DELETE\` |
| \`changed_at\` | timestamptz | |
| \`changed_by\` | uuid | FK -> \`app_user\` |
| \`row_data\` | jsonb | **la fila entera como estaba ANTES** |

**No se pueden editar ni borrar**: el permiso esta revocado para \`agro_app\` y para
\`agro_control\`. Una historia que se puede reescribir no es una historia.
`;

mkdirSync(join(ROOT, 'cambios/riego-de-precision/docs'), { recursive: true });
writeFileSync(join(ROOT, 'cambios/riego-de-precision/docs/der.md'), md);

// ---------------------------------------------------------------------------------------------
// The complete graph, as Mermaid. Only keys are listed per entity: that IS an ER diagram, and the
// full column list is already three lines above in the same file.
// ---------------------------------------------------------------------------------------------
let mmd = 'erDiagram\n';
for (const [, list] of REGIONS) {
  for (const name of list) {
    const pk = new Set(pkOf.get(name) || []);
    const fk = fkOf.get(name) || new Map();
    const shown = (colsOf.get(name) || []).filter((c) => pk.has(c.name) || fk.has(c.name));
    mmd += `  ${name} {\n`;
    for (const c of shown) {
      const kind = [pk.has(c.name) ? 'PK' : null, fk.has(c.name) ? 'FK' : null].filter(Boolean).join(',');
      mmd += `    ${c.type.replace(/[^a-z]/gi, '_')} ${c.name} ${kind}\n`;
    }
    mmd += '  }\n';
  }
}
for (const [from, col, to] of fks) {
  // `||--o{` : one row of the target, zero or more of the source. Every foreign key in this schema
  // is exactly that, because none of them is part of a composite that would make it one-to-one.
  mmd += `  ${to} ||--o{ ${from} : "${col}"\n`;
}

md += `
## El grafo completo

Las ${fks.length} claves foraneas, incluidas las ${fks.filter(([, , t]) => t === 'client').length}
que apuntan a \`client\` -- que son el multi-cliente y estan en casi todas las tablas.

\`\`\`mermaid
${mmd}\`\`\`
`;

writeFileSync(join(ROOT, 'cambios/riego-de-precision/docs/der.md'), md);

// ---------------------------------------------------------------------------------------------
// The drift guard on the hand-drawn diagram
// ---------------------------------------------------------------------------------------------
const MAPA = join(ROOT, 'desarrollo/diagramas/modelo-de-datos.json');
let drift = [];
try {
  const mapa = JSON.parse(readFileSync(MAPA, 'utf8'));
  drift = mapa.components
    .map((c) => c.label)
    .filter((l) => /^[a-z][a-z0-9_]*$/.test(l) && !real.has(l));
} catch (e) {
  console.error(`no se pudo leer ${MAPA}: ${e.message}`);
  process.exit(1);
}
if (drift.length) {
  console.error(`modelo-de-datos.json dibuja tablas que NO existen en la base: ${drift.join(', ')}`);
  console.error('El diagrama quedo viejo. Actualizalo y volve a correr archify deliver.');
  process.exit(1);
}

console.log(`der.md  ${tables.length} tablas, ${fks.length} claves foraneas, ${histCount} de historia`);
console.log(`mapa    modelo-de-datos.json no nombra ninguna tabla inexistente`);
