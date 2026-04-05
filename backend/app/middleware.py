from django.utils import timezone
from .models import UserActivity

class UpdateLastActivityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.user.is_authenticated:
            UserActivity.objects.update_or_create(
                user=request.user,
                defaults={'last_seen': timezone.now()}
            )
        return response
