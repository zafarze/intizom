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

# Автоматически создаем админа (если его еще нет)
export DJANGO_SUPERUSER_USERNAME=admin
export DJANGO_SUPERUSER_EMAIL=admin@example.com
export DJANGO_SUPERUSER_PASSWORD=admin_intizom_2026
python manage.py createsuperuser --noinput || true

# Запускаем Daphne (для поддержки WebSocket и HTTP)
exec daphne -b 0.0.0.0 -p ${PORT:-8000} config.asgi:application
