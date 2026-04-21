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

        # Инициализация Firebase (thread-safe, один раз при старте приложения).
        # На Cloud Run файл может быть смонтирован в /secrets или просто лежать в /app.
        if not firebase_admin._apps:
            candidates = [
                os.environ.get('FIREBASE_ADMIN_SDK_PATH'),
                os.path.join(settings.BASE_DIR, 'firebase-adminsdk.json'),
                '/app/firebase-adminsdk.json',
                '/secrets/firebase-adminsdk.json',
            ]
            cred_path = next((p for p in candidates if p and os.path.exists(p)), None)
            if cred_path:
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                print(f"Firebase Admin SDK initialised from: {cred_path}")
            else:
                print(f"FIREBASE ADMIN SDK KEY NOT FOUND. Checked: {candidates}")

        # Импортируем сигналы при старте сервера
        import app.signals