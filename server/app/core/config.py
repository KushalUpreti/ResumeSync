from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="RESUMESYNC_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "ResumeSync API"
    env: str = "development"
    use_aws_services: bool = False
    aws_region: str = "us-east-1"
    storage_bucket: str = "resumesync-local"
    queue_name: str = "resumesync-jobs"
    queue_url: str | None = None
    data_root: Path = Path(__file__).resolve().parents[2] / ".runtime"
    poll_interval_seconds: float = 2.0
    cognito_user_pool_id: str | None = None
    cognito_region: str | None = None
    cognito_app_client_id: str | None = None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    settings.data_root.mkdir(parents=True, exist_ok=True)
    return settings
