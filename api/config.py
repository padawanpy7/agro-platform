"""Configuracion leida del entorno.

POR QUE FALLA FUERTE Y TEMPRANO: una conexion a la base sin `PGPASSWORD` no
falla al arrancar, falla en la primera consulta -- y para entonces ya hay
requests en vuelo y el error aparece como "no se pudo leer la parcela" en vez
de "falta una variable de entorno". Se prefiere no arrancar.
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    """Lo que la API necesita para arrancar. Todo sale del entorno o del .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    pg_host: str = Field(default="127.0.0.1")
    pg_port: int = Field(default=5432)
    pg_base: str = Field(...)
    pg_usuario: str = Field(...)
    pg_password: str = Field(...)

    def dsn(self) -> str:
        """El DSN de psycopg.

        La contraseña no se registra en ningun log: este valor no se imprime.
        """
        return (
            f"host={self.pg_host} port={self.pg_port} dbname={self.pg_base} "
            f"user={self.pg_usuario} password={self.pg_password}"
        )
