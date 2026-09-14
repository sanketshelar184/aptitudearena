from functools import lru_cache

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

    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
