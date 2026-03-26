from rest_framework import viewsets
from django.contrib.auth.models import User
from app.serializers import TeacherSerializer

class TeacherViewSet(viewsets.ModelViewSet):
    # Показываем только тех, кто is_staff (учителя), чтобы не выводить супер-админов
    queryset = User.objects.filter(is_staff=True, is_superuser=False)
    serializer_class = TeacherSerializer