from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from app.models import Rule
from app.serializers import RuleSerializer

class RuleViewSet(viewsets.ModelViewSet):
    """API для правил СИН."""
    queryset = Rule.objects.all()
    serializer_class = RuleSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['category']