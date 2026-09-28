# Usuarios, roles y permisos

**28/09/2026.** Pedido del dueño, textual: *"todo lo que es estructura de usuario rol permiso, todo
granular y modular"*. Esto es **diseño**, no implementacion: el DDL de abajo es **referencia**, no una
migracion. Todavia no hay Postgres levantada.

Encaja sobre lo que [design.md](../design.md) ya decidio -- `tenant_id uuid NOT NULL`, RLS con
`current_setting('app.tenant_id')` y `FORCE ROW LEVEL SECURITY` -- **no lo reemplaza**.

## La conclusion, primero

1. **La identidad es global; la pertenencia es por tenant.** `usuario` no lleva `tenant_id`. Lo que
   lleva tenant es `membresia`, y todo lo demas cuelga de ahi.
2. **Un permiso es un par `(recurso, accion)`** -- `parcela:leer`, `politica_riego:escribir` -- y los
   dos lados son **catalogo**, no `CHECK`. Un rol es una bolsa de permisos. **No hay ningun rol
   hardcodeado en el codigo.**
3. **Un modulo nuevo (hidroponia, ganaderia) no toca el modelo de autorizacion**: inserta filas en
   `modulo`, `recurso` y `permiso`. Sus tablas de datos si son una migracion -- eso no se puede
   evitar y no se pretende.
4. **RLS aisla tenants. La API autoriza acciones.** Son dos capas distintas y ninguna reemplaza a la
   otra. La lista de lo que RLS **no puede** hacer esta abajo y es la parte importante de este
   documento.
5. **La policy de `design.md` funciona, y aun asi hay que escribirle `WITH CHECK` explicito**: hoy la
   protege un default sutil de PostgreSQL que **se evapora si alguien parte la policy por comando**.
   Ver 3.2 -- incluida la correccion de un hallazgo que esta seccion afirmaba mal.
6. Contraseñas: **Argon2id**, nunca en claro, nunca cifradas de forma reversible.
7. Auditoria: **tabla aparte** (`auditoria`) **y** columnas `creado_por` / `actualizado_por` en los
   catalogos. Las dos, porque contestan preguntas distintas.

**Este diseño no depende de si `medicion` termina angosta o ancha**
([satelite-dron-y-cualquier-cultivo.md](satelite-dron-y-cualquier-cultivo.md) seccion 1): en los dos
casos `medicion` es **un recurso**. Lo unico que esa decision toca esta anotado en "Lo que falta
decidir".

## 1. El modelo

Diecisiete tablas, y cada una contesta una pregunta que ninguna otra contesta. Las marcadas **f2**
se pueden posponer a la fase 2 sin rehacer nada.

| tabla | que contesta | fase |
|---|---|---|
| `usuario` | quien es esta persona, en toda la plataforma | 1 |
| `credencial` | como prueba que es ella | 1 |
| `sesion` | que sesiones tiene vivas y como se cortan | 1 |
| `membresia` | **a que tenant pertenece, y con que vigencia** | 1 |
| `modulo` | que modulos existen (riego, hidroponia, ganaderia, facturacion) | 1 |
| `tenant_modulo` | que modulos tiene contratados ESE cliente | 1 |
| `recurso` | sobre que se puede pedir permiso, y de que modulo es | 1 |
| `accion` | que se puede hacer (leer, escribir, crear, borrar, ejecutar, aprobar, exportar) | 1 |
| `permiso` | el par `recurso:accion` | 1 |
| `rol` | una bolsa de permisos, global (plantilla) o propia del tenant | 1 |
| `rol_permiso` | que permisos tiene ese rol | 1 |
| `membresia_rol` | **que rol tiene esa persona en ese tenant, y sobre que alcance** | 1 |
| `auditoria` | quien hizo que, cuando, dentro de un tenant | 1 |
| `auditoria_plataforma` | lo que pasa **sin** tenant: logins, altas de cliente, accesos de soporte | 1 |
| `operador_plataforma` | quienes somos nosotros (dueño, soporte) | f2 |
| `acceso_soporte` | **el permiso temporal, con motivo y vencimiento**, para entrar a un cliente | f2 |
| `intento_login` | fuerza bruta y bloqueo | f2 |

El tenant **ya existe** y se llama `cliente` en `design.md`. **`tenant_id` es `cliente.id`.** No se
crea una tabla `tenant` nueva: seria el mismo dato con dos nombres.

### 1.1 Identidad: global a proposito

```sql
create table usuario (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  nombre     text not null,
  estado     text not null default 'activo',
  creado_en  timestamptz not null default now(),
  baja_en    timestamptz,
  constraint usuario_estado_valido check (estado in ('activo','suspendido','baja'))
);

-- El unico indice de esta tabla: el login busca por email y nada mas.
create unique index usuario_email_unico on usuario (lower(email));
```

**`usuario` NO lleva `tenant_id` y NO lleva RLS.** Si lo llevara, la misma persona que trabaja para
dos clientes seria dos personas, con dos contraseñas y dos historias de auditoria -- y el dueño, que
esta en todos los tenants, seria N personas.

`estado` si va con `CHECK` cerrado y `recurso`/`accion` no. **No es incoherencia**: el ciclo de vida
de una persona es del nucleo y cambiarlo es un evento de diseño; la lista de recursos crece cada vez
que se agrega un modulo. Lo que cambia con el producto va a catalogo; lo que define el nucleo va a
`CHECK`.

### 1.2 Pertenencia: `membresia` es la bisagra

```sql
create table membresia (
  id               bigint primary key generated always as identity,
  tenant_id        uuid not null references cliente(id) on delete restrict,
  usuario_id       uuid not null references usuario(id) on delete restrict,
  estado           text not null default 'activa',
  vence_en         timestamptz,
  permisos_version integer not null default 1,
  creado_en        timestamptz not null default now(),
  creado_por       uuid references usuario(id),
  unique (tenant_id, usuario_id),
  constraint membresia_estado_valido check (estado in ('activa','suspendida','revocada'))
);
```

`ON DELETE RESTRICT` en los dos lados: **un usuario o un cliente con historia no se borra**, se da de
baja. Un `CASCADE` ahi se lleva puesta la auditoria, que es justo lo que no se puede perder.

`vence_en` nullable: una membresia normal no vence; **la de soporte siempre la llena** (seccion 3.3).

`permisos_version` existe para invalidar cache de permisos sin esperar que expire un token
(seccion 4.3).

### 1.3 Permisos: `recurso` x `accion`, los dos catalogo

```sql
create table modulo (
  codigo text primary key,
  nombre text not null
);

create table recurso (
  codigo        text primary key,
  modulo_codigo text not null references modulo(codigo) on update cascade on delete restrict
);

create table accion (
  codigo text primary key
);

create table permiso (
  id             bigint primary key generated always as identity,
  recurso_codigo text not null references recurso(codigo) on update cascade,
  accion_codigo  text not null references accion(codigo)  on update cascade,
  -- La API razona con 'parcela:leer'; se genera, no se escribe a mano ni se desincroniza.
  codigo         text generated always as (recurso_codigo || ':' || accion_codigo) stored,
  unique (recurso_codigo, accion_codigo),
  unique (codigo)
);
```

`ON UPDATE CASCADE` en las FK de texto: un codigo de catalogo se puede renombrar (`potrero` ->
`parcela`) y no queremos que eso sea una migracion de datos a mano.

**Granularidad, concreta:**

| recurso | modulo | acciones tipicas |
|---|---|---|
| `campo`, `parcela`, `dispositivo` | `nucleo` | leer, escribir, crear, borrar |
| `medicion` | `nucleo` | leer, exportar |
| `politica_riego` | `riego` | leer, escribir, **aprobar** |
| `riego_evento` | `riego` | leer, **ejecutar** (forzar un riego manual) |
| `calibracion` | `nucleo` | leer, escribir |
| `campania`, `analisis_suelo` | `agronomia` | leer, escribir |
| `solucion_nutritiva`, `bloque_experimental` | `hidroponia` | leer, escribir |
| `factura`, `contrato` | `facturacion` | leer, escribir, exportar |
| `usuario`, `rol` | `nucleo` | leer, escribir |

`aprobar` y `ejecutar` son acciones separadas de `escribir` porque son las que mueven agua o plata.
Poder **editar** una politica de riego no es lo mismo que poder **ponerla vigente**.

**Modularidad:** `tenant_modulo` dice que modulos tiene contratado cada cliente.

```sql
create table tenant_modulo (
  tenant_id     uuid not null references cliente(id) on delete cascade,
  modulo_codigo text not null references modulo(codigo) on update cascade,
  habilitado_en timestamptz not null default now(),
  primary key (tenant_id, modulo_codigo)
);
```

Un permiso solo cuenta si el modulo de su recurso esta habilitado para ese tenant. Consecuencia
buscada: **el cliente productor no ve hidroponia aunque alguien le asigne el rol por error**, y
agregar ganaderia es un `INSERT` en `modulo` + `recurso` + `permiso`, no un `ALTER TABLE`.

**La prueba de que el diseño es modular:** si agregar ganaderia obliga a tocar `rol`,
`membresia_rol` o el codigo de autorizacion, el diseño fallo. Es el mismo criterio que
`satelite-dron-y-cualquier-cultivo.md` aplica al cultivo.

### 1.4 Roles: plantilla global + rol propio del tenant

```sql
create table rol (
  id        bigint primary key generated always as identity,
  -- NULL = plantilla de la plataforma, visible para todos, editable por nadie salvo nosotros.
  tenant_id uuid references cliente(id) on delete cascade,
  codigo    text not null,
  nombre    text not null,
  creado_en timestamptz not null default now()
);

-- NULLS NOT DISTINCT: sin esto, dos plantillas globales con el mismo codigo pasan el unique.
create unique index rol_codigo_unico on rol (tenant_id, codigo) nulls not distinct;

create table rol_permiso (
  rol_id     bigint not null references rol(id) on delete cascade,
  permiso_id bigint not null references permiso(id) on delete restrict,
  primary key (rol_id, permiso_id)
);
```

**Un rol es global cuando es una plantilla y por tenant cuando es del cliente.** Las plantillas que
existen el dia uno -- `admin_cliente`, `capataz`, `operador_hidroponia`, `solo_lectura`,
`soporte_lectura` -- son **un punto de partida que se copia**, no una herencia viva. Si un cliente
quiere un capataz que ademas exporte, se clona la plantilla a su tenant y se le agrega el permiso;
nunca se edita la plantilla global, porque eso cambia los permisos de todos los clientes de golpe y
nadie se entera.

### 1.5 Alcance: el capataz ve UN campo, no todo el tenant

RLS te da "este cliente si, los demas no". **Adentro del cliente hace falta otro corte**, y es el
caso del capataz.

```sql
create table membresia_rol (
  id           bigint primary key generated always as identity,
  tenant_id    uuid   not null references cliente(id)   on delete cascade,
  membresia_id bigint not null references membresia(id) on delete cascade,
  rol_id       bigint not null references rol(id)       on delete restrict,
  campo_id     bigint references campo(id)   on delete cascade,
  parcela_id   bigint references parcela(id) on delete cascade,
  otorgado_en  timestamptz not null default now(),
  otorgado_por uuid references usuario(id),
  vence_en     timestamptz,
  -- Ambos NULL = alcance todo el tenant. Nunca los dos a la vez.
  constraint alcance_unico check (num_nonnulls(campo_id, parcela_id) <= 1)
);

create unique index membresia_rol_unico
  on membresia_rol (membresia_id, rol_id, campo_id, parcela_id) nulls not distinct;
```

**Columnas tipadas con FK, no un par `(alcance_tipo, alcance_id)` polimorfico.** El polimorfico es
mas "modular" en el papel pero **no se puede declarar FK**, asi que un `campo` borrado deja
asignaciones apuntando a la nada y nadie se entera hasta que alguien ve lo que no debe. El costo real
de la decision es bajo: los tipos de alcance son **tres** y no crecen con los modulos, porque
`parcela` ya absorbe el bloque hidroponico y el potrero -- un poligono de 2 m2 es tan parcela como
un potrero de 100 ha (`satelite-dron-y-cualquier-cultivo.md`). **Un tipo de alcance nuevo es una
columna nullable; un modulo nuevo no es nada.**

`tenant_id` esta repetido en `membresia_rol` aunque se deduce de `membresia`. **Es la unica
desnormalizacion del modelo y es a proposito:** sin esa columna, la policy de RLS de esta tabla
necesita un subselect a `membresia` en cada fila. Se paga con un trigger que verifica que coincida
con el de la membresia.

## 2. Autenticacion: que se guarda y que no

**Nunca se guarda:** la contraseña en claro, la contraseña cifrada de forma reversible, el token de
sesion, el token de recupero, la respuesta a una pregunta de seguridad. **Y no se loguean**: ni en
el log de la app, ni en el de Postgres, ni en la auditoria.

```sql
create table credencial (
  id             bigint primary key generated always as identity,
  usuario_id     uuid not null references usuario(id) on delete cascade,
  tipo           text not null,
  algoritmo      text,
  material       text,
  proveedor      text,
  sujeto_externo text,
  creado_en      timestamptz not null default now(),
  rotado_en      timestamptz,
  revocado_en    timestamptz,
  constraint credencial_tipo_valido check (tipo in ('password','totp','oidc'))
);

-- Una sola contraseña viva por usuario; las rotadas quedan como historia (revocado_en no nulo).
create unique index credencial_password_unica
  on credencial (usuario_id) where tipo = 'password' and revocado_en is null;
```

**Argon2id**, y el porque sin adornos: es el ganador del Password Hashing Competition y la
recomendacion primaria de OWASP. Es *memory-hard*, o sea que encarece el ataque con GPU -- que es
exactamente como se crackea un dump hoy. Los parametros (memoria, iteraciones, paralelismo) viajan
**dentro del string del hash**, asi que subirlos mañana no rompe los hashes viejos: se rehashea en el
proximo login exitoso y se marca `rotado_en`. Si la libreria de Argon2 diera problemas en el
contenedor, el reemplazo aceptable es **bcrypt con costo >= 12**, nunca MD5, SHA-1, SHA-256 pelado ni
nada sin salt.

**La excepcion honesta: el secreto TOTP no se puede hashear**, porque el servidor tiene que calcular
el mismo codigo que el telefono. Va **cifrado en reposo con una clave que no vive en la base** (`.env`
/ secreto de la plataforma, regla 8 de `AGENTS.md`). Si la clave esta en la misma base, el cifrado es
decorativo.

```sql
create table sesion (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references usuario(id) on delete cascade,
  tenant_activo uuid references cliente(id),
  refresco_hash bytea not null,
  emitida_en    timestamptz not null default now(),
  vence_en      timestamptz not null,
  revocada_en   timestamptz,
  ip            inet,
  user_agent    text
);

create unique index sesion_refresco on sesion (refresco_hash);
create index sesion_viva on sesion (usuario_id) where revocada_en is null;
```

Del refresh token se guarda **el sha256**, no el token: un dump de la base no da sesiones. El de
acceso es corto (minutos) y no se guarda en ningun lado.

## 3. Como encaja con `tenant_id` y RLS

### 3.1 Un usuario puede pertenecer a varios tenants: si. Una sesion, a uno solo

`membresia` es N-N, asi que la misma persona puede estar en varios clientes. **Pero
`current_setting('app.tenant_id')` es un solo valor por transaccion**, y esa es justamente la
propiedad que hace que una query sin tenant no devuelva filas.

> **Decision: un tenant activo por sesion.** Cambiar de cliente es un acto explicito
> (`sesion.tenant_activo`), emite token nuevo y **queda auditado**. No hay pantalla que mezcle datos
> de dos clientes.

La alternativa -- `tenant_id = ANY(current_setting('app.tenants'))` -- convierte el aislamiento en un
parseo de string por fila y hace que un bug de armado de esa lista filtre entre clientes. **No vale
la comodidad de una pantalla.**

### 3.2 `WITH CHECK` explicito: no es un agujero, es una ambiguedad -- y va igual

> **CORRECCION del 28/09/2026, del lead.** La primera version de esta seccion afirmaba que *"con esa
> policy tal cual, un `INSERT` con el `tenant_id` de otro cliente entra sin problema"*. **Eso es
> falso**, y queda escrito el por que en vez de borrarlo, porque el error es instructivo.
>
> La policy de `design.md` **no lleva clausula `FOR`, o sea que es `FOR ALL`**. Y en PostgreSQL,
> **cuando se omite `WITH CHECK`, la expresion de `USING` se usa TAMBIEN como `WITH CHECK`**. Con esa
> policy tal cual, **el INSERT con el tenant de otro SI se rechaza.**
>
> **No se afloja un gate para que pase un texto, y tampoco se inventa un agujero para justificar una
> recomendacion.** La recomendacion de abajo es correcta; el motivo que se habia escrito, no.

`design.md` muestra la policy con `USING` solamente:

```sql
create policy tenant_aislado on medicion
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

**Funciona. Y aun asi hay que escribir `WITH CHECK` explicito, por tres razones que no son
cosmeticas:**

1. **La proteccion de escritura es IMPLICITA y depende de que la policy siga siendo `FOR ALL`.** El
   dia que alguien la parta en policies por comando -- `FOR SELECT`, `FOR INSERT`, `FOR UPDATE` --,
   **la escritura queda sin control y nada avisa**. El agujero no existe hoy: existe el dia que
   alguien refactoriza.
2. **Quien lee no puede saber si la omision fue deliberada.** Una policy que depende de un default
   sutil de PostgreSQL es una trampa para el proximo.
3. **`USING` y `WITH CHECK` no siempre son la misma expresion.** Cuando tienen que diferir -- y en este
   documento pasa, con `rol`, que deja **leer** las plantillas globales y **no** escribirlas --,
   escribirlas por separado deja de ser opcional. Una policy que las escribe siempre no tiene ese caso
   especial.

La forma correcta:

```sql
alter table medicion enable row level security;
alter table medicion force  row level security;

create policy tenant_aislado on medicion
  using       (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check  (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

Vale para **toda** tabla con `tenant_id`, incluidas las de este documento. El test en rojo del paso 1
del orden de construccion tiene que probar las dos mitades: que A no **lee** lo de B **y que A no
puede escribir una fila de B**.

> **Y lo de arriba es razonamiento sobre la documentacion de PostgreSQL, NO una medicion.** No hay
> Postgres levantada todavia (Fase 0). **Por AGENTS.md §7 el gate real es la base corriendo**: esto se
> da por bueno recien cuando el verifier lo ejercite contra una Postgres real, con los dos tenants
> cargados y **probando el INSERT cruzado en los dos casos** -- con `WITH CHECK` y sin el --. Hasta
> entonces es una recomendacion bien fundada, no un hecho medido.

### 3.3 RLS sobre las tablas de este documento

| tabla | RLS | por que |
|---|---|---|
| `usuario`, `credencial`, `sesion` | **no** | son globales. No se exponen por API directa nunca: se llega a un usuario **por `membresia`**, con join. |
| `membresia`, `membresia_rol`, `auditoria`, `acceso_soporte` | si, por `tenant_id` | son datos del cliente. |
| `rol` | si, **partida** | ver abajo. |
| `modulo`, `recurso`, `accion`, `permiso` | no | catalogo global de solo lectura para la app. |
| `tenant_modulo` | si, por `tenant_id` | que contrato tiene cada uno es dato del cliente. |
| `auditoria_plataforma` | no | no tiene tenant. Solo la lee un operador. |

**`rol` necesita dos policies, no una.** La intuitiva es una sola:

```sql
-- MAL: tambien deja ESCRIBIR las plantillas globales.
create policy rol_visible on rol
  using (tenant_id is null or tenant_id = current_setting('app.tenant_id', true)::uuid);
```

Lo correcto es separar lectura de escritura:

```sql
create policy rol_lectura on rol for select
  using (tenant_id is null or tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy rol_escritura on rol for all
  using      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

**`usuario` sin RLS es donde el motor deja de cubrirte.** Es el unico lugar del esquema donde un bug
de la API filtra entre clientes (enumeracion de emails: "existe este mail?"). Por eso no hay endpoint
que lea `usuario` sin pasar por `membresia`, y el alta de un miembro por email responde igual exista
o no el usuario.

### 3.4 Soporte: nosotros, con vencimiento y motivo

**No somos un tenant especial ni un superusuario de Postgres.** Un operador nuestro entra al cliente
por el mismo camino que cualquiera -- una `membresia` -- con tres diferencias que el motor hace
cumplir:

```sql
create table acceso_soporte (
  id             bigint primary key generated always as identity,
  tenant_id      uuid   not null references cliente(id)   on delete cascade,
  usuario_id     uuid   not null references usuario(id)   on delete restrict,
  membresia_id   bigint not null references membresia(id) on delete cascade,
  motivo         text not null,
  ticket         text,
  autorizado_por uuid not null references usuario(id),
  otorgado_en    timestamptz not null default now(),
  vence_en       timestamptz not null,
  revocado_en    timestamptz,
  -- Un acceso de soporte "para siempre" es una cuenta permanente con otro nombre.
  constraint ventana_corta check (vence_en > otorgado_en
                                  and vence_en <= otorgado_en + interval '7 days')
);

create index acceso_soporte_por_vencer
  on acceso_soporte (vence_en) where revocado_en is null;
```

1. **Vence.** `membresia.vence_en` se llena siempre y el `CHECK` lo topea en 7 dias.
2. **Tiene motivo y quien lo autorizo.** Sin eso no se inserta la fila.
3. **Todo lo que haga queda marcado** como `actuando_como = 'soporte'` en `auditoria`, y el cliente
   lo puede ver en su propia pantalla. **Un acceso de soporte invisible para el cliente es una
   puerta trasera.**

Para ver varios tenants, un operador tiene **varias membresias** y cambia de tenant activo -- una
sesion sigue viendo uno solo. No hay un modo "ver todo": si lo hubiera, el dia que se filtre esa
sesion se filtran todos los clientes juntos.

**Los dashboards internos (cuantos dispositivos hay en total, cuanto disco) no leen las tablas de
cliente**: leen agregados sin dato identificable, producidos por un job. Mirar 40 tenants de a uno
para un grafico es el caso que tienta a romper RLS, y no hace falta romperlo.

## 4. Quien hace cumplir que

| pregunta | quien la contesta |
|---|---|
| es de este cliente? | **BD** -- RLS `USING` + `WITH CHECK`, `FORCE` |
| existe esta fila? | **BD** -- FK |
| este dato es coherente? | **BD** -- `NOT NULL`, `CHECK`, `UNIQUE` |
| esta persona puede **leer** vs **escribir** esto? | **API** |
| esta persona puede tocar **este campo/parcela** adentro del cliente? | **API** (fase 1) |
| puede ver **esta columna** (costo, factura)? | **API** o vista |
| puede disparar **esta accion** que no toca filas? | **API** |
| quedo registrado? | **BD** (trigger a `auditoria`) |

### 4.1 Lo que RLS NO puede hacer -- y por eso necesita la API

1. **No distingue intencion, distingue filas.** La misma fila de `politica_riego` es legible por el
   capataz y editable por el admin. Para que RLS lo resolviera habria que meter el set entero de
   permisos en GUCs y escribir una policy por tabla y por comando. Se evaluo y **se descarta**:
   duplica la autorizacion en dos lugares que se desincronizan, y parsear un array de permisos por
   fila es caro.
2. **No devuelve 403, devuelve cero filas.** Un `UPDATE` bloqueado por RLS reporta "0 filas
   afectadas", indistinguible de "no existe". Si la API no chequea **antes**, el usuario recibe un
   exito silencioso que no hizo nada. **Es el peor modo de falla del sistema** y es 100% de la API.
3. **No cubre lo que no toca filas**: exportar un CSV, disparar un recalculo de NDVI, mandar una
   politica al controlador, reenviar una invitacion. No hay `SELECT` que autorizar.
4. **No hace seguridad por columna.** "El capataz ve la parcela pero no el costo por hectarea" no es
   una policy: los privilegios por columna de Postgres van contra el **rol de Postgres**, y nosotros
   usamos **un solo rol de app**. Sale por vista o por serializacion en la API.
5. **No valida reglas de negocio.** "Un umbral de riego fuera del rango aprobado necesita firma de un
   agronomo" es logica, no filtro de filas.
6. **No aplica al dueño de la tabla sin `FORCE`, ni al superusuario nunca.** Ya esta en `design.md`;
   se repite porque es la forma numero uno de perder el aislamiento sin darse cuenta.
7. **Una funcion `SECURITY DEFINER` la saltea.** Cualquier funcion asi tiene que re-filtrar por tenant
   adentro, o es un tunel.
8. **No cubre `usuario` ni los catalogos**, que no tienen tenant (seccion 3.3).

### 4.2 Alcance intra-tenant: por que la fase 1 lo hace en la API

Entre clientes, el aislamiento lo hace **el motor** y eso no se negocia. **Adentro de un cliente**, el
corte por campo lo hace la API en la fase 1, por una razon y con una condicion.

- **La razon:** una policy de alcance necesita evaluar "que campos ve esta persona" en cada fila de
  `medicion`. La consecuencia de un bug ahi es que el capataz ve otro lote **del mismo patron**; la
  de un bug de tenant es que un cliente ve a otro. **No son el mismo riesgo y no justifican el mismo
  costo.**
- **La condicion:** el test funcional obligatorio es que el capataz, **pidiendo a mano el id del campo
  B**, recibe 403. Si ese test no existe, el alcance no existe.

El endurecimiento posterior, si se quiere: `SET LOCAL app.campos = '{12,13}'` en la misma
transaccion que `app.tenant_id`, y una policy adicional en `campo` / `parcela` / `dispositivo`. Se
decide con numeros de `EXPLAIN`, no antes.

### 4.3 Como llega el permiso a la API

La resolucion es **una query**, y es la que justifica los indices:

```sql
select distinct p.codigo, mr.campo_id, mr.parcela_id
from membresia m
join membresia_rol mr on mr.membresia_id = m.id
join rol_permiso  rp on rp.rol_id = mr.rol_id
join permiso      p  on p.id = rp.permiso_id
join recurso      r  on r.codigo = p.recurso_codigo
join tenant_modulo tm on tm.tenant_id = m.tenant_id and tm.modulo_codigo = r.modulo_codigo
where m.usuario_id = $1
  and m.tenant_id  = $2
  and m.estado = 'activa'
  and (m.vence_en  is null or m.vence_en  > now())
  and (mr.vence_en is null or mr.vence_en > now());
```

**Los permisos no viajan dentro del token.** El token lleva `usuario_id`, `tenant_id` y el id de
sesion; el set de permisos se resuelve por request desde un cache en memoria con clave
`(membresia_id, permisos_version)`. Revocar un rol **bumpea `permisos_version`** y el efecto es
inmediato. Meterlos en el JWT los vuelve validos hasta que expire -- y "te saque el permiso pero
sigue pudiendo 15 minutos" no es aceptable en algo que abre valvulas.

**Los permisos son aditivos: solo hay permitir, no hay negar.** Es predecible (union de los roles) y
se puede explicar en una pantalla. Un `deny` explicito obliga a definir precedencia y es donde la
gente se equivoca.

## 5. Auditoria: tabla aparte **y** columnas

Las dos, porque contestan preguntas distintas:

- **Columnas** `creado_en/creado_por/actualizado_en/actualizado_por` en los catalogos: *"quien dejo
  esta fila asi"*, sin un join, en la pantalla de detalle.
- **Tabla `auditoria`**: *"que paso con esto en los ultimos tres meses"*. Una fila por evento, jamas
  se pisa.

```sql
create table auditoria (
  id             bigint generated always as identity,
  tenant_id      uuid not null references cliente(id) on delete restrict,
  ocurrido_en    timestamptz not null default now(),
  usuario_id     uuid references usuario(id),
  actuando_como  text not null default 'usuario',
  permiso_codigo text,
  entidad        text not null,
  entidad_id     text not null,
  accion         text not null,
  antes          jsonb,
  despues        jsonb,
  ip             inet,
  -- La PK incluye ocurrido_en desde el dia uno: si algun dia se vuelve hypertable,
  -- la conversion no obliga a rehacer la clave.
  primary key (id, ocurrido_en),
  constraint actuando_como_valido check (actuando_como in ('usuario','soporte','sistema'))
);
```

**No arranca como hypertable.** No es una serie: es un log de eventos de volumen bajo comparado con
`medicion`. Si crece, se convierte y se le pone retencion -- y ahi si vale, porque **la auditoria es
lo unico de este esquema donde borrar viejo es legitimo**, a diferencia del dato de sensor.

`antes` / `despues` en `jsonb` y no columnas tipadas: la auditoria tiene que servir para tablas que
todavia no existen (ganaderia). Es el unico lugar del esquema donde el esquema flexible se justifica,
porque **no se consulta para decidir nada, se consulta para leer**.

`auditoria_plataforma` es la gemela sin `tenant_id`: login, login fallido, alta de cliente,
otorgamiento y vencimiento de acceso de soporte. Existe separada porque un evento sin tenant en una
tabla con RLS por tenant es una fila que **nadie** puede leer.

**Lo que el motor hace cumplir:** el rol de la app tiene `INSERT` y `SELECT` sobre `auditoria`, y
**`UPDATE`/`DELETE` revocados**. Una auditoria que la app puede editar no es auditoria.

**Lo que NO va nunca a la auditoria:** hashes, tokens, secretos TOTP, ni el `despues` completo de
`credencial`.

## 6. Los cinco casos, resueltos

| quien | como queda | que lo frena |
|---|---|---|
| **El dueño** | `operador_plataforma` + membresia con `admin_cliente` en cada tenant propio (la casa, La Colmena) | nada por diseño; **igual queda auditado**, porque el objetivo de la auditoria no es frenarlo sino poder reconstruir que paso |
| **La hermana** | membresia **solo en el tenant "casa"**, rol `operador_hidroponia`: `solucion_nutritiva:*`, `bloque_experimental:*`, `medicion:leer`, `dispositivo:leer` | **no tiene membresia en el tenant del cliente, asi que RLS le devuelve cero filas.** No hace falta ningun permiso de "no tocar riego del cliente": lo hace el motor. Y aunque el tenant casa tuviera riego, `politica_riego:escribir` no esta en su rol |
| **Cliente productor** | membresia en **su** tenant, rol `admin_cliente`, alcance tenant | RLS. Nunca ve otro cliente, ni con un id adivinado |
| **Capataz** | membresia en el tenant del cliente, rol `capataz` con `campo_id = <su campo>`. Permisos: `parcela:leer`, `medicion:leer`, `riego_evento:leer`, `riego_evento:ejecutar`, `politica_riego:leer`. **Sin `factura:leer`** | **dos mecanismos distintos, y conviene verlos separados**: la facturacion la corta el **permiso** (no lo tiene); el otro campo lo corta el **alcance** (API, seccion 4.2) |
| **Nosotros, soporte** | usuario propio + `acceso_soporte` con motivo y vencimiento <= 7 dias, rol `soporte_lectura` (solo acciones `leer`) | vence solo; el cliente lo ve en su auditoria; **no hay modo "ver todos los tenants"** |

**El caso de la hermana es la mejor prueba de que la separacion identidad/pertenencia estaba bien**:
lo que la frena no es un rol bien configurado -- que se puede configurar mal -- **es que no existe en
ese tenant**.

## 7. Indices, y el query que justifica cada uno

Ninguno de adorno: cada uno cuesta en escritura.

| indice | el query |
|---|---|
| `usuario (lower(email))` unico | el login |
| `membresia (tenant_id, usuario_id)` unico | resolucion de permisos (4.3) + "no dos membresias del mismo par" |
| `membresia (tenant_id)` | "listar los usuarios de este cliente" -- la pantalla de administracion |
| `membresia_rol (membresia_id)` | resolucion de permisos |
| `rol_permiso (rol_id, permiso_id)` (es la PK) | resolucion de permisos |
| `sesion (refresco_hash)` unico | canje del refresh token |
| `sesion (usuario_id) where revocada_en is null` parcial | "cerrar todas mis sesiones" |
| `credencial (usuario_id) where tipo='password' and revocado_en is null` parcial | garantiza una sola contraseña viva |
| `acceso_soporte (vence_en) where revocado_en is null` parcial | el job que vence los accesos |
| `auditoria (tenant_id, ocurrido_en desc)` | la pantalla de auditoria del cliente |
| `auditoria (entidad, entidad_id, ocurrido_en desc)` | "historial de ESTA parcela" |

**No se crean** (todavia): `rol_permiso (permiso_id)` -- solo sirve para "quien tiene este permiso",
que hoy no lo pide nadie; ni indices sobre `permiso`, `recurso`, `accion`, que son decenas de filas y
viven en cache.

## Lo que falta decidir

- **Puede un cliente crear sus propios roles, o los armamos nosotros?** Si el cliente los arma, hace
  falta pantalla de administracion de roles en la fase 1 y el riesgo de que se auto-bloquee (ultimo
  admin que se saca el permiso: hace falta un `CHECK` de "siempre al menos un admin vivo"). Decision
  del dueño.
- **El acceso de soporte lo autoriza el cliente o lo autorizamos nosotros?** Que lo apruebe el cliente
  es lo correcto y es friccion justo cuando algo esta roto. Alternativa: lo otorgamos nosotros pero
  el cliente **lo ve y lo puede revocar**. Decision del dueño, y es contractual antes que tecnica.
- **MFA: obligatorio para quien?** Propuesta: obligatorio para operadores de plataforma y para
  cualquier rol con `politica_riego:aprobar`. Falta confirmar.
- **Cuanto dura la auditoria?** No se puede decidir sin medir volumen. Es el unico dato del esquema
  con borrado legitimo.
- **`medicion` angosta o ancha:** este modelo no depende de eso. **Lo unico que toca:** si termina
  angosta con catalogo de `magnitud`, aparece la pregunta de si hace falta permiso **por magnitud**
  (*"el capataz ve humedad pero no EC"*). Hoy no hay caso real que lo pida y **no se resuelve aca**.
- **Tipo de UUID.** Postgres 16 solo tiene `gen_random_uuid()` (v4), que es aleatorio y fragmenta el
  indice. `uuidv7()` es nativo recien en Postgres 18. Falta decidir si se usa una funcion propia de
  v7 o se acepta v4 hasta actualizar. Con los volumenes de `usuario` y `cliente` es irrelevante; se
  anota porque el criterio deberia ser el mismo para todo el esquema.
- **Invitaciones.** Se da de alta a un usuario por email antes de que acepte, o se crea recien al
  aceptar? Cambia si hace falta una tabla `invitacion`. Falta caso de uso real.
- **Lo que este documento NO cubre**: permisos de la API de politica que consume el **controlador**.
  Un controlador no es un usuario -- es un dispositivo con credencial propia. Eso es otro modelo
  (identidad de dispositivo, rotacion de claves, ChirpStack) y va en su propio documento.
