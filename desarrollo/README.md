# desarrollo/ - que te da la plataforma y como se usa

Esto es para **quien escribe una app**, no para quien opera el cluster. Si venis a agregar un
servicio, esto es lo que ya existe y lo que tu app tiene que cumplir para entrar.

Lo de operar la infra vive en `infra/` (Ansible) y `AGENTS.md` (contrato de trabajo). **No dupliques
nada de aca alla**: si algo de la plataforma cambia, se corrige en su lugar y se cita.

> **Estado al 25/09/2026.** Fases 1 a 4 cerradas. **Fase 5 (observabilidad) EN CURSO**: hoy no hay
> metricas, ni logs centralizados, ni alertas. Leelo antes de asumir que vas a poder ver tu app.

## Lo que YA tenes

| Pieza | Que te da | Donde se declara |
|---|---|---|
| **k3s + Cilium** | el cluster y la red (eBPF, sin kube-proxy) | `infra/roles/k3s`, `infra/roles/cilium` |
| **Traefik** | el ingress: entra el trafico de internet por 80/443 | `infra/roles/traefik` |
| **cert-manager** | TLS automatico de Let's Encrypt **produccion** | `infra/roles/cert_manager` |
| **Argo CD** | despliega lo que esta en git y **revierte** lo que cambies a mano | `environments/staging/` |
| **SOPS + operador** | secretos cifrados EN git, descifrados dentro del cluster | `secrets/`, `infra/roles/sops_operator` |
| **Kyverno + PSA + VAP** | la admision: rechaza lo que no cumple (ver abajo) | `infra/roles/kyverno`, `infra/roles/psa` |
| **Cloudflare** | DNS y el candado del origen (80/443 solo desde Cloudflare) | `infra/roles/cloudflare` |
| **Trivy / Falco / kube-bench** | escaneo de imagenes, deteccion en runtime, CIS | Fase 4 |

## Lo que NO tenes todavia

- **Observabilidad**: sin Prometheus, sin Grafana, sin logs centralizados, sin alertas. Es la Fase 5
  y esta en curso (`cambios/observabilidad-lgtm/`). **Hoy, si tu app falla, te enteras porque deja de
  responder.**
- **Backups / restore**: es Fase 7. Nada de lo que guardes hoy tiene respaldo probado.
- **Base de datos gestionada**: es Fase 6. Si tu app necesita Postgres, todavia no hay operador.
- **Multi-tenant por cliente**: Fase 6. Hoy hay un namespace `web` y cuotas por namespace.

## Las 6 reglas que tu app TIENE que cumplir

No son estilo: son **admision**. Si no las cumplis, el objeto **no entra al cluster** y Argo te lo
muestra como `SyncFailed`.

1. **Imagen por digest**: `imagen:tag@sha256:...`. Un tag se puede reescribir rio arriba y servir
   otro binario en el proximo pull.
2. **Nada de `:latest`**, ni imagen sin tag (una imagen sin tag ES `:latest` escrito de otra forma).
3. **Registry en la allowlist**: `docker.io`, `quay.io`, `mirror.gcr.io`.
4. **`requests` y `limits` declarados** en todos los contenedores. Sin eso un workload se come el
   nodo entero -hay un solo nodo-.
5. **PSA `restricted`**: sin `privileged`, sin `hostPath`, sin `hostPID`, sin `hostNetwork`, sin root.
6. **No bajes el piso de PSA** de tu namespace.

Y ademas, aunque no sea admision:

- **La red es default-deny.** Tu pod **no sale a internet** ni habla con otro namespace hasta que se
  declare una `CiliumClusterwideNetworkPolicy`. Por defecto solo tenes DNS.
- **Toda policy de red entra por git.** Hay un VAP que rechaza cualquier policy que no venga con el
  `tracking-id` de Argo. Esto no se arregla a mano en el cluster, a proposito.
- **Cuotas por namespace**: hoy 20 pods, 1 CPU y 4Gi de `requests`, 6Gi de `limits.memory`,
  8 PVC, 20Gi de storage. `kubectl get resourcequota -A` para el numero del dia.

## Como se despliega: [desplegar-una-app.md](desplegar-una-app.md)

El paso a paso real, con la estructura de archivos y los comandos.

## Lo que NO vas a poder hacer, y es a proposito

- **`kubectl apply` a mano.** Argo lo revierte -`selfHeal`-, medido en **4 segundos**. Si algo tiene
  que existir, va a git.
- **Abrir un puerto en el host.** Solo el 22 esta abierto; 80/443 solo aceptan trafico de Cloudflare.
- **Leer secretos de otro namespace.** Se recorto el 23/09: ni siquiera los componentes de
  plataforma pueden.
- **Editar un secreto en claro.** Van cifrados a `secrets/<ambiente>.enc.yaml` con SOPS.

## Donde preguntar cuando algo no entra

1. `kubectl -n argocd get app <tu-app> -o jsonpath='{.status.conditions}'` -> que dijo Argo.
2. Si es admision, el mensaje nombra la politica: `Kyverno/imagen-por-digest: ...`.
3. Si el pod arranca y no responde, mira la red: casi siempre falta la CCNP.
