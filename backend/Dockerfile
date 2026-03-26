FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y libpq-dev gcc

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Делаем наш стартовый скрипт исполняемым
RUN chmod +x entrypoint.sh

EXPOSE 8000

# Указываем скрипт как главную команду для запуска
ENTRYPOINT ["/app/entrypoint.sh"]
