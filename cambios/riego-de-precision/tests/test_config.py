"""La configuracion no arranca a medias: o esta completa o falla."""

import pytest
from pydantic import ValidationError

from api.config import Config


def test_falta_una_variable_y_no_arranca(monkeypatch: pytest.MonkeyPatch) -> None:
    """Sin `PG_BASE` la API no tiene que arrancar, ni con defaults ni con vacio."""
    for var in ("PG_BASE", "PG_USUARIO", "PG_PASSWORD"):
        monkeypatch.delenv(var, raising=False)

    with pytest.raises(ValidationError):
        Config(_env_file=None)


def test_el_dsn_se_arma_con_lo_que_vino(monkeypatch: pytest.MonkeyPatch) -> None:
    """Y el DSN usa exactamente lo que se le dio, sin inventar defaults."""
    monkeypatch.setenv("PG_BASE", "agro")
    monkeypatch.setenv("PG_USUARIO", "agro_app")
    monkeypatch.setenv("PG_PASSWORD", "secreta")

    cfg = Config(_env_file=None)
    dsn = cfg.dsn()

    assert "dbname=agro" in dsn
    assert "user=agro_app" in dsn
    assert "host=127.0.0.1" in dsn
    assert "port=5432" in dsn
