#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"; cd "$here"
echo "==> Loop en: $here"

mkdir -p memory work docs .claude/agents
[ -f memory/MEMORY.md ] || printf '# MEMORY.md\n\nMemoria persistente entre sesiones. Una linea por hecho durable.\n' > memory/MEMORY.md

# `scripts/_python.sh` se fue con los 56 wrappers el 10/08 y este source quedo apuntando al vacio:
# con `set -euo pipefail`, sourcear un archivo inexistente MATA el script en esta misma linea, o sea
# que el bootstrap de una maquina nueva no llegaba a hacer nada. La resolucion queda inline y con el
# mismo criterio que usa el loop en node (scripts/docs/markitdown.js): el portable de
# ../tools/python-*-embed-*/, tomando el ultimo -o sea la version mas alta-. Del PATH no se toma
# nada a proposito: en Windows `python3` suele ser el stub de la Store, que no ejecuta y sale 0.
buscar_python() {
  PYTHON=""
  for d in ../tools/python-*-embed-*/; do
    [ -x "${d}python.exe" ] && PYTHON="${d}python.exe"
  done
}
buscar_python
if [ -z "${PYTHON:-}" ]; then
  echo "==> No hay python (ni en el PATH ni en ../tools/). Bootstrapeando uno portable, sin admin ..."
  VPY="3.13.14"
  mkdir -p ../tools
  (
    cd ../tools
    curl -fsSL -o "python-${VPY}-embed-amd64.zip" \
      "https://www.python.org/ftp/python/${VPY}/python-${VPY}-embed-amd64.zip" \
      && mkdir -p "python-${VPY}-embed-amd64" \
      && unzip -o -q "python-${VPY}-embed-amd64.zip" -d "python-${VPY}-embed-amd64" \
      && rm "python-${VPY}-embed-amd64.zip" \
      && sed -i 's/^#import site/import site/' "python-${VPY}-embed-amd64/python313._pth" \
      && curl -fsSL -o get-pip.py https://bootstrap.pypa.io/get-pip.py \
      && "python-${VPY}-embed-amd64/python.exe" get-pip.py --no-warn-script-location -q \
      && rm get-pip.py
  ) || echo "   ! No se pudo bootstrapear python. Instala manual: https://www.python.org/downloads/"
  buscar_python
fi
if [ -n "${PYTHON:-}" ]; then
  echo "==> Instalando markitdown + pip-audit ..."
  "$PYTHON" -m pip install -q --no-warn-script-location "markitdown[all]" markitdown-mcp pip-audit \
    || echo "   ! Instala manual: \"\$PYTHON\" -m pip install 'markitdown[all]' markitdown-mcp pip-audit"
else
  echo "==> python no encontrado; instala markitdown cuando puedas (el portable va en ../tools/python-*-embed-*/)."
fi
if [ -f .mcp.json ]; then
  echo "   .mcp.json ya existe, no lo piso."
elif [ -n "${PYTHON:-}" ]; then
  cat > .mcp.json <<JSON
{
  "mcpServers": {
    "markitdown": { "command": "$(cygpath -w "$PYTHON" 2>/dev/null || echo "$PYTHON")", "args": ["-m", "markitdown_mcp"] }
  }
}
JSON
else
  echo "   ! No se genero .mcp.json (falta python). Corre init.sh de nuevo cuando lo instales."
fi

if [ -t 0 ] && [ -n "${PYTHON:-}" ] && grep -q '^name: ""' project.yml 2>/dev/null; then
  echo ""
  echo "==> Configuracion del proyecto (Enter para saltar cada campo):"
  read -rp "  Nombre: " V_NAME
  read -rp "  Una frase (que es): " V_ONE
  read -rp "  Lenguaje: " V_LANG
  read -rp "  Framework: " V_FW
  read -rp "  Base de datos: " V_DB
  read -rp "  Infra: " V_INFRA
  read -rp "  Comando build: " V_BUILD
  read -rp "  Comando test: " V_TEST
  read -rp "  Comando run: " V_RUN
  read -rp "  Comando lint: " V_LINT
  V_NAME="$V_NAME" V_ONE="$V_ONE" V_LANG="$V_LANG" V_FW="$V_FW" V_DB="$V_DB" V_INFRA="$V_INFRA" \
  V_BUILD="$V_BUILD" V_TEST="$V_TEST" V_RUN="$V_RUN" V_LINT="$V_LINT" "$PYTHON" - <<'PY'
import os, re
v = {k: os.environ.get(k, "") for k in ["V_NAME","V_ONE","V_LANG","V_FW","V_DB","V_INFRA","V_BUILD","V_TEST","V_RUN","V_LINT"]}
ymap = {"name":v["V_NAME"],"one_liner":v["V_ONE"],"language":v["V_LANG"],"framework":v["V_FW"],"db":v["V_DB"],"infra":v["V_INFRA"],"build":v["V_BUILD"],"test":v["V_TEST"],"run":v["V_RUN"],"lint":v["V_LINT"]}
lines = open("project.yml").read().splitlines(True)
for k, val in ymap.items():
    if not val: continue
    for i, l in enumerate(lines):
        m = re.match(r'^(\s*)'+re.escape(k)+r':\s*""\s*$', l)
        if m: lines[i] = f'{m.group(1)}{k}: "{val}"\n'; break
open("project.yml","w").writelines(lines)
a = open("AGENTS.md").read()
stack = " / ".join(x for x in [v["V_LANG"],v["V_FW"],v["V_DB"],v["V_INFRA"]] if x)
rep = {"{{PROJECT_NAME}}":v["V_NAME"],"{{ONE_LINER}}":v["V_ONE"],"{{STACK}}":stack,"{{BUILD}}":v["V_BUILD"],"{{TEST}}":v["V_TEST"],"{{RUN}}":v["V_RUN"],"{{LINT}}":v["V_LINT"]}
for k, val in rep.items():
    if val: a = a.replace(k, val)
open("AGENTS.md","w").write(a)
print("==> project.yml y AGENTS.md actualizados.")
PY
fi

if command -v gitleaks >/dev/null 2>&1; then echo "==> gitleaks: ya instalado."
else echo "==> gitleaks (escaneo de secretos): instalalo -> https://github.com/gitleaks/gitleaks/releases"; fi

echo ""
echo "==> Context7 (docs de librerias al dia): npx ctx7 setup --claude"
echo "==> Navegador (apex-e2e, apex-builder, las tools de Kove): Playwright ya esta en las"
echo "    dependencias y sus browsers son PORTABLES, en ../tools/playwright-browsers."
echo "    agro.js fija PLAYWRIGHT_BROWSERS_PATH solo: no hace falta 'playwright install'."
echo ""
if grep -q '{{' AGENTS.md 2>/dev/null || grep -q '^name: ""' project.yml 2>/dev/null; then
  echo "==> PENDIENTE: completar project.yml y los {{PLACEHOLDERS}} de AGENTS.md (1 y 8)."
fi
echo "==> Listo. Empeza por el rol 'lead'. 'node agro.js' lista las tools; el gate es 'node agro.js check'."
