# apps.py
from django.apps import AppConfig

class AppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'app' # Имя твоего приложения (проверь, чтобы совпадало)

    def ready(self):
        # Импортируем сигналы при старте сервера
        import app.signals