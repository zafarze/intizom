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
# Запускаем сервер с 4 воркерами для параллельной обработки запросов
exec uvicorn config.asgi:application --host 0.0.0.0 --port ${PORT:-8000} --workers 4 --proxy-headers
