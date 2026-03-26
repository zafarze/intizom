from rest_framework import viewsets, status
from rest_framework.response import Response
from django.db.models import ProtectedError
from app.models import SchoolClass
from app.serializers import SchoolClassSerializer

class SchoolClassViewSet(viewsets.ModelViewSet):
    """API для получения списка классов и их создания"""
    queryset = SchoolClass.objects.all()
    serializer_class = SchoolClassSerializer

    # Умная обработка удаления класса
    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "Нельзя удалить этот класс! В нём числятся ученики. Сначала переведите их в другой класс или удалите."},
                status=status.HTTP_400_BAD_REQUEST
            )