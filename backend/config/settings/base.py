"""Settings shared by every environment.

Environment-specific overrides live in dev.py / prod.py / test.py.
"""

import os
from datetime import timedelta
from pathlib import Path

from django.utils.translation import gettext_lazy as _

from config import hotel_config

BASE_DIR = Path(__file__).resolve().parents[2]

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "insecure-dev-key-change-me")
DEBUG = False
ALLOWED_HOSTS: list[str] = []

# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "corsheaders",
    "drf_spectacular",
]

LOCAL_APPS = [
    "apps.common",
    "apps.accounts",
    "apps.rooms",
    "apps.gallery",
    "apps.services",
    "apps.reservations",
    "apps.reviews",
    "apps.blog",
    "apps.contact",
    "apps.concierge",
    "apps.audit",
    "apps.dashboard",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
_DB_NAME = hotel_config.get("infrastructure.databaseName")
_DB_USER = hotel_config.get("infrastructure.databaseUser")

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", _DB_NAME),
        "USER": os.environ.get("POSTGRES_USER", _DB_USER),
        # Dev-only fallback; prod supplies POSTGRES_PASSWORD from the environment.
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", _DB_USER),
        "HOST": os.environ.get("POSTGRES_HOST", "127.0.0.1"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# Internationalisation - fr is the default, ar is RTL, en is optional
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "fr"
LANGUAGES = [
    ("fr", _("French")),
    ("ar", _("Arabic")),
    ("en", _("English")),
]
LOCALE_PATHS = [BASE_DIR / "locale"]
TIME_ZONE = "Africa/Algiers"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static & media
# ---------------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# ---------------------------------------------------------------------------
# DRF & OpenAPI
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        # Session auth is kept for the Django admin and the browsable API only.
        # It is listed second so a Bearer token always wins.
        "rest_framework.authentication.SessionAuthentication",
    ],
    # Closed by default. Public endpoints opt out with an explicit
    # `permission_classes = [AllowAny]`, which means a new endpoint is private
    # until someone deliberately opens it — the opposite default leaks data
    # every time a developer forgets.
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend"],
    "DEFAULT_PAGINATION_CLASS": "apps.common.pagination.DefaultPagination",
    "PAGE_SIZE": 12,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.ScopedRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {
        "contact": "5/hour",
        "review": "3/hour",
        "reservation": "10/hour",
        "auth": "20/hour",
    },
}

# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------
AUTH_USER_MODEL = "accounts.User"

SIMPLE_JWT = {
    # Short access token, long refresh. A stolen access token is useless within
    # the hour; the refresh token is the one that must be protected, which is
    # why the login view puts it in an httpOnly cookie rather than the body.
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    # Rotate on every refresh and blacklist the token just used, so a replayed
    # refresh token is detected instead of silently accepted.
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "TOKEN_OBTAIN_SERIALIZER": "apps.accounts.serializers.RoleTokenObtainPairSerializer",
}

# Name of the httpOnly cookie carrying the refresh token.
REFRESH_COOKIE_NAME = hotel_config.get("infrastructure.refreshCookieName", "hotel_refresh")
REFRESH_COOKIE_SECURE = os.environ.get("REFRESH_COOKIE_SECURE", "1") == "1"
REFRESH_COOKIE_SAMESITE = os.environ.get("REFRESH_COOKIE_SAMESITE", "Lax")

SPECTACULAR_SETTINGS = {
    "TITLE": hotel_config.get("infrastructure.apiTitle"),
    "DESCRIPTION": hotel_config.get("infrastructure.apiDescription"),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# ---------------------------------------------------------------------------
# CORS - the Next.js frontend is the only browser client
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = [
    origin
    for origin in os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin
]

# The admin console sends the refresh cookie cross-origin (Next on :3000, Django
# on :8000). Requires an explicit origin allow-list — never combine with
# CORS_ALLOW_ALL_ORIGINS, which the browser rejects alongside credentials anyway.
#
# The cookie itself is SameSite=Lax, which is sufficient because "site" ignores
# the port: localhost:3000 and localhost:8000 are same-site, as are
# www.hotelelmehri.dz and api.hotelelmehri.dz. Moving the API to an
# unrelated domain would force SameSite=None; Secure.
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# Email - contact, reservation and review notifications
# ---------------------------------------------------------------------------
DEFAULT_FROM_EMAIL = os.environ.get(
    "DEFAULT_FROM_EMAIL", hotel_config.get("infrastructure.defaultFromEmail")
)
STAFF_NOTIFICATION_EMAIL = os.environ.get(
    "STAFF_NOTIFICATION_EMAIL", hotel_config.get("infrastructure.staffNotificationEmail")
)
