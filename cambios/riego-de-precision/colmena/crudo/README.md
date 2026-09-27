# crudo/ -- capturas de documentos

**Vacia a proposito, por ahora.** Aca va **un `.md` por documento capturado**, con frontmatter
(`url`, `titulo`, `fuente`, `fecha_publicacion`, `fecha_captura`) y el texto completo debajo.

La llena `python3 ../capturar.py`, que lee las fuentes de `../fuentes.yml`. **Todavia no se corrio**:
el relevamiento del 25/09 se hizo leyendo las paginas a mano, sin scraping.

**Correrlo cuando**: haya que re-verificar una fuente, o pasado un tiempo para ver que cambio. Es
idempotente por URL, asi que volver a correrlo no duplica lo que no cambio.
