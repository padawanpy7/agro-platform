# La salida a internet del producto: como se declara, y la trampa de los comodines

**29/09/2026.** El producto necesita **dos flujos que cruzan el borde**: MQTT entrante desde el
gateway del campo, y HTTPS saliente a Copernicus para el NDVI. La red del cluster es **default-deny**,
asi que cada uno es una **CCNP declarada en git** -- no un puerto que se abre.

**Todo lo tecnico de abajo viene de la sesion de `infra-platform`, verificado contra el CRD vivo de
nuestro Cilium (v1.20.1), no de memoria.** Se anota aca porque es la clase de detalle que se pierde
entre sesiones y despues cuesta dos dias.

## La semantica, que es mas fina de lo que parece

| | que hace |
|---|---|
| `matchName` | **literal**. Le agrega el `.` final solo si falta |
| `matchPattern` con `*` | matchea 0 o mas caracteres validos de DNS, **PERO NO EL PUNTO** |
| `matchPattern` con `**.` | matchea subdominios **en cascada** |

**Las consecuencias, con nuestro caso:**

- `*.dataspace.copernicus.eu` **si** matchea `sh.dataspace.copernicus.eu`.
- **Pero NO** matchea `dataspace.copernicus.eu` pelado, **ni** `a.b.dataspace.copernicus.eu`.
- Y el caso especial del CRD: **un `*` como caracter mas a la izquierda SIN el `.` detras** matchea
  los subdominios **y** el nombre de la derecha. O sea **`*dataspace.copernicus.eu` y
  `*.dataspace.copernicus.eu` NO son lo mismo**: un punto de diferencia cambia el alcance.

## La salida buena: comodin en el DNS, exactos en el egress

**No son la misma regla y no hacen lo mismo:**

```
rules.dns.matchPattern  ->  que nombres el proxy RESUELVE Y REGISTRA
toFQDNs                 ->  a que se PUEDE CONECTAR
```

**Entonces:**

| | que va |
|---|---|
| **regla de DNS** | `**.dataspace.copernicus.eu` -- asi se ve **TODO** lo que la app intenta resolver, **incluido lo que no previmos** |
| **`toFQDNs`** | los `matchName` **exactos** |

> **Eso convierte *"que hosts necesita Copernicus"* de una suposicion en una MEDICION.** Se corre el
> worker una semana, se miran los logs del proxy, y se escriben las reglas exactas **contra lo que de
> verdad pidio**. Es el metodo del repo: medir, no adivinar.
>
> Y la conexion queda acotada igual, porque lo que conecta es `toFQDNs`.

## Por que exactos, y no es solo purismo

1. **La policy DOCUMENTA la dependencia.** Con `matchName`, un `grep` sobre el repo dice **todos los
   hosts externos con los que habla el producto**. Un comodin lo esconde.
2. **El modo de falla es mejor.** Si Copernicus agrega un host, los exactos fallan **ruidoso** y uno
   se entera. **El comodin se ensancha en silencio** y nunca se aprende que llama la app.
3. **Precedente del repo**: `vap_platform_hostpaths` usa rutas exactas, con el comentario *"match
   exacto a proposito: `/var/lib/rancher/k3s` NO habilita `/var/lib/rancher/k3s/server/token`"*.
   **Mismo principio, otra capa.**
4. Hay un **issue abierto en Cilium** sobre policies FQDN con comodin matcheando la identidad
   equivocada (**#42880**). **No verificado si aplica a 1.20.1**: cuenta como una razon mas para
   preferir exactos, **no como un hecho de nuestra version**.

**El contra, dicho honestamente**: si Copernicus sirve por CDN con hostnames rotativos, los exactos
**se rompen seguido**. Eso no se sabe de antemano -- y por eso existe la salida de arriba: **el log del
proxy lo dice en una semana.**

## La segunda mitad, que es la que muerde

> **La regla de DNS tiene que permitir el egress a `kube-dns` en `udp/53` Y `tcp/53`**, con el
> `rules.dns` adentro.

- **El TCP se olvida**, y una respuesta grande cae a TCP.
- **Sin esa mitad, `toFQDNs` no matchea NUNCA**, porque Cilium aprende la IP **de la respuesta que el
  mismo intercepta**.
- Es **la falla mas comun**, y se ve como *"la policy esta y no anda"*.

## Lo que la admision exige o rebota

| | |
|---|---|
| Imagen | **por digest `@sha256`**, version fija, **registry en allowlist** (docker.io, quay.io, mirror.gcr.io) |
| Recursos | `requests` **y** `limits` declarados |
| Seguridad | **PSA restricted** |
| Toda policy de red | lleva el **`tracking-id` de Argo**. Sin eso, rechazada |
| **`specs: []` EXPLICITO** si no se usa el campo | es el hecho `el-campo-que-nadie-declara-abre-la-red`: una CCNP adoptada con `specs` sin declarar **abrio un flujo prohibido 2h15 bajo Synced/Healthy** |

**Y se prueba EN ROJO**: que **el pod de al lado NO alcance** Copernicus. **Que el nuestro llegue no
prueba que el agujero este acotado.**

### Donde se escriben

```
clusters/base/<app>/                                  los manifiestos (la CCNP es uno mas)
environments/staging/<app>/kustomization.yaml
environments/staging/plataforma/<app>.application.yaml
```

## Dos cosas que muerden y no son la CCNP

**1. Un namespace nuevo NO es un commit.** El AppProject `plataforma` es una **allowlist**, y la
Application queda en `InvalidSpecError` hasta que se agregue. Y hay que agregarlo en **TRES listas** de
`infra/roles/argocd/defaults/main.yml` -- `argocd_project_destinations`, `argocd_managed_namespaces` y
`argocd_project_namespace_resources` -- mas las rules de RBAC del controller y del server.

> **Agregarlo en una sola rompe el cache de Argo y deja TODAS las Applications en
> `ComparisonError`, no solo la nuestra.** Le paso a infra el 25/09.

**2. `local-path` esta BLOQUEADO a proposito**: su provisioner crea un helper pod con `hostPath` y una
service account robable, y permitirlo **reabre la cadena H-A del redteam**. Los PVC van contra **PV
estaticos que planta Ansible** (role `almacenamiento_local`). **O sea que la Postgres en el cluster
necesita que infra declare su volumen ANTES**, y hay que pasarle el tamaño.

## El broker MQTT: la decision que falta

**Si va ADENTRO del cluster**: no necesita CCNP de egress -- es trafico entre pods y lo cubre una
policy normal --. **Pero si necesita que el gateway del campo llegue desde internet**, y eso pasa por
**el candado de Cloudflare y el origin-lock del firewall**, que es otra conversacion y mas larga que
una CCNP.

**Si va AFUERA**: cambia el problema de lugar, no lo elimina.

**No esta decidido**, y no se decide hasta que exista el worker de ingesta (Fase 2).

## Lo que falta

- **Escribir las dos CCNP contra algo real**, no plausible. Se manda a infra cuando exista la
  migracion y el worker, no antes.
- **El tamaño del PV** de la Postgres, cuando haya doce tablas y una idea real de retencion.
- **Dentro o fuera el broker MQTT.**
- **Correr el worker una semana con el comodin en el DNS** y escribir los `matchName` contra el log.
