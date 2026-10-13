"""
Base settings — shared by every environment.

Everything environment-specific comes from env vars (see .env.example).
The DATABASE_URL is parsed by hand to avoid an extra dependency; supported
schemes: postgres / postgresql / sqlite.
"""

from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import unquote, urlparse

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")


def env(key: str, default: str | None = None) -> str | None:
    value = os.environ.get(key)
    return value if value not in (None, "") else default


def env_bool(key: str, default: bool = False) -> bool:
    raw = env(key)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def env_int(key: str, default: int) -> int:
    raw = env(key)
    return int(raw) if raw is not None else default



def env_list(key: str, default: list[str]) -> list[str]:
    raw = env(key)
    if raw is None:
        return default
    return [item.strip() for item in raw.split(",") if item.strip()]


def _database_from_url(url: str) -> dict:
    parsed = urlparse(url)
    if parsed.scheme.startswith("sqlite"):
        path = parsed.path.lstrip("/") or ":memory:"
        return {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": path if os.path.isabs(path) else str(BASE_DIR / path),
        }
    if parsed.scheme.startswith(("postgres", "postgresql")):
        return {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": parsed.path.lstrip("/"),
            "USER": unquote(parsed.username or ""),
            "PASSWORD": unquote(parsed.password or ""),
            "HOST": parsed.hostname or "localhost",
            "PORT": str(parsed.port or 5432),
        }
    raise ImproperlyConfiguredError(f"Unsupported DATABASE_URL scheme: {parsed.scheme}")


class ImproperlyConfiguredError(Exception):
    """Raised for malformed env-provided configuration."""


SECRET_KEY = env("DJANGO_SECRET_KEY", default="django-insecure-dev-only-key-change-me")
DEBUG = env_bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# --- Applications -----------------------------------------------------------

DJANGO_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "corsheaders",
    "rest_framework_simplejwt.token_blacklist",
    "drf_spectacular",
]

LOCAL_APPS = [
    "apps.users.apps.UsersConfig",
    "apps.workspaces.apps.WorkspacesConfig",
    "apps.invitations.apps.InvitationsConfig",
    "apps.projects.apps.ProjectsConfig",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Minimal template engine — required only by drf-spectacular's /api/docs page.
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": []},
    }
]

# --- Database ---------------------------------------------------------------

DATABASES = {
    "default": _database_from_url(
        env("DATABASE_URL", default=f"sqlite:///{(BASE_DIR / 'db.sqlite3').as_posix()}") or ""
    )
}


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "users.User"

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# --- Django REST Framework --------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
    ],
    "EXCEPTION_HANDLER": "apps.common.api.exception_handler.api_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [],
    "DEFAULT_THROTTLE_RATES": {
        "auth": env("THROTTLE_AUTH", default="30/min"),
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env_int("JWT_ACCESS_MINUTES", default=15)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env_int("JWT_REFRESH_DAYS", default=7)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# Refresh cookie (HttpOnly) — see backend/README.md, "Authentication strategy".
REFRESH_COOKIE_NAME = "pulse_refresh_token"
REFRESH_COOKIE_MAX_AGE = env_int("JWT_REFRESH_DAYS", default=7) * 24 * 60 * 60
REFRESH_COOKIE_SECURE = env_bool("REFRESH_COOKIE_SECURE", default=not DEBUG)
REFRESH_COOKIE_SAMESITE = env("REFRESH_COOKIE_SAMESITE", default="Lax")

# --- Invitations ------------------------------------------------------------

INVITATION_TTL_DAYS = env_int("INVITATION_TTL_DAYS", default=7)

# --- CORS -------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", default=["http://localhost:3000"])
CORS_ALLOW_CREDENTIALS = True

# --- i18n / tz --------------------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# --- Static / docs ----------------------------------------------------------

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

SPECTACULAR_SETTINGS = {
    "TITLE": "Pulse API",
    "DESCRIPTION": "Pulse — project & issue management platform for software teams.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "POSTPROCESSING_HOOKS": [
        "apps.common.presentation.openapi.wrap_success_envelope",
    ],
}

# --- Email (SMTP Configuration) --------------------------------
EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend" if DEBUG else "django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = env("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = env_int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", default=True)
EMAIL_USE_SSL = env_bool("EMAIL_USE_SSL", default=False)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="Pulse <no-reply@pulse.dev>")
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:3210")
