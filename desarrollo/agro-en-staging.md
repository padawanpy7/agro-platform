# Desplegar agro en staging: lo que la plataforma necesita de nosotros

**Escrito el 29/09/2026, con lo que INFRA midio contra el cluster y lo que se midio de este lado.**
Nada de esto esta desplegado todavia: **falta la decision del dueño sobre CUANDO**, y ese es el
unico pendiente. Se escribe ahora porque las dos sesiones que lo averiguaron se cierran, y una
respuesta que vive en un chat se pierde.

> **Este repo NO despliega** (AGENTS.md §1). Arma los manifiestos y se los pasa a `infra-platform`,
> que es el unico repo que el AppProject de Argo tiene en su lista blanca. Abrir esa lista para que
> agro despliegue solo **se puede y no se recomienda**: le daria al repo del producto capacidad de
> escribir en el cluster, que es justo la separacion que el dueño puso. Si algun dia hace falta, lo
> decide el.

## Las tres rutas, en `infra-platform`

```
clusters/base/agro/                                    los manifiestos
environments/staging/agro/kustomization.yaml           apunta a la de arriba
environments/staging/plataforma/agro.application.yaml  la Application de Argo
```

Se los pasamos a INFRA y **el los revisa contra la admision antes de commitear**, con
`kubectl apply --dry-run=server`. Asi los rechazos aparecen sin romper nada.

## La base: no hay ninguna en staging, va la nuestra

**Medido por INFRA: cero pods de postgres en todo el cluster.** Entonces subimos la nuestra, y tiene
que cumplir cuatro cosas o la admision la rechaza.

### 1. Imagen por digest

```
timescale/timescaledb-ha@sha256:3e3440ab4c2aa585e743b1d8466cda9bbf18b6c598ec7806cf61e02fa5cd1d1a
```

Es `pg17.11-ts2.30.1` y esta en `docker.io`, que esta en la lista blanca junto con `quay.io` y
`mirror.gcr.io`. Trae PostgreSQL 17.11, TimescaleDB 2.30.1, PostGIS 3.6.4 y toolkit 1.26.0.

### 2. `requests` y `limits`, y ojo con el techo

El `LimitRange` que genera Kyverno topa **2Gi de memoria por contenedor** y **4Gi por pod**. El
`mem_limit: 2g` de `postgres-dev.yml` queda **justo en el maximo**. Si hace falta mas, el techo se
sube a proposito y con motivo escrito; no se pide y ya.

### 3. PSA restricted, y esto se probo, no se supuso

Se corrio la imagen con `--read-only --user 1000:1000` y tmpfs, en un contenedor aparte que despues
se borro: **arranca limpia**, inicializa el cluster, levanta el launcher de TimescaleDB y acepta
conexiones. Despues se crearon `postgis` y `timescaledb` adentro y las dos se crearon.

| | |
|---|---|
| **uid / gid** | `1000:1000` (`postgres`), con el grupo extra `101 (ssl-cert)` |
| **PGDATA** | `/home/postgres/pgdata/data` -- el PVC se monta en `/home/postgres/pgdata` |
| **emptyDir 1** | `/var/run/postgresql` (el socket unix) |
| **emptyDir 2** | `/tmp` |
| **Nada mas** | la imagen no declara `VOLUME`, asi que los montajes son explicitos |

Mas `runAsNonRoot`, `readOnlyRootFilesystem` y capabilities a cero.

### 4. El PVC: **5Gi**, y el PV lo planta Ansible

**`local-path` esta bloqueado a proposito**: su provisioner crea un pod auxiliar con `hostPath` y
una service account que el redteam ya robo una vez. Los volumenes son **PV estaticos** que planta
Ansible (`role almacenamiento_local`), asi que **el volumen se declara ANTES de que exista el PVC**.

**El numero sale de una medicion, no de una estimacion**: se insertaron 200.000 filas reales en
`measurement` y se midio la hypertable entera.

```
303 bytes por fila, con sus indices (PK, tenant+tiempo, el parcial de animal, la geometria)

banco de pruebas   2 aparatos x 3 magnitudes x 288/dia  =   631k filas/anio  =  191 MB/anio
finca de verdad   10 aparatos x 5 magnitudes x 288/dia  =  5,26M filas/anio  = 1,59 GB/anio
```

Mas el esquema vacio (30 MB con las tres extensiones y 120 tablas) y el WAL, que con
`max_wal_size` por defecto anda en 1-2 GB en estado estable. **5Gi da unos dos anios de una finca
real con el WAL adentro**, queda a mitad del techo de 10Gi, y se elige ese y no 3Gi por una razon
concreta: **el PV lo planta Ansible y quedarse corto se paga a mano y en caliente**. Aprobado por
INFRA, que lo declara cuando se le pida el despliegue -- un PV `Available` esperando un PVC que no
llega es disco ocupado al pedo.

## Los secretos: los genera y los cifra la plataforma

El cluster tiene el operador **sops-secrets-operator**. Un manifiesto `SopsSecret` cifrado con
SOPS+age se commitea en `infra-platform`, el operador lo descifra a un `Secret` real en el
namespace, y **la clave age privada vive en el cluster y no sale**.

> **Este repo no toca los passwords, ni siquiera cifrados.** Los genera INFRA. Asi el repo del
> producto no contiene ni la version cifrada, y el dia que uno se rote se toca un repo y no dos.

**Tres roles necesitan password hoy.** Las claves del `Secret` son **los nombres de libpq**, porque
son los que ya usan `api/config.py`, `psql` sin argumentos y los scripts de verificacion -- una sola
configuracion en vez de tres:

| rol | para que | claves en el Secret |
|---|---|---|
| **`agro_admin`** | corre las migraciones. Es el `POSTGRES_PASSWORD` del contenedor | `PGUSER`, `PGPASSWORD` |
| **`agro_app`** | **la API del producto**, y el unico que ella usa. SIEMPRE con `app.tenant_id` | `AGRO_APP_USER`, `AGRO_APP_PASSWORD` |
| **`agro_auth`** | solo el login: ve identidades y hashes, y **ni un dato de cliente** | `AGRO_AUTH_USER`, `AGRO_AUTH_PASSWORD` |

**`agro_control` NO lleva secreto todavia.** Existe y puede entrar, pero lo usa la app de gestion
del dueño, que no existe y no va a correr en staging. Sin password no se conecta, que es lo que
queremos: un secreto que no hace falta es superficie. Se pide el dia que exista.

**Como las lee la API: por variable de entorno**, no por archivo. `api/config.py` usa
`pydantic-settings`, que lee del entorno y del `.env`, asi que el `Secret` va montado con `envFrom`.
Y **falla al arrancar** si falta una, que es a proposito: una conexion sin contraseña no falla al
arrancar, falla en la primera consulta, y para entonces el error aparece como *"no se pudo leer la
parcela"* en vez de *"falta una variable de entorno"*.

> **Lo que TODAVIA no esta hecho de este lado, y hay que decirlo**: `api/config.py` tiene **una
> sola** conexion (`PGUSER` / `PGPASSWORD`). La separacion en tres esta declarada en
> `.env.example` y **no implementada**, porque la API no existe. Se implementa junto con la API, y
> hasta entonces el Secret puede traer las tres y sobrar dos.

### Y por que la separacion no es prolijidad

`agro_admin` es el dueño de las tablas y, en el contenedor, **superusuario**. **Un superusuario no
esta sujeto a Row-Level Security.** Una API apuntada ahi pasa todos los chequeos en verde y le
sirve los datos de todos los clientes a todos los clientes. Se descubrio el 29/09 porque los tres
roles de aplicacion estaban `NOLOGIN` y lo unico capaz de abrir sesion era el superusuario; lo
arregla la migracion `007` y lo miden tres pasos de `verify-schema.sh`.

## La salida a Copernicus

Va como un manifiesto mas dentro de `clusters/base/agro/`. La red es default-deny, asi que **no se
abre un puerto: se declara una CCNP en git**, del lado de `infra-platform`.

- comodin amplio en `rules.dns.matchPattern`, para **ver** todo lo que intenta resolver;
- `matchName` **exactos** en `toFQDNs`, para acotar a que se conecta;
- DNS a kube-dns en **udp/53 Y tcp/53**;
- el `tracking-id` de Argo, o la admision la rechaza;
- `specs: []` explicito;
- y **se prueba en rojo**: que el pod de al lado NO llegue a Copernicus.

## Cuando: lo decide el dueño

**INFRA recomienda desplegar la base sola, antes de que exista la API**, y el argumento es bueno:
el camino tiene cuatro cosas que muerden -- el AppProject es lista blanca, el PVC no puede usar
`local-path`, la admision rechaza por digest / limites / PSA, y el `SopsSecret` tiene su propio
ciclo -- y **una base sola las ejercita las cuatro sin que le importe a nadie si se rompe**. Si se
espera a la API, se descubren todas juntas y con algo que si importa.

**Es el mismo principio que el arranque en frio de este repo: se prueba cuando no hace falta.**

Y aun asi no se adelanto, porque significa trabajo ahora en vez de despues y eso no lo decide una
sesion. **El dueño dijo "luego", y "luego" es una respuesta.**

## Lo que hay que hacer el dia que diga que si

1. Escribir los manifiestos de `clusters/base/agro/` con todo lo de arriba.
2. Pedirle a INFRA el **PV de 5Gi** y los **tres secretos**.
3. Pasarle los manifiestos para que los pruebe con `--dry-run=server` y los commitee.
4. Correr las migraciones contra la base de staging con `apply-schema.sh` y despues
   `verify-schema.sh`: **el esquema no esta desplegado hasta que los 51 pasos den verde ahi**, no
   aca.
