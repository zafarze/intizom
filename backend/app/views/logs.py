from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from app.models import ActionLog, Quarter, AppNotification
from app.serializers import ActionLogSerializer, AppNotificationSerializer
from app.permissions import IsTeacherOrAdmin
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

class ActionLogViewSet(viewsets.ModelViewSet):
    """API для журнала активности (кто кому поставил минус/плюс)"""
    
    # 👇 ДОБАВИЛИ ЭТУ СТРОКУ (Она нужна Роутеру для генерации ссылок)
    queryset = ActionLog.objects.all() 
    
    serializer_class = ActionLogSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['student', 'teacher', 'rule__category', 'rule__points_impact']

    def get_permissions(self):
        """Ученикам можно только читать, создавать могут только учителя/админы"""
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsTeacherOrAdmin()]

    def get_queryset(self):
        # А вот здесь мы уже по-настоящему фильтруем данные для пользователя
        qs = ActionLog.objects.select_related('student', 'rule', 'teacher').all()
        user = self.request.user
        
        if user.is_superuser:
            return qs
            
        if user.is_staff: # Учитель
            # Показывать логи, где он сам поставил оценки, ИЛИ логи учеников его класса (где он классный руководитель)
            return qs.filter(Q(teacher=user) | Q(student__school_class__class_teachers=user)).distinct()
            
        # Ученик: видит только свои логи
        return qs.filter(student__user=user)

    def perform_create(self, serializer):
        # 1. Проверяем правило: один минус по одному правилу в день (если это нарушение)
        rule = serializer.validated_data['rule']
        student = serializer.validated_data['student']
        
        # Если это нарушение (points_impact < 0) и оно не многократное (is_multiple=False), проверяем были ли сегодня такие же
        if rule.points_impact < 0 and not rule.is_multiple:
            today = timezone.localdate()
            already_exists = ActionLog.objects.filter(
                student=student,
                rule=rule,
                created_at__date=today
            ).exists()
            
            if already_exists:
                raise ValidationError({"detail": f"Омӯзгори дигар аллакай барои '{rule.title}' ба ин хонанда имрӯз минус мондааст."})
        
        # 2. Находим активную четверть (умный выбор по дате)
        active_quarter = Quarter.get_current_quarter()

        # 3. Автоматически подставляем текущего учителя и четверть при создании записи
        teacher = self.request.user if self.request.user.is_authenticated else None
        serializer.save(teacher=teacher, quarter=active_quarter)

class AppNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """API для системных уведомлений"""
    serializer_class = AppNotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return AppNotification.objects.none()
        return AppNotification.objects.filter(Q(recipient=user) | Q(recipient__isnull=True))
