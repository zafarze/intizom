from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from app.models import AcademicYear, Student

# 👇 ИМПОРТИРУЕМ НАШ КАСТОМНЫЙ ПЕРМИШЕН
from app.permissions import IsSuperAdmin 

class SetActiveYearView(APIView):
    """Смена текущего учебного года"""
    permission_classes = [IsSuperAdmin] # 👈 ЗАЩИТИЛИ (Только для Директора/Завуча)

    def post(self, request, year_id):
        try:
            year = AcademicYear.objects.get(id=year_id)
        except AcademicYear.DoesNotExist:
            return Response({"detail": "Учебный год не найден."}, status=status.HTTP_404_NOT_FOUND)
        
        with transaction.atomic():
            # Выключаем ВСЕ годы
            AcademicYear.objects.exclude(pk=year.pk).update(is_active=False)
            # Включаем только выбранный
            year.is_active = True
            year.save(update_fields=['is_active'])
            
        return Response({'detail': f'Учебный год {year.year} теперь активен!'})


class ResetPointsView(APIView):
    """Опасная зона: Сброс баллов всех учеников"""
    permission_classes = [IsSuperAdmin] # 👈 ЗАЩИТИЛИ (Только для Директора/Завуча)

    def post(self, request):
        # Одним SQL-запросом обновляем всю базу
        updated_count = Student.objects.all().update(points=100)
        
        return Response({
            "detail": f"Успешно! Баллы сброшены до 100 у {updated_count} учеников."
        }, status=status.HTTP_200_OK)