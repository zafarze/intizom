from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from django.core.cache import cache
from app.models import ActionLog, Quarter, AppNotification, Rule, Student
from app.serializers import ActionLogSerializer, AppNotificationSerializer
from app.permissions import IsTeacherOrAdmin, IsSuperAdmin
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.db.models import Q
from app.fcm_utils import send_bulk_push_notification
from django.contrib.auth import get_user_model

_STATS_CACHE_KEYS = ['dashboard_stats', 'statistics_view']


class ActionLogPagination(PageNumberPagination):
    # Дефолт 50, клиент может запросить до 2000 (нужно Statistics.tsx).
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 2000


class ActionLogViewSet(viewsets.ModelViewSet):
    """API для журнала активности (кто кому поставил минус/плюс)"""

    http_method_names = ['get', 'post', 'delete', 'head', 'options']
    pagination_class = ActionLogPagination
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
        # select_related на student__school_class убирает N+1 при сериализации class_name.
        # order_by нужен для стабильной пагинации (иначе DRF предупреждает UnorderedObjectListWarning).
        qs = ActionLog.objects.select_related('student__school_class', 'rule', 'teacher').order_by('-created_at')
        user = self.request.user

        if user.is_superuser:
            return qs

        if user.is_staff:  # Учитель
            return qs.filter(Q(teacher=user) | Q(student__school_class__class_teachers=user)).distinct()

        return qs.filter(student__user=user)

    def perform_destroy(self, instance):
        user = self.request.user
        if not user.is_superuser and instance.teacher != user:
            raise ValidationError({"detail": "Шумо наметавонед баҳои мондаи дигар омӯзгорро нест кунед."})
        instance.delete()
        cache.delete_many(_STATS_CACHE_KEYS)

    @action(detail=False, methods=['post'], permission_classes=[IsTeacherOrAdmin])
    def bulk(self, request):
        """Массовое создание ActionLog по списку student_ids и одному rule_id."""
        student_ids = request.data.get('student_ids') or []
        rule_id = request.data.get('rule_id')
        description = request.data.get('description', '')

        if not isinstance(student_ids, list) or not student_ids:
            raise ValidationError({"detail": "student_ids (непустой список) обязателен"})
        if not rule_id:
            raise ValidationError({"detail": "rule_id обязателен"})

        try:
            rule = Rule.objects.get(pk=rule_id)
        except Rule.DoesNotExist:
            raise ValidationError({"detail": "Правило не найдено"})

        # Оставляем только реально существующих учеников (id-ы из чужих таблиц игнорируем)
        valid_ids = list(Student.objects.filter(id__in=student_ids).values_list('id', flat=True))

        active_quarter = Quarter.get_current_quarter()
        teacher = request.user if request.user.is_authenticated else None
        today = timezone.localdate()

        created_ids = []
        skipped_ids = []

        with transaction.atomic():
            # Для не-multiple нарушений — один раз собираем id учеников, у которых уже есть лог по этому правилу сегодня
            dup_ids = set()
            if rule.points_impact < 0 and not rule.is_multiple:
                dup_ids = set(
                    ActionLog.objects
                    .filter(student_id__in=valid_ids, rule=rule, created_at__date=today)
                    .values_list('student_id', flat=True)
                )

            for sid in valid_ids:
                if sid in dup_ids:
                    skipped_ids.append(sid)
                    continue
                log = ActionLog.objects.create(
                    student_id=sid,
                    rule=rule,
                    teacher=teacher,
                    quarter=active_quarter,
                    description=description,
                )
                created_ids.append(log.id)

        cache.delete_many(_STATS_CACHE_KEYS)
        return Response(
            {"created_count": len(created_ids), "skipped_count": len(skipped_ids), "skipped_student_ids": skipped_ids},
            status=201,
        )

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
        cache.delete_many(_STATS_CACHE_KEYS)

class AppNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """API для системных уведомлений"""
    serializer_class = AppNotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return AppNotification.objects.none()
        return AppNotification.objects.filter(Q(recipient=user) | Q(recipient__isnull=True))


class BroadcastNotificationView(APIView):
    """Admin-only: создать одно AppNotification всем (recipient=null)
    и при желании продублировать пушем тем, у кого есть FCM-токен.
    """
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        title = (request.data.get('title') or '').strip()
        message = (request.data.get('message') or '').strip()
        send_push = bool(request.data.get('send_push', True))

        if not title or not message:
            raise ValidationError({"detail": "title и message обязательны"})

        AppNotification.objects.create(title=title, message=message, recipient=None)

        pushed = 0
        if send_push:
            User = get_user_model()
            users = list(User.objects.filter(is_active=True))
            pushed = send_bulk_push_notification(users, title, message)

        return Response({"created": 1, "pushed": pushed}, status=201)
