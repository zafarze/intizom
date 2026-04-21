#!/bin/bash

# Собираем статику
python manage.py collectstatic --noinput --clear

echo "Ожидание подключения к базе данных..."
# Пытаемся накатить миграции. Если база не готова, ждем 3 секунды и пробуем снова.
for i in {1..15}; do
    python manage.py migrate --noinput && break
    echo "База еще не готова, ждем 3 секунды..."
    sleep 3
done

# Автоматически создаем админа (если задан пароль в переменных окружения)
if [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
    export DJANGO_SUPERUSER_USERNAME=${DJANGO_SUPERUSER_USERNAME:-admin}
    export DJANGO_SUPERUSER_EMAIL=${DJANGO_SUPERUSER_EMAIL:-admin@example.com}
    python manage.py createsuperuser --noinput || true
fi
# Cloud Run сам скейлит инстансы горизонтально, поэтому 1 воркер на контейнер.
# 4 воркера × ~125 MiB Django = OOM в 512 MiB лимите. Конкурентность даёт asyncio event loop.
exec uvicorn config.asgi:application --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --proxy-headers
