"""Application configuration loaded from environment variables."""

from decimal import Decimal
from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Hospital Billing System API"
    database_url: str
    jwt_secret_key: str = Field(min_length=32)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    tax_rate_percent: Decimal = Field(default=Decimal("18.00"), ge=0)
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,file://,null"
    initial_admin_username: str | None = None
    initial_admin_password: str | None = Field(default=None, min_length=8)
    initial_admin_full_name: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @model_validator(mode="after")
    def validate_initial_admin(self) -> "Settings":
        admin_values = (
            self.initial_admin_username,
            self.initial_admin_password,
            self.initial_admin_full_name,
        )
        if any(admin_values) and not all(admin_values):
            raise ValueError("All INITIAL_ADMIN_* variables must be provided together")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
