import os
from django.conf import settings
import firebase_admin
from firebase_admin import credentials, messaging

def send_push_notification(user, title, body, data=None):
    """
    Отправляет Push-уведомление через Firebase Cloud Messaging.
    Требуется файл firebase-adminsdk.json в папке backend.
    """
    from app.models import FCMDevice
    devices = FCMDevice.objects.filter(user=user)
    if not devices.exists():
        return

    tokens = list(devices.values_list('token', flat=True))

    # Инициализация Firebase (один раз)
    if not firebase_admin._apps:
        cred_path = os.path.join(settings.BASE_DIR, 'firebase-adminsdk.json')
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            print("FIREBASE ADMIN SDK KEY NOT FOUND! Cannot send push.")
            return

    message = messaging.MulticastMessage(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data=data or {},
        tokens=tokens,
    )

    try:
        response = messaging.send_multicast(message)
        print(f"FCM: Sent {response.success_count} messages.")
    except Exception as e:
        print(f"FCM Error: {e}")
