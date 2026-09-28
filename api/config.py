"""Configuracion leida del entorno.

POR QUE FALLA FUERTE Y TEMPRANO: una conexion a la base sin contraseña no falla al arrancar,
falla en la primera consulta -- y para entonces ya hay requests en vuelo y el error aparece como
"no se pudo leer la parcela" en vez de "falta una variable de entorno". Se prefiere no arrancar.

POR QUE LOS NOMBRES SON `PGHOST` Y NO `PG_HOST`: son los de libpq, y ya estaban declarados en el
`.env.example` de este repo. Usarlos significa que `psql` sin argumentos y `psycopg` toman la misma
configuracion que la API, sin repetirla en dos lados -- y que un script de verificacion contra la
base no necesita su propio bloque de variables.
"""

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    """Lo que la API necesita para arrancar. Todo sale del entorno o del .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    host: str = Field(default="127.0.0.1", validation_alias="PGHOST")
    puerto: int = Field(default=5432, validation_alias="PGPORT")
    base: str = Field(validation_alias="PGDATABASE")
    usuario: str = Field(validation_alias="PGUSER")
    # `SecretStr` y no `str`: con `str`, un `print(cfg)` o un log del objeto entero deja la
    # contraseña escrita en el archivo de log. Lo encontro el test, no una revision -- la primera
    # version de este archivo la filtraba. Para leerla hay que pedirla con `.get_secret_value()`,
    # que es justo la friccion que hace falta.
    password: SecretStr = Field(validation_alias="PGPASSWORD")

    def dsn(self) -> str:
        """El DSN de psycopg.

        La contraseña no se registra en ningun log: este valor no se imprime.
        """
        return (
            f"host={self.host} port={self.puerto} dbname={self.base} "
            f"user={self.usuario} password={self.password.get_secret_value()}"
        )
