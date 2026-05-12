from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "Tomcat Manager"
    debug: bool = False

    database_url: str = "postgresql://postgres:postgres@localhost:5432/tomcat_manager"

    secret_key: str = ""
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    encryption_key: str = ""

    allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    class Config:
        env_file = ".env"

    @field_validator("secret_key")
    @classmethod
    def secret_key_must_be_strong(cls, v: str) -> str:
        if not v:
            raise ValueError(
                "SECRET_KEY is not set. "
                'Generate one with: python -c "import secrets; print(secrets.token_hex(32))"'
            )
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v

    @field_validator("encryption_key")
    @classmethod
    def encryption_key_must_be_set(cls, v: str) -> str:
        if not v:
            raise ValueError(
                "ENCRYPTION_KEY is not set. "
                'Generate one with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"'
            )
        return v

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
