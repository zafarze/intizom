from rest_framework import viewsets, permissions
from ..models import BellSchedule
from ..serializers import BellScheduleSerializer


class BellScheduleViewSet(viewsets.ModelViewSet):
    queryset = BellSchedule.objects.all()
    serializer_class = BellScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]
