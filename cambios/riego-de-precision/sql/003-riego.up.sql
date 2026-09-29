-- 003 -- El riego: el metodo, la politica, el evento y la cañeria.
--
-- QUE DATO QUEDA Y QUE SE PIERDE (comentario obligatorio, AGENTS.md regla 7):
--   Crea. No transforma nada. Lo irreversible que introduce:
--
--   1. `riego_evento` guarda la CONDICION que causo la decision, no solo la decision. Sin eso el
--      historico describe y no predice, y la condicion de aquel momento NO se puede reconstruir
--      despues: habria que rearmarla desde `medicion` adivinando que sensores miro el controlador.
--   2. Litros MEDIDOS y ESTIMADOS en columnas SEPARADAS. Guardar uno solo -- o peor, el estimado en
--      la columna del medido -- hace que en dos años nadie pueda distinguir un caudalimetro de una
--      cuenta. Es el mismo error que un punto de RSSI guardado como si fuera GPS.
--   3. `politica_riego` NO SE EDITA: se cierra la vigente y se inserta otra. Si se edita, un evento
--      viejo apunta a una politica que ya no es la que rigio, y el registro miente.
--   4. `tramo` tambien tiene vida (`instalado_en`/`retirado_en`): la cinta de goteo es consumible y
--      se cambia. Un evento viejo paso por el tramo que HABIA, no por el de hoy.

begin;

-- ---------------------------------------------------------------------------------------------
-- 1. metodo_de_riego -- POO sin herencia
-- ---------------------------------------------------------------------------------------------
-- Agregar arroz por inundacion es UNA FILA aca. No una tabla nueva, no una subclase: en SQL la
-- herencia se paga en cada consulta.
create table metodo_de_riego (
  codigo   text primary key,
  nombre   text not null,
  constraint metodo_codigo_forma check (codigo ~ '^[a-z][a-z0-9_]*$')
);

insert into metodo_de_riego (codigo, nombre) values
  ('goteo',         'Goteo'),
  ('inundacion',    'Inundacion (arroz, con taipas)'),
  ('aspersion',     'Aspersion'),
  ('microaspersion','Microaspersion'),
  ('surco',         'Surco por gravedad')
on conflict (codigo) do nothing;

-- ---------------------------------------------------------------------------------------------
-- 2. politica_riego -- LO UNICO que cambia de forma segun el metodo
-- ---------------------------------------------------------------------------------------------
-- La nube manda POLITICA -- umbrales, ventanas, duracion maxima -- y NUNCA el abrir y cerrar de
-- una valvula. Por eso en este esquema NO existe una tabla de "ordenes": no hay donde guardarlas
-- porque no se emiten.
--
-- `parametros` es jsonb porque la FORMA depende del metodo: goteo pide umbral y ventana, arroz
-- pide lamina objetivo y fechas de entrada y salida del agua. Es CONFIGURACION, no medicion -- el
-- dataset son `medicion` y `riego_evento`, y esos no cambian de forma nunca.
create table politica_riego (
  id              bigint primary key generated always as identity,
  tenant_id       uuid not null references cliente(id) on delete restrict,
  parcela_id      bigint not null references parcela(id) on delete restrict,
  metodo_codigo   text not null references metodo_de_riego(codigo) on update cascade on delete restrict,
  parametros      jsonb not null,

  -- Cuantos dias sin politica nueva antes de caer al programa conservador. Vive en la POLITICA y
  -- no en el codigo del controlador: el dia que un cliente necesite otro numero, es un UPDATE y
  -- no un firmware nuevo en el campo.
  dias_hasta_conservador integer not null default 7,

  vigente_desde   timestamptz not null default now(),
  vigente_hasta   timestamptz,
  creada_por      text,

  constraint politica_vigencia_coherente check (vigente_hasta is null or vigente_hasta > vigente_desde),
  constraint politica_dias_razonables check (dias_hasta_conservador between 1 and 60),

  -- La forma de `parametros` SE VALIDA EN LA BASE para los metodos que existen hoy. No se deja
  -- "que lo valide la API": una politica mal formada llega al campo y decide riegos.
  constraint politica_parametros_por_metodo check (
    case metodo_codigo
      when 'goteo' then
        parametros ? 'umbral_arranque' and parametros ? 'umbral_corte'
        and parametros ? 'ventana_desde' and parametros ? 'ventana_hasta'
        and parametros ? 'minutos_maximos'
      when 'inundacion' then
        parametros ? 'lamina_objetivo_cm' and parametros ? 'entrada_agua' and parametros ? 'salida_agua'
      else true   -- los metodos sin forma declarada todavia no se validan
    end
  )
);

-- Una sola vigente por parcela. Parcial sobre las abiertas.
create unique index politica_una_vigente
  on politica_riego (parcela_id) where vigente_hasta is null;
create index politica_tenant on politica_riego (tenant_id);

comment on table politica_riego is
  'La nube manda POLITICA, nunca ordenes. Por eso no hay tabla de ordenes: no se emiten. '
  'No se edita: se cierra la vigente y se inserta otra.';

-- ---------------------------------------------------------------------------------------------
-- 3. tramo -- la cañeria, con topologia y geometria OPCIONAL
-- ---------------------------------------------------------------------------------------------
-- La TOPOLOGIA -- de que tramo cuelga cual -- es lo que permite razonar: que se riega al abrir
-- esta valvula, y entre que dos puntos esta la fuga. Y es lo que NO se puede reconstruir despues,
-- porque vive en la cabeza del que instalo.
-- La GEOMETRIA es opcional: un tramo puede tener largo sin tener linea dibujada, y la linea se
-- agrega cualquier dia caminando con el telefono.
create table tramo (
  id              bigint primary key generated always as identity,
  tenant_id       uuid not null references cliente(id) on delete restrict,
  parcela_id      bigint references parcela(id) on delete restrict,
  padre_id        bigint references tramo(id) on delete restrict,
  tipo            text not null,
  diametro_mm     double precision,
  largo_m         double precision,
  geom            geometry(LineString, 4326),
  instalado_en    timestamptz not null default now(),
  retirado_en     timestamptz,

  constraint tramo_tipo_valido check (
    tipo in ('principal','portalaterales','lateral','cinta_goteo')),
  constraint tramo_largo_positivo check (largo_m is null or largo_m > 0),
  constraint tramo_no_es_su_propio_padre check (padre_id is distinct from id)
);
create index tramo_geom_gist on tramo using gist (geom);
create index tramo_padre on tramo (padre_id);
create index tramo_parcela on tramo (parcela_id) where retirado_en is null;

comment on table tramo is
  'La cañeria. La cinta de goteo es CONSUMIBLE: no se borra, se retira (retirado_en) y se pone '
  'otra. De ahi sale gratis un dato que hoy nadie tiene: cuanto dura una cinta en la practica.';

-- ---------------------------------------------------------------------------------------------
-- 4. riego_evento -- LA ETIQUETA DE ML, y es hypertable
-- ---------------------------------------------------------------------------------------------
create table riego_evento (
  tenant_id       uuid not null references cliente(id) on delete restrict,
  parcela_id      bigint not null references parcela(id) on delete restrict,
  dispositivo_id  bigint references dispositivo(id) on delete restrict,
  decidido_en     timestamptz not null,
  registrado_en   timestamptz not null default now(),

  -- LA CONDICION que causo la decision: que leyo y de que sensores. Sin esto no se puede
  -- reconstruir por que decidio lo que decidio.
  condicion       jsonb not null,

  decision        text not null,
  -- La politica que REGIA en ese momento. Como la politica no se edita, este puntero sigue
  -- apuntando a lo que de verdad rigio aunque despues se cambie.
  politica_id     bigint references politica_riego(id) on delete restrict,
  motivo          text,

  -- EL RESULTADO. Los litros van en DOS columnas y nunca en una.
  minutos_efectivos  double precision,
  litros_medidos     double precision,   -- del caudalimetro. NULL si no hay caudalimetro
  litros_estimados   double precision,   -- calculado. NUNCA se escribe en la columna del medido

  constraint riego_decision_valida check (
    decision in ('regar','no_regar','conservador','corte_manual')),
  constraint riego_minutos_no_negativos check (minutos_efectivos is null or minutos_efectivos >= 0),
  constraint riego_litros_no_negativos check (
    (litros_medidos is null or litros_medidos >= 0) and
    (litros_estimados is null or litros_estimados >= 0)),

  primary key (parcela_id, decidido_en)
);

select create_hypertable('riego_evento', 'decidido_en', chunk_time_interval => interval '30 days');

create index riego_evento_tenant_tiempo on riego_evento (tenant_id, decidido_en desc);

comment on column riego_evento.litros_medidos is
  'Del caudalimetro. NULL si no hay. NUNCA se rellena con el estimado: en dos años nadie podria '
  'distinguir una medicion de una cuenta.';
comment on column riego_evento.condicion is
  'Que leyo el controlador y de que sensores. Es lo que convierte el historico en dataset '
  'supervisado: sin la condicion, el evento describe pero no explica.';

-- ---------------------------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['politica_riego','tramo','riego_evento'] loop
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

grant select, insert, update on politica_riego, tramo, riego_evento to agro_app;
grant select on metodo_de_riego to agro_app;

commit;
