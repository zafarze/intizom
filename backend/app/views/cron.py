import os
from io import StringIO

from django.core.management import call_command
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView


class SchedulerSecretPermission:
    """Allows the request only if X-Scheduler-Secret header matches the env secret."""

    def has_permission(self, request, view):
        expected = os.environ.get('SCHEDULER_SECRET')
        if not expected:
            return False
        provided = request.headers.get('X-Scheduler-Secret')
        return bool(provided) and provided == expected

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class RunMonthlyBonusView(APIView):
    """
    Triggered monthly by Cloud Scheduler to award +10 bonuses for the previous
    calendar month. Protected by a shared secret header ``X-Scheduler-Secret``
    matched against the ``SCHEDULER_SECRET`` env var.
    """
    permission_classes = [AllowAny]  # gate is the secret header
    authentication_classes = []

    def post(self, request):
        if not SchedulerSecretPermission().has_permission(request, self):
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        buf = StringIO()
        call_command('monthly_bonus', stdout=buf)
        return Response({'detail': 'ok', 'output': buf.getvalue()})
