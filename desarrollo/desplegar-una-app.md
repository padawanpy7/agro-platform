# Desplegar una app

El flujo es GitOps: **vos no desplegas, vos declaras**. Escribis los manifiestos en git, Argo los
aplica y los mantiene. No hay `kubectl apply` ni `docker push` a un servidor.

## Los tres lugares

```
apps/<tu-app>/base/            los manifiestos (lo que es igual en todos los ambientes)
environments/staging/<tu-app>/ el kustomization del ambiente (lo que cambia entre staging y prod)
environments/staging/plataforma/<tu-app>.application.yaml   la Application que Argo lee
```

"Promover a prod es copiar": cuando exista `environments/prod/`, se replica el segundo y el tercero.

## Paso a paso

### 1. Los manifiestos base

`apps/<tu-app>/base/` con lo de siempre -`namespace`, `deployment`, `service`, `ingress`,
`certificate`- y un `kustomization.yaml` que los liste. Mira `apps/primavera-nati/base/` como
ejemplo real y completo.

La imagen, con digest y con limites -si no, no entra-:

```yaml
containers:
  - name: app
    image: docker.io/tu/imagen:1.2.3@sha256:abc...
    resources:
      requests: { cpu: 20m, memory: 64Mi }
      limits:   { memory: 256Mi }
    securityContext:
      runAsNonRoot: true
      allowPrivilegeEscalation: false
      capabilities: { drop: ["ALL"] }
      seccompProfile: { type: RuntimeDefault }
```

### 2. El overlay del ambiente

`environments/staging/<tu-app>/kustomization.yaml`:

```yaml
---
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../../apps/<tu-app>/base
```

### 3. La Application

`environments/staging/plataforma/<tu-app>.application.yaml`. La raiz del app-of-apps lee ese
directorio y la adopta sola.

```yaml
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: <tu-app>
  namespace: argocd
spec:
  project: plataforma
  source:
    repoURL: ssh://git@ssh.github.com:443/padawanpy7/infra-platform.git
    targetRevision: main
    path: environments/staging/<tu-app>
  destination:
    server: https://kubernetes.default.svc
    namespace: web
  syncPolicy:
    automated:
      selfHeal: true
      prune: false
    syncOptions:
      - ServerSideApply=true
```

`prune: false` a proposito: Argo no borra lo que desaparece de git. Borrar es manual y deliberado.

### 4. Si tu app necesita salir a internet o hablar con otra

**Por defecto no puede.** Hay que declarar una `CiliumClusterwideNetworkPolicy` en
`environments/staging/red/`. Mira las 10 que ya existen ahi.

Y ojo con esto, que costo 2 h 15 de agujero abierto el 18/09: **`selfHeal` solo revierte lo que el
manifiesto DECLARA**. Un campo que git no nombra se puede cambiar a mano y Argo sigue diciendo
`Synced`. Por eso las policies declaran `specs: []` explicito.

### 5. Si tu app necesita un secreto

Va cifrado a `secrets/staging.enc.yaml` con SOPS -`sops secrets/staging.enc.yaml`- y el operador lo
materializa como `Secret` dentro del cluster. **Nunca un valor en claro en un manifiesto**: hay un
gate (`gitleaks`) que rompe el commit.

### 6. El dominio

Los hosts publicos de la zona los gestiona Ansible en `infra/vars/staging.yml` (`sitios_publicos`),
**no se derivan de tu app**. Si necesitas un dominio nuevo, se agrega ahi y se corre el role
`cloudflare`.

## Como saber si entro

```sh
export KUBECONFIG=$HOME/.kube/staging.yaml
kubectl -n argocd get app <tu-app>          # Synced / Healthy
kubectl -n web get pods -l app=<tu-app>
curl -sS -o /dev/null -w '%{http_code}\n' https://<tu-host>/
```

**`Synced` no alcanza como prueba.** Si el controller esta frenado, Argo sigue diciendo
`Synced/Healthy` y lo unico que lo delata es `reconciledAt` congelado:

```sh
kubectl -n argocd get app <tu-app> -o jsonpath='{.status.reconciledAt}'; date -u +%FT%TZ
```

## Errores que vas a ver, y que significan

| Mensaje | Que pasa |
|---|---|
| `Kyverno/imagen-por-digest: ...` | falta el `@sha256:` |
| `Kyverno/requests-y-limits-declarados` | falta `resources` en algun contenedor |
| `violates PodSecurity "restricted"` | root, `privileged`, `hostPath`, `hostNetwork`... |
| `admission webhook "vpol.validate.kyverno.svc" denied` | alguna de las 6 reglas; el mensaje dice cual |
| el pod corre pero nada responde | falta la CCNP: la red es default-deny |
| `SyncFailed` con `force` trabado | un `force` sobre server-side apply se latchea; se limpia `operationState` |
