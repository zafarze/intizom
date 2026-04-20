from datetime import datetime, timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from app.models import AttendanceRecord, SchoolClass, Student, Quarter, Rule, ActionLog


ABSENCE_RULE_TITLE = "Бесабаб иштирок накардан дар дарс (дар давоми рӯз)."
ABSENCE_RULE_POINTS = -15


def get_or_create_absence_rule():
    rule, created = Rule.objects.get_or_create(
        title=ABSENCE_RULE_TITLE,
        defaults={
            'category': Rule.Category.GROUP_B,
            'points_impact': ABSENCE_RULE_POINTS,
            'is_multiple': True,
        },
    )
    return rule


class IsSecretaryOrAdmin(BasePermission):
    """Admin (superuser) or users in Django group 'secretary'."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return user.groups.filter(name='secretary').exists()


def _parse_date(raw):
    if not raw:
        return timezone.localdate()
    try:
        return datetime.strptime(raw, '%Y-%m-%d').date()
    except (TypeError, ValueError):
        return timezone.localdate()


class SecretaryClassesView(APIView):
    """
    Returns all classes with their students and attendance status for a given date.
    GET /secretary/classes/?date=YYYY-MM-DD
    """
    permission_classes = [IsSecretaryOrAdmin]

    def get(self, request):
        target_date = _parse_date(request.query_params.get('date'))

        classes = SchoolClass.objects.all().prefetch_related('students').order_by('name')

        absent_ids = set(
            AttendanceRecord.objects
            .filter(date=target_date, is_absent=True)
            .values_list('student_id', flat=True)
        )

        data = []
        for school_class in classes:
            students_data = []
            for s in school_class.students.all().order_by('last_name', 'first_name'):
                students_data.append({
                    'id': s.id,
                    'first_name': s.first_name,
                    'last_name': s.last_name,
                    'is_absent': s.id in absent_ids,
                })
            data.append({
                'class_id': school_class.id,
                'class_name': school_class.name,
                'students': students_data,
                'absent_count': sum(1 for st in students_data if st['is_absent']),
                'total_count': len(students_data),
            })

        return Response({
            'date': target_date.isoformat(),
            'classes': data,
        })


class AdminAttendanceStatsView(APIView):
    """
    Aggregated absence counts for various time ranges.
    Admin-only. Counts distinct AttendanceRecord rows with is_absent=True.
    GET /secretary/stats/
    """

    class IsAdmin(BasePermission):
        def has_permission(self, request, view):
            user = request.user
            return bool(user and user.is_authenticated and user.is_superuser)

    permission_classes = [IsAdmin]

    def get(self, request):
        today = timezone.localdate()

        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)
        year_start = today.replace(month=1, day=1)

        current_quarter = Quarter.get_current_quarter()
        if current_quarter and current_quarter.start_date and current_quarter.end_date:
            q_start = current_quarter.start_date
            q_end = min(current_quarter.end_date, today)
        else:
            q_start = q_end = None

        qs = AttendanceRecord.objects.filter(is_absent=True)

        def count_range(start, end):
            if not start or not end:
                return 0
            return qs.filter(date__gte=start, date__lte=end).count()

        return Response({
            'today': qs.filter(date=today).count(),
            'week': count_range(week_start, today),
            'month': count_range(month_start, today),
            'quarter': count_range(q_start, q_end),
            'year': count_range(year_start, today),
            'quarter_name': current_quarter.name if current_quarter else None,
        })


class AttendanceToggleView(APIView):
    """
    Toggles a student's absence for a given date.
    POST /secretary/attendance/toggle/  {student_id, date?}
    """
    permission_classes = [IsSecretaryOrAdmin]

    def post(self, request):
        student_id = request.data.get('student_id')
        if not student_id:
            return Response({'detail': 'student_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            student = Student.objects.get(pk=student_id)
        except Student.DoesNotExist:
            return Response({'detail': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)

        target_date = _parse_date(request.data.get('date'))

        record = AttendanceRecord.objects.filter(student=student, date=target_date).first()
        if record and record.is_absent:
            # Снимаем отметку: удаляем связанный ActionLog (сигналы пересчитают баллы)
            linked_log = record.action_log
            record.delete()
            if linked_log:
                linked_log.delete()
            is_absent = False
        else:
            rule = get_or_create_absence_rule()
            active_quarter = Quarter.get_current_quarter()
            log = ActionLog.objects.create(
                student=student,
                rule=rule,
                teacher=request.user,
                quarter=active_quarter,
                description=f"Автоматически: отмечен отсутствующим {target_date.isoformat()}",
            )
            AttendanceRecord.objects.update_or_create(
                student=student,
                date=target_date,
                defaults={
                    'is_absent': True,
                    'marked_by': request.user,
                    'action_log': log,
                },
            )
            is_absent = True

        return Response({
            'student_id': student.id,
            'date': target_date.isoformat(),
            'is_absent': is_absent,
        })
