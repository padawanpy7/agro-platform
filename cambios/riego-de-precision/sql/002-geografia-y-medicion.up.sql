-- 002 -- La geografia y la medicion. El corazon del modelo.
--
-- QUE DATO QUEDA Y QUE SE PIERDE (comentario obligatorio, AGENTS.md regla 7):
--   Esta migracion CREA. No transforma ni borra: no hay dato previo que convertir.
--   Lo que introduce y NO se puede deshacer despues sin reescribir todo el historico:
--
--   1. `medicion` es ANGOSTA -- una fila por (dispositivo, magnitud, momento). Decidido por el
--      dueño el 28/09 (PREGUNTAS.md 4). Pasar a ancha despues es reescribir cada fila.
--   2. `valor_crudo` es NOT NULL y `valor_calibrado` es NULL-able. Al reves -guardar solo el
--      calibrado- ata el historico a la formula del dia en que se guardo, y si la formula estaba
--      mal NO SE PUEDE RECALCULAR. Esa perdida es irreversible.
--   3. `medido_en` y `recibido_en` SEPARADOS. Con uno solo hay que elegir entre mentir sobre
--      cuando se midio o perder cuanto tardo en llegar, y las dos le importan al modelo.
--   4. `double precision` y nunca `real` en todo valor medido. La diferencia de disco es
--      despreciable; la de precision no se recupera.
--   5. La geometria se guarda en SRID 4326, como llega del GPS y de Sentinel-2. Proyectar al
--      guardar pierde el original.
--
--   NADA en esta migracion promedia, redondea ni agrega. La agregacion va en vistas derivadas,
--   que se pueden tirar y recalcular.

begin;

-- ---------------------------------------------------------------------------------------------
-- 1. campo -- el establecimiento. EL NIVEL QUE FALTABA.
-- ---------------------------------------------------------------------------------------------
-- El `design.md` lo tenia como catalogo SIN geometria. Se le agrega `geom` porque el dueño pidio
-- el mapa en dos niveles: el terreno completo de fondo y los potreros adentro.
--
-- Y OJO CON LA TRAMPA: la suma de las parcelas NO es el campo. Entre medio hay monte, caminos,
-- casco y tajamar, que son tierra real y no pertenecen a ninguna parcela. Por eso `campo.geom`
-- existe aparte y no se deriva.
create table campo (
  id           bigint primary key generated always as identity,
  tenant_id    uuid not null references cliente(id) on delete restrict,
  nombre       text not null,
  geom         geometry(Polygon, 4326),
  -- PROVISORIO: un poligono dibujado a ojo sobre la imagen satelital sirve para empezar, pero hay
  -- que saber que lo es. Un limite corregido despues NO recalcula el NDVI ya pedido a la API
  -- externa: esas filas se calcularon contra otra geometria y hay que volver a pedirlas.
  geom_es_provisorio  boolean not null default true,
  geom_version        integer not null default 1,
  creado_en    timestamptz not null default now(),
  baja_en      timestamptz,
  constraint campo_nombre_no_vacio check (length(trim(nombre)) > 0)
);
create index campo_geom_gist on campo using gist (geom);
create index campo_tenant on campo (tenant_id) where baja_en is null;

comment on column campo.geom is
  'El borde de afuera. La suma de las parcelas NO da esto: hay monte, caminos y casco en el medio.';

-- ---------------------------------------------------------------------------------------------
-- 2. parcela -- LA UNIDAD DE ANALISIS
-- ---------------------------------------------------------------------------------------------
-- Un lote de tomate, un potrero, un corral y un cantero de hidroponia son TODOS esto: un poligono
-- con cosas adentro. Que sea una sola tabla es lo que permite que los modulos se crucen.
create table parcela (
  id           bigint primary key generated always as identity,
  tenant_id    uuid not null references cliente(id) on delete restrict,
  campo_id     bigint not null references campo(id) on delete restrict,
  nombre       text not null,
  geom         geometry(Polygon, 4326) not null,
  geom_es_provisorio  boolean not null default true,
  geom_version        integer not null default 1,
  creado_en    timestamptz not null default now(),
  baja_en      timestamptz,
  constraint parcela_nombre_no_vacio check (length(trim(nombre)) > 0)
);
create index parcela_geom_gist on parcela using gist (geom);
create index parcela_campo on parcela (campo_id) where baja_en is null;

-- ---------------------------------------------------------------------------------------------
-- 3. dispositivo -- un punto
-- ---------------------------------------------------------------------------------------------
-- NO lleva `parcela_id`: la pertenencia NO se declara a mano, sale de ST_Contains. Consecuencia
-- buscada: si el cliente corrige el limite de una parcela, todo se recalcula solo.
create table dispositivo (
  id           bigint primary key generated always as identity,
  tenant_id    uuid not null references cliente(id) on delete restrict,
  nombre       text not null,
  tipo         text not null,
  punto        geometry(Point, 4326),
  instalado_en timestamptz not null default now(),
  retirado_en  timestamptz,
  constraint dispositivo_tipo_valido check (
    tipo in ('sensor_suelo','estacion_meteo','controlador','caudalimetro',
             'trampa','sensor_solucion','balanza','lector_caravana'))
);
create index dispositivo_punto_gist on dispositivo using gist (punto);
create index dispositivo_tenant on dispositivo (tenant_id) where retirado_en is null;

comment on table dispositivo is
  'Un punto. NO guarda a que parcela pertenece: eso sale de ST_Contains(parcela.geom, punto).';

-- ---------------------------------------------------------------------------------------------
-- 4. magnitud -- EL CATALOGO QUE HACE ANGOSTA A `medicion`
-- ---------------------------------------------------------------------------------------------
-- Esta tabla es la decision de la pregunta 4 hecha objeto. Agregar EC, pH, peso del animal o la
-- lamina de agua del arroz es UNA FILA ACA, no una migracion.
--
-- Global, sin tenant_id: la unidad de la humedad es la misma para todos los clientes.
create table magnitud (
  codigo       text primary key,
  nombre       text not null,
  unidad       text not null,
  -- El rango VALIDO del instrumento, para poder marcar una lectura imposible SIN borrarla.
  -- NULL = sin rango declarado todavia.
  minimo       double precision,
  maximo       double precision,
  constraint magnitud_codigo_forma check (codigo ~ '^[a-z][a-z0-9_]*$'),
  constraint magnitud_rango_coherente check (minimo is null or maximo is null or minimo < maximo)
);

-- ---------------------------------------------------------------------------------------------
-- 5. calibracion -- la formula, CON SU PROCEDENCIA
-- ---------------------------------------------------------------------------------------------
-- NUNCA SE EDITA UNA FILA: se cierra la vigente y se inserta otra. Si se edita, se pierde con que
-- formula se calibro lo viejo, y el historico deja de ser recalculable.
--
-- `procedencia` es NOT NULL a proposito: un numero de calibracion sin procedencia no es un numero,
-- es una supersticion (AGENTS.md regla 7, excepcion explicita de este proyecto).
create table calibracion (
  id             bigint primary key generated always as identity,
  tenant_id      uuid not null references cliente(id) on delete restrict,
  dispositivo_id bigint not null references dispositivo(id) on delete restrict,
  magnitud_codigo text not null references magnitud(codigo) on update cascade on delete restrict,
  formula        text not null,
  procedencia    text not null,
  vigente_desde  timestamptz not null default now(),
  vigente_hasta  timestamptz,
  constraint calibracion_procedencia_no_vacia check (length(trim(procedencia)) > 0),
  constraint calibracion_vigencia_coherente check (vigente_hasta is null or vigente_hasta > vigente_desde)
);
-- Una sola vigente por (dispositivo, magnitud). Parcial sobre las abiertas.
create unique index calibracion_una_vigente
  on calibracion (dispositivo_id, magnitud_codigo) where vigente_hasta is null;

comment on column calibracion.procedencia is
  'De donde salio la formula: fabricante, ensayo propio, fecha. Sin esto el numero es folklore.';

-- ---------------------------------------------------------------------------------------------
-- 6. medicion -- ANGOSTA, y es una hypertable
-- ---------------------------------------------------------------------------------------------
create table medicion (
  tenant_id       uuid not null references cliente(id) on delete restrict,
  dispositivo_id  bigint not null references dispositivo(id) on delete restrict,
  magnitud_codigo text not null references magnitud(codigo) on update cascade on delete restrict,

  -- LOS DOS RELOJES. `medido_en` es el eje del analisis y por eso particiona.
  medido_en       timestamptz not null,
  recibido_en     timestamptz not null default now(),

  -- CRUDO obligatorio, CALIBRADO opcional. Al reves se pierde la posibilidad de recalcular.
  valor_crudo     double precision not null,
  valor_calibrado double precision,
  calibracion_id  bigint references calibracion(id) on delete restrict,

  -- Donde se midio. Nullable: un sensor sin GPS no miente diciendo que estaba en el centro de la
  -- parcela. NULL es "no se", y NO se rellena con la posicion de la parcela.
  punto           geometry(Point, 4326),

  -- La PK incluye la columna de tiempo DESDE EL DIA UNO: una hypertable no admite una PK que no
  -- la contenga, y agregarla despues obliga a reescribir la tabla entera.
  primary key (dispositivo_id, magnitud_codigo, medido_en)
);

-- `create_hypertable` particiona por `medido_en`. Chunks de 7 dias: con pocos sensores un chunk
-- por dia son miles de chunks vacios, y con muchos uno por mes no entra en memoria.
select create_hypertable('medicion', 'medido_en', chunk_time_interval => interval '7 days');

create index medicion_tenant_tiempo on medicion (tenant_id, medido_en desc);
create index medicion_punto_gist on medicion using gist (punto);

comment on table medicion is
  'ANGOSTA: una fila por (dispositivo, magnitud, momento). Una magnitud nueva es una FILA en '
  'magnitud, nunca una migracion. NULL no es 0: un sensor que no reporto no midio cero.';

-- ---------------------------------------------------------------------------------------------
-- 7. RLS
-- ---------------------------------------------------------------------------------------------
-- Mismo patron que la 001: ENABLE + FORCE + policy con USING **y** WITH CHECK explicitos, y la
-- condicion de cliente vivo. `magnitud` no lleva: es catalogo global.
do $$
declare t text;
begin
  foreach t in array array['campo','parcela','dispositivo','calibracion','medicion'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force  row level security', t);
    execute format($f$
      create policy %I on %I
        for all to agro_app
        using (
          tenant_id = current_setting('app.tenant_id', true)::uuid
          and exists (select 1 from cliente c where c.id = tenant_id and c.baja_en is null)
        )
        with check (
          tenant_id = current_setting('app.tenant_id', true)::uuid
          and exists (select 1 from cliente c where c.id = tenant_id and c.baja_en is null)
        )
    $f$, t || '_propio', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 8. Permisos
-- ---------------------------------------------------------------------------------------------
grant select, insert, update on campo, parcela, dispositivo, calibracion, medicion to agro_app;
grant select on magnitud to agro_app;
-- NUNCA delete. Y `agro_control` NO recibe nada de aca: da de alta clientes, no toca sus datos.

-- ---------------------------------------------------------------------------------------------
-- 9. Las magnitudes que existen hoy
-- ---------------------------------------------------------------------------------------------
-- Tres dominios distintos escribiendo en la MISMA tabla. Eso es lo que la decision "angosta"
-- compro, y es lo que permite preguntar "a que potrero mover la hacienda" cruzando modulos.
insert into magnitud (codigo, nombre, unidad, minimo, maximo) values
  -- riego y clima
  ('humedad_suelo',     'Humedad volumetrica del suelo', '%',      0,    100),
  ('temperatura_suelo', 'Temperatura del suelo',         'C',    -10,     70),
  ('temperatura_aire',  'Temperatura del aire',          'C',    -15,     55),
  ('humedad_aire',      'Humedad relativa del aire',     '%',      0,    100),
  ('lluvia',            'Lluvia acumulada',              'mm',     0,   null),
  ('viento_velocidad',  'Velocidad del viento',          'km/h',   0,    250),
  ('caudal',            'Caudal instantaneo',            'L/min',  0,   null),
  ('volumen_regado',    'Volumen aplicado',              'L',      0,   null),
  -- hidroponia
  ('ec_solucion',       'Conductividad de la solucion',  'mS/cm',  0,     10),
  ('ph_solucion',       'pH de la solucion',             'pH',     0,     14),
  ('temp_solucion',     'Temperatura de la solucion',    'C',      0,     50),
  ('nivel_solucion',    'Nivel de la solucion',          'cm',     0,   null),
  -- ganaderia
  ('peso_animal',       'Peso del animal',               'kg',     0,   1500),
  ('consumo_agua',      'Agua tomada',                   'L',      0,   null),
  -- el tajamar
  ('nivel_agua',        'Nivel del reservorio',          'cm',     0,   null)
on conflict (codigo) do nothing;

commit;
