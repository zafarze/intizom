from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from app.models import ActionLog
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
        # Автоматически подставляем текущего учителя при создании записи
        teacher = self.request.user if self.request.user.is_authenticated else None
        serializer.save(teacher=teacher)