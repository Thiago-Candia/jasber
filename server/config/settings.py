"""Configuración de Jasber (backend Django).

Todo lo sensible o dependiente del entorno se lee de variables de entorno.
Ver `.env.example` para la lista completa.
"""

import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent


def env(name, default=None):
    return os.environ.get(name, default)


def env_bool(name, default=False):
    return str(env(name, str(default))).strip().lower() in {"1", "true", "yes", "on"}


def env_list(name, default=""):
    return [item.strip() for item in str(env(name, default)).split(",") if item.strip()]


DEBUG = env_bool("DJANGO_DEBUG", True)

SECRET_KEY = env("SECRET_KEY")
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured("SECRET_KEY es obligatoria cuando DJANGO_DEBUG=false")
    SECRET_KEY = "dev-only-insecure-key-change-me-before-deploying-jasber"

JWT_SECRET = env("JWT_SECRET") or SECRET_KEY
JWT_ALGORITHM = "HS256"
JWT_LIFETIME = timedelta(hours=24)

ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", "localhost,127.0.0.1,[::1]")
# Railway hace el health check con este Host; sin él, /up respondería 400 y el deploy nunca quedaría sano.
if "healthcheck.railway.app" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append("healthcheck.railway.app")

FRONTEND_URL = (env("FRONTEND_URL") or "http://localhost:5173").rstrip("/")
CORS_ALLOWED_ORIGINS = list(dict.fromkeys(["http://localhost:5173", *env_list("FRONTEND_URL")]))
CORS_URLS_REGEX = r"^/api/.*$"
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS")

INSTALLED_APPS = [
    "daphne",
    "apps.core.admin_config.JasberAdminConfig",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "channels",
    "apps.core",
    "apps.accounts",
    "apps.workspaces",
    "apps.chat",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "apps.core.middleware.RequestSizeLimitMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
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
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# Sin DATABASE_URL se usa SQLite para desarrollo local; en CI y producción, PostgreSQL.
DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{(BASE_DIR / 'db.sqlite3').as_posix()}",
        conn_max_age=int(env("CONN_MAX_AGE", "60")),
    )
}

AUTH_USER_MODEL = "accounts.User"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LANGUAGE_CODE = "es-ar"
TIME_ZONE = "America/Argentina/Buenos_Aires"
USE_I18N = True
USE_TZ = True

APPEND_SLASH = False

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": (
            "django.contrib.staticfiles.storage.StaticFilesStorage"
            if DEBUG
            else "whitenoise.storage.CompressedManifestStaticFilesStorage"
        )
    },
}

# Archivos públicos (avatares e imágenes de workspace), como hacía Active Storage.
MEDIA_URL = "/media/"
MEDIA_ROOT = Path(env("MEDIA_ROOT") or BASE_DIR / "media")
# Adjuntos de mensajes: fuera de MEDIA_ROOT, solo se sirven por la vista autenticada.
PRIVATE_MEDIA_ROOT = Path(env("PRIVATE_MEDIA_ROOT") or BASE_DIR / "private_media")
MAX_ATTACHMENT_SIZE_MB = int(env("MAX_ATTACHMENT_SIZE_MB", "10"))
MAX_ATTACHMENTS_PER_MESSAGE = int(env("MAX_ATTACHMENTS_PER_MESSAGE", "10"))
# Ejecutables y scripts no se aceptan como adjuntos (configurable, separado por comas).
BLOCKED_ATTACHMENT_EXTENSIONS = env_list(
    "BLOCKED_ATTACHMENT_EXTENSIONS", ".exe,.msi,.bat,.cmd,.com,.scr,.ps1,.vbs,.js,.jar,.sh,.dll"
)
MAX_IMAGE_SIZE_MB = int(env("MAX_IMAGE_SIZE_MB", "5"))
# Corta requests gigantes antes de leerlas completas (adjuntos * cantidad + margen).
MAX_REQUEST_SIZE_MB = int(env("MAX_REQUEST_SIZE_MB", str(MAX_ATTACHMENT_SIZE_MB * MAX_ATTACHMENTS_PER_MESSAGE + 1)))

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["apps.core.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.FormParser",
        "rest_framework.parsers.MultiPartParser",
    ],
    "EXCEPTION_HANDLER": "apps.core.exceptions.api_exception_handler",
    "UNAUTHENTICATED_USER": None,
}

REDIS_URL = env("REDIS_URL")
CHANNEL_LAYERS = {
    "default": (
        {"BACKEND": "channels_redis.core.RedisChannelLayer", "CONFIG": {"hosts": [REDIS_URL]}}
        if REDIS_URL
        else {"BACKEND": "channels.layers.InMemoryChannelLayer"}
    )
}

DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", "no-reply@jasber.test")
# Sin EMAIL_HOST los mails se imprimen en consola (desarrollo). Con EMAIL_HOST se usa SMTP.
if env("EMAIL_HOST"):
    MAILERS = {
        "default": {
            "BACKEND": "django.core.mail.backends.smtp.EmailBackend",
            "OPTIONS": {
                "host": env("EMAIL_HOST"),
                "port": int(env("EMAIL_PORT", "587")),
                "username": env("EMAIL_HOST_USER", ""),
                "password": env("EMAIL_HOST_PASSWORD", ""),
                "use_tls": env_bool("EMAIL_USE_TLS", True),
                "timeout": 10,
            },
        }
    }
else:
    MAILERS = {"default": {"BACKEND": "django.core.mail.backends.console.EmailBackend"}}
# Equivalente a deliver_later: el envío no bloquea la respuesta HTTP.
EMAIL_ASYNC = env_bool("EMAIL_ASYNC", True)

SECURE_CONTENT_TYPE_NOSNIFF = True
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
    SECURE_REDIRECT_EXEMPT = [r"^up$"]  # el health check de Railway entra por HTTP interno
    SECURE_HSTS_SECONDS = int(env("SECURE_HSTS_SECONDS", "0"))

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": env("LOG_LEVEL", "INFO")},
    # Django y daphne ya tienen su handler: sin esto cada línea se imprime dos veces.
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "daphne": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}
