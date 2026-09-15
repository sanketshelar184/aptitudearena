from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AptitudeArena API"
    api_v1_prefix: str = "/api/v1"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://aptitude:aptitude@localhost:5432/aptitude_arena"
    secret_key: str = "development-only-secret-change-before-production"
    access_token_expire_minutes: int = 1440
    initial_admin_email: str | None = None
    cors_origins: list[str] = ["http://localhost:3000"]

    # Razorpay Payment Gateway (Indian Payments)
    razorpay_key_id: str | None = None
    razorpay_key_secret: str | None = None
    razorpay_webhook_secret: str | None = None
    razorpay_mock_mode: bool = True

    # Google OAuth 2.0 / Google Identity Services
    google_client_id: str | None = None

    # Google Gemini API Key
    gemini_api_key: str | None = None

    @field_validator("database_url", mode="after")
    @classmethod
    def assemble_db_connection(cls, v: str) -> str:
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+psycopg://", 1)
        if v.startswith("postgresql://") and not v.startswith("postgresql+"):
            return v.replace("postgresql://", "postgresql+psycopg://", 1)
        return v

    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
