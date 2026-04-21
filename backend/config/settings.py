import os
from pathlib import Path
import environ

# Базовая директория
BASE_DIR = Path(__file__).resolve().parent.parent

# Чтение переменных окружения
env = environ.Env(
    DEBUG=(bool, False)
)
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

SECRET_KEY = env('SECRET_KEY')
DEBUG = env('DEBUG')

# Безопасность: в продакшне задайте ALLOWED_HOSTS в .env через запятую
# Пример: ALLOWED_HOSTS=intizom.com,www.intizom.com,intizom-backend-776689431155.europe-west3.run.app
if DEBUG:
    ALLOWED_HOSTS = ['*']
else:
    # Безопасность: в продакшне обязательно задайте ALLOWED_HOSTS через запятую
    ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=[
        'intizom-backend-776689431155.europe-west3.run.app',
    ])

# Приложения
INSTALLED_APPS = [
    'daphne', # Daphne must be at the very top for WebSockets
    'modeltranslation',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # 3rd party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',  # Блокировка устаревших JWT токенов
    'corsheaders',
    'storages',
    'channels',
    
    # My apps
    'app',
]

# Middleware
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware', 
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'app.middleware.UpdateLastActivityMiddleware',
]

ROOT_URLCONF = 'config.urls'

# Шаблоны
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# База данных PostgreSQL
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('DB_NAME'),
        'USER': env('DB_USER'),
        'PASSWORD': env('DB_PASSWORD'),
        'HOST': env('DB_HOST'),
        'PORT': env('DB_PORT'),
    }
}

# Валидация паролей
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Локализация
LANGUAGE_CODE = 'ru'
TIME_ZONE = 'Asia/Dushanbe'
USE_I18N = True
USE_TZ = True

LANGUAGES = (
    ('ru', 'Russian'),
    ('tg', 'Tajik'),
    ('en', 'English'),
)

MODELTRANSLATION_DEFAULT_LANGUAGE = 'ru'
MODELTRANSLATION_FALLBACK_LANGUAGES = ('ru', 'tg', 'en')

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Безопасность CORS: в продакшне задайте CORS_ALLOWED_ORIGINS в .env через запятую
# Пример: CORS_ALLOWED_ORIGINS=https://intizom.com,https://www.intizom.com
_DEFAULT_PROD_ORIGINS = [
    'https://intizom-school.web.app',
    'https://intizom-school.firebaseapp.com',
]
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOW_ALL_ORIGINS = env.bool('CORS_ALLOW_ALL_ORIGINS', default=False)
    CORS_ALLOWED_ORIGINS = list({
        *_DEFAULT_PROD_ORIGINS,
        *env.list('CORS_ALLOWED_ORIGINS', default=[]),
    })
    CSRF_TRUSTED_ORIGINS = list({
        *_DEFAULT_PROD_ORIGINS,
        *env.list('CSRF_TRUSTED_ORIGINS', default=[]),
    })

CORS_ALLOW_CREDENTIALS = True  # Разрешить куки/токены в cross-site запросах
CORS_ALLOW_HEADERS = [
    'accept',
    'authorization',
    'content-type',
    'x-csrftoken',
]

# Настройки Django REST Framework и JWT
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'login': '10/minute',  # Ограничение брутфорса паролей (10 попыток в минуту)
    }
}

from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60), # Access-токен живет 1 час (для безопасности)
    'REFRESH_TOKEN_LIFETIME': timedelta(days=90),   # Refresh-токен живет 3 месяца (для удобства в PWA)
    
    # ВОТ ОНА — МАГИЯ ДЛЯ PWA!
    'ROTATE_REFRESH_TOKENS': True, # Выдавать новый refresh_token при каждом обновлении
    'BLACKLIST_AFTER_ROTATION': True, # Блокировать старые refresh_tokens (защита от кражи)
    
    'AUTH_HEADER_TYPES': ('Bearer',),
}
import os
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Настройки статики для Django 5.1+
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}


# --- Настройки OpenAI ---
GEMINI_API_KEY = env('GEMINI_API_KEY', default=None)

# --- Настройки Channels (Redis) ---
REDIS_URL = env('REDIS_URL', default=None)

if REDIS_URL:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [REDIS_URL],
            },
        },
    }
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer"
        }
    }

# --- Кеш (Redis в проде, LocMem в локальной разработке) ---
if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        }
    }

# --- НАСТРОЙКИ ДЛЯ GOOGLE CLOUD RUN ---
# В .env задайте: CSRF_TRUSTED_ORIGINS=https://intizom.com,https://intizom-backend-776689431155.europe-west3.run.app
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[])
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# --- SECURE HEADERS (только в продакшне) ---
if not DEBUG:
    SECURE_HSTS_SECONDS = 31536000          # 1 год
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = 'DENY'

# --- МЕДИА ФАЙЛЫ (голосовые, фото) ---
GS_BUCKET_NAME = env('GS_BUCKET_NAME', default=None)

if GS_BUCKET_NAME:
    # ПРОДАКШН: Google Cloud Storage
    STORAGES = {
        'default': {
            'BACKEND': 'storages.backends.gcloud.GoogleCloudStorage',
            'OPTIONS': {
                'bucket_name': GS_BUCKET_NAME,
                'default_acl': None,
                'querystring_auth': False,
            },
        },
        'staticfiles': {
            'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage',
        },
    }
    MEDIA_URL = f'https://storage.googleapis.com/{GS_BUCKET_NAME}/'
else:
    # ЛОКАЛЬНАЯ РАЗРАБОТКА: обычная файловая система
    STORAGES = {
        'default': {
            'BACKEND': 'django.core.files.storage.FileSystemStorage',
        },
        'staticfiles': {
            'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage',
        },
    }
    MEDIA_URL = '/media/'

MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
