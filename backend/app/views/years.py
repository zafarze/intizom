from rest_framework import viewsets
from app.models import AcademicYear, Quarter
from app.serializers import AcademicYearSerializer, QuarterSerializer

class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer

# ДОБАВЛЯЕМ ЭТОТ КЛАСС:
class QuarterViewSet(viewsets.ModelViewSet):
    queryset = Quarter.objects.all()
    serializer_class = QuarterSerializer