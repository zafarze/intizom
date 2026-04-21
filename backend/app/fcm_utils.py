import logging

import firebase_admin
from firebase_admin import messaging

logger = logging.getLogger(__name__)


def send_push_notification(user, title, body, data=None):
    """Send an FCM push to every registered device for `user`.

    Silent no-op if the user has no registered devices. Returns the number
    of successful deliveries (0 if the SDK isn't initialised or there are
    no tokens).
    """
    from app.models import FCMDevice
    tokens = list(FCMDevice.objects.filter(user=user).values_list('token', flat=True))
    if not tokens:
        return 0

    if not firebase_admin._apps:
        logger.error(
            "FCM skipped: firebase_admin not initialised (firebase-adminsdk credentials missing). "
            "user_id=%s title=%r", user.id, title,
        )
        return 0

    message = messaging.MulticastMessage(
        notification=messaging.Notification(title=title, body=body),
        data={k: str(v) for k, v in (data or {}).items()},
        tokens=tokens,
    )

    try:
        # send_multicast использовал удалённый /batch/fcm/send endpoint (404 с 2024).
        # send_each_for_multicast шлёт каждое сообщение отдельно.
        response = messaging.send_each_for_multicast(message)
        if response.failure_count:
            logger.warning(
                "FCM partial failure: success=%d failure=%d user_id=%s",
                response.success_count, response.failure_count, user.id,
            )
        return response.success_count
    except Exception:
        logger.exception("FCM send failed for user_id=%s", user.id)
        return 0

def send_bulk_push_notification(users, title, body, data=None):
    """Send an FCM push to multiple users at once.

    Extracts all tokens for the provided list or queryset of users and sends multicast messages.
    Handles chunking if tokens exceed the Firebase limit of 500 per request.
    """
    from app.models import FCMDevice
    if not users:
        return 0
        
    tokens = list(FCMDevice.objects.filter(user__in=users).values_list('token', flat=True))
    if not tokens:
        return 0

    if not firebase_admin._apps:
        logger.error(
            "FCM bulk skipped: firebase_admin not initialised (firebase-adminsdk credentials missing). "
            "title=%r", title,
        )
        return 0

    success_count = 0
    failure_count = 0
    
    # Firebase limits multicast message to 500 tokens at once
    for i in range(0, len(tokens), 500):
        chunk = tokens[i:i+500]
        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            tokens=chunk,
        )
        try:
            response = messaging.send_each_for_multicast(message)
            success_count += response.success_count
            failure_count += response.failure_count
        except Exception:
            logger.exception("FCM bulk send failed")

    if failure_count > 0:
        logger.warning("FCM bulk partial failure: success=%d failure=%d", success_count, failure_count)
        
    return success_count
