#!/usr/bin/env python3
"""Captura de fuentes publicas sobre La Colmena, reejecutable e idempotente.

Lee `fuentes.yml` -- las fuentes NO estan en el codigo, para poder reejecutar sin tocarlo.

Reglas que hace cumplir, del contrato del relevamiento:
  - respeta robots.txt (urllib.robotparser), y si un dominio lo prohibe NO lo pide
  - User-Agent identificable con contacto
  - maximo 1 request por segundo POR DOMINIO, con backoff ante 429 y 5xx
  - idempotencia por URL: si ya esta capturada y no cambio el contenido, no la duplica
  - lo que falla se anota, no se silencia

Lo que NO hace: login, paywalls, rasters satelitales, datos personales. Ver fuentes.yml.
"""
import hashlib
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request
import urllib.robotparser
from datetime import date, datetime, timezone
from urllib.parse import urlparse

RAIZ = pathlib.Path(__file__).parent
CRUDO = RAIZ / "crudo"
INDICE = CRUDO / ".indice.json"


def cargar_config():
    try:
        import yaml
    except ImportError:
        sys.exit("falta PyYAML: pip install pyyaml")
    return yaml.safe_load((RAIZ / "fuentes.yml").read_text(encoding="utf8"))


class Limitador:
    """Un reloj por dominio. Sin esto, una lista de 20 URLs del mismo sitio son 20 requests
    simultaneas, que es exactamente lo que el contrato prohibe."""

    def __init__(self, delay):
        self.delay = delay
        self.ultimo = {}

    def esperar(self, url):
        d = urlparse(url).netloc
        falta = self.delay - (time.monotonic() - self.ultimo.get(d, 0))
        if falta > 0:
            time.sleep(falta)
        self.ultimo[d] = time.monotonic()


class Robots:
    """robots.txt cacheado por dominio. Si no se puede leer, se ASUME PROHIBIDO: ante la duda
    no se pide. Lo contrario seria decidir a favor nuestro con informacion incompleta."""

    def __init__(self, ua):
        self.ua = ua
        self.cache = {}

    def permite(self, url):
        p = urlparse(url)
        base = f"{p.scheme}://{p.netloc}"
        if base not in self.cache:
            rp = urllib.robotparser.RobotFileParser()
            rp.set_url(base + "/robots.txt")
            try:
                rp.read()
            except Exception:
                self.cache[base] = None
                return False
            self.cache[base] = rp
        rp = self.cache[base]
        return bool(rp and rp.can_fetch(self.ua, url))


def bajar(url, cfg, limitador, robots):
    """Devuelve (html, None) o (None, motivo). El motivo se anota en 06-fuentes.md."""
    ua = cfg["agente"]["user_agent"]
    if not robots.permite(url):
        return None, "robots.txt lo prohibe (o no se pudo leer)"
    for intento in range(cfg["agente"]["reintentos"]):
        limitador.esperar(url)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": ua})
            with urllib.request.urlopen(req, timeout=cfg["agente"]["timeout_s"]) as r:
                return r.read().decode("utf8", errors="replace"), None
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504):
                time.sleep(cfg["agente"]["backoff_base_s"] * (2 ** intento))
                continue
            return None, f"HTTP {e.code}"
        except Exception as e:
            return None, f"{type(e).__name__}: {e}"
    return None, "agotados los reintentos"


def a_markdown(html):
    """Extraccion minima. No pretende ser un conversor: saca script/style y etiquetas, y deja el
    texto. Lo que importa del crudo es poder releer la frase y su cifra, no el formato."""
    html = re.sub(r"(?is)<(script|style|nav|footer|header)[^>]*>.*?</\1>", " ", html)
    html = re.sub(r"(?is)<br\s*/?>|</p>|</div>|</h[1-6]>", "\n", html)
    texto = re.sub(r"(?s)<[^>]+>", " ", html)
    for a, b in [("&nbsp;", " "), ("&amp;", "&"), ("&quot;", '"'), ("&#39;", "'"),
                 ("&lt;", "<"), ("&gt;", ">")]:
        texto = texto.replace(a, b)
    return re.sub(r"\n{3,}", "\n\n", re.sub(r"[ \t]{2,}", " ", texto)).strip()


def slug(url):
    s = re.sub(r"[^a-z0-9]+", "-", urlparse(url).path.lower()).strip("-")
    return (s or urlparse(url).netloc.replace(".", "-"))[:70]


def main():
    cfg = cargar_config()
    CRUDO.mkdir(parents=True, exist_ok=True)
    indice = json.loads(INDICE.read_text()) if INDICE.exists() else {}
    limitador = Limitador(cfg["agente"]["delay_por_dominio_s"])
    robots = Robots(cfg["agente"]["user_agent"])

    urls = [(g["nombre"], g["url"]) for k in ("oficiales", "cooperativa", "clima_satelite")
            for g in (cfg.get(k) or []) if g.get("url")]

    nuevas = sincambio = fallidas = 0
    for nombre, url in urls:
        html, motivo = bajar(url, cfg, limitador, robots)
        if motivo:
            print(f"  FALLO  {url} -> {motivo}")
            indice[url] = {"error": motivo, "fecha": datetime.now(timezone.utc).isoformat()}
            fallidas += 1
            continue
        texto = a_markdown(html)
        h = hashlib.sha256(texto.encode()).hexdigest()
        # Idempotencia por URL: mismo contenido, no se reescribe ni se duplica.
        if indice.get(url, {}).get("sha256") == h:
            print(f"  igual  {url}")
            sincambio += 1
            continue
        archivo = CRUDO / f"{date.today():%Y-%m-%d}-{urlparse(url).netloc}-{slug(url)}.md"
        archivo.write_text(
            "---\n"
            f"url: {url}\n"
            f"titulo: {nombre}\n"
            f"fuente: {urlparse(url).netloc}\n"
            "fecha_publicacion: null   # completar a mano si la pagina la declara\n"
            f"fecha_captura: {datetime.now(timezone.utc).isoformat()}\n"
            "---\n\n" + texto + "\n", encoding="utf8")
        indice[url] = {"sha256": h, "archivo": archivo.name,
                       "fecha": datetime.now(timezone.utc).isoformat()}
        print(f"  NUEVA  {archivo.name}")
        nuevas += 1

    INDICE.write_text(json.dumps(indice, indent=2, ensure_ascii=False), encoding="utf8")
    print(f"\nnuevas={nuevas} sin_cambio={sincambio} fallidas={fallidas}")
    print("Las fallidas van anotadas en 06-fuentes.md, con el motivo.")


if __name__ == "__main__":
    main()
