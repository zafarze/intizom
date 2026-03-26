from rest_framework import viewsets
from app.models import Subject
from app.serializers import SubjectSerializer

class SubjectViewSet(viewsets.ModelViewSet):
    """API для предметов"""
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer