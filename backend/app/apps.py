# apps.py
from django.apps import AppConfig

class AppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'app' # Имя твоего приложения (проверь, чтобы совпадало)

    def ready(self):
        import os
        from django.conf import settings
        import firebase_admin
        from firebase_admin import credentials

        # Инициализация Firebase (thread-safe, один раз при старте приложения)
        if not firebase_admin._apps:
            cred_path = os.path.join(settings.BASE_DIR, 'firebase-adminsdk.json')
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            else:
                print("FIREBASE ADMIN SDK KEY NOT FOUND during startup!")

        # Импортируем сигналы при старте сервера
        import app.signals