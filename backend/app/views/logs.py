from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from app.models import ActionLog, Quarter
from app.serializers import ActionLogSerializer
from app.permissions import IsTeacherOrAdmin

class ActionLogViewSet(viewsets.ModelViewSet):
    """API для журнала активности (кто кому поставил минус/плюс)"""
    
    # 👇 ДОБАВИЛИ ЭТУ СТРОКУ (Она нужна Роутеру для генерации ссылок)
    queryset = ActionLog.objects.all() 
    
    serializer_class = ActionLogSerializer
    permission_classes = [IsTeacherOrAdmin]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['student', 'teacher']

    def get_queryset(self):
        # А вот здесь мы уже по-настоящему фильтруем данные для пользователя
        qs = ActionLog.objects.select_related('student', 'rule', 'teacher').all()
        # Если это обычный учитель, показываем только его историю
        if not self.request.user.is_superuser:
            return qs.filter(teacher=self.request.user)
        return qs

    def perform_create(self, serializer):
        # 1. Проверяем правило: один минус по одному правилу в день (если это нарушение)
        rule = serializer.validated_data['rule']
        student = serializer.validated_data['student']
        
        # Если это нарушение (points_impact < 0), проверяем были ли сегодня такие же
        if rule.points_impact < 0:
            today = timezone.localdate()
            already_exists = ActionLog.objects.filter(
                student=student,
                rule=rule,
                created_at__date=today
            ).exists()
            
            if already_exists:
                raise ValidationError({"detail": f"Омӯзгори дигар аллакай барои '{rule.title}' ба ин хонанда имрӯз минус мондааст."})
        
        # 2. Находим активную четверть
        active_quarter = Quarter.objects.filter(is_active=True).first()

        # 3. Автоматически подставляем текущего учителя и четверть при создании записи
        teacher = self.request.user if self.request.user.is_authenticated else None
        serializer.save(teacher=teacher, quarter=active_quarter)
