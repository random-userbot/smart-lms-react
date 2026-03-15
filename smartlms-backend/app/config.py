"""
Smart LMS Backend - Configuration
Environment-based settings with Pydantic
"""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # App
    APP_ENV: str = "development"
    APP_PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"

    # Database (Neon DB)
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost/smartlms"
    DATABASE_URL_SYNC: str = "postgresql://user:password@localhost/smartlms"

    # JWT
    JWT_SECRET_KEY: str = "change-this-to-a-secure-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # Groq (AI)
    GROQ_API_KEY: str = ""

    # Debug
    DEBUG_MODE: bool = True
    DEBUG_LOG_DIR: str = "./debug_logs"

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()

# Ensure debug log directory exists
if settings.DEBUG_MODE:
    os.makedirs(settings.DEBUG_LOG_DIR, exist_ok=True)
