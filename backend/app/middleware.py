from django.utils import timezone
from .models import UserActivity

from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

User = get_user_model()

@database_sync_to_async
def get_user_from_token(token):
    try:
        access_token = AccessToken(token)
        user = User.objects.get(id=access_token['user_id'])
        return user
    except Exception:
        return AnonymousUser()

class JWTAuthMiddleware:
    """WebSocket middleware: auth is handled via first message in consumer, not query string."""
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        scope['user'] = AnonymousUser()
        return await self.inner(scope, receive, send)

def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)

class UpdateLastActivityMiddleware:
    # In-memory cache: {user_id: last_update_timestamp}
    _last_updated = {}
    # Only write to DB if more than 60 seconds since last update
    THROTTLE_SECONDS = 60

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.user.is_authenticated:
            now = timezone.now()
            user_id = request.user.id
            last = self._last_updated.get(user_id)
            if last is None or (now - last).total_seconds() > self.THROTTLE_SECONDS:
                UserActivity.objects.update_or_create(
                    user=request.user,
                    defaults={'last_seen': now}
                )
                self._last_updated[user_id] = now
        return response
