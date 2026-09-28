"""La configuracion no arranca a medias: o esta completa o falla."""

import pytest
from pydantic import ValidationError

from api.config import Config


def test_falta_una_variable_y_no_arranca(monkeypatch: pytest.MonkeyPatch) -> None:
    """Sin `PGDATABASE` la API no tiene que arrancar, ni con defaults ni con vacio."""
    for var in ("PGDATABASE", "PGUSER", "PGPASSWORD"):
        monkeypatch.delenv(var, raising=False)

    with pytest.raises(ValidationError):
        Config(_env_file=None)


def test_el_dsn_se_arma_con_lo_que_vino(monkeypatch: pytest.MonkeyPatch) -> None:
    """Y el DSN usa exactamente lo que se le dio, sin inventar defaults."""
    monkeypatch.setenv("PGDATABASE", "agro")
    monkeypatch.setenv("PGUSER", "agro_admin")
    monkeypatch.setenv("PGPASSWORD", "secreta")

    cfg = Config(_env_file=None)
    dsn = cfg.dsn()

    assert "dbname=agro" in dsn
    assert "user=agro_admin" in dsn
    assert "host=127.0.0.1" in dsn
    assert "port=5432" in dsn


def test_la_password_no_aparece_en_el_repr(monkeypatch: pytest.MonkeyPatch) -> None:
    """Un `print(cfg)` en un log no puede filtrar la contraseña.

    Es el caso que mas veces termina en un secreto versionado: alguien loguea el objeto de
    configuracion entero para depurar y la contraseña queda en el archivo de log.
    """
    monkeypatch.setenv("PGDATABASE", "agro")
    monkeypatch.setenv("PGUSER", "agro_admin")
    monkeypatch.setenv("PGPASSWORD", "no-debe-aparecer")

    cfg = Config(_env_file=None)

    assert "no-debe-aparecer" not in repr(cfg)
