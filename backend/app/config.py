import json
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./sentinelcloud.db"
    DISCORD_WEBHOOK_URL: str = ""
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS_ORIGINS from a comma-separated string or JSON array string."""
        raw = (self.CORS_ORIGINS or "").strip()
        if not raw:
            return ["http://localhost:3000", "http://127.0.0.1:3000"]

        if raw.startswith("["):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    return [str(o).strip().rstrip("/") for o in parsed if str(o).strip()]
            except json.JSONDecodeError:
                pass

        return [
            origin.strip().rstrip("/")
            for origin in raw.split(",")
            if origin.strip()
        ]


settings = Settings()
