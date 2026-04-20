from datetime import datetime, timedelta

from django.utils import timezone
from rest_framework import status as drf_status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from app.models import AttendanceRecord, SchoolClass, Student, Quarter, Rule, ActionLog, BellSchedule


ABSENCE_RULE_TITLE = "Бесабаб иштирок накардан дар дарс (дар давоми рӯз)."
ABSENCE_RULE_POINTS = -15

LATE_FIRST_RULE_TITLE = "Дер омадан ба дарс (1-ум соат)"
LATE_FIRST_RULE_POINTS = -5

LATE_AFTER_RULE_TITLE = "Опоздание на урок после первого урока (5 баллов * 2)"
LATE_AFTER_RULE_POINTS = -10


def _get_or_create_rule(title, points, category=Rule.Category.GROUP_A):
    rule, _ = Rule.objects.get_or_create(
        title=title,
        defaults={'category': category, 'points_impact': points, 'is_multiple': True},
    )
    return rule


def get_absence_rule():
    return _get_or_create_rule(ABSENCE_RULE_TITLE, ABSENCE_RULE_POINTS, Rule.Category.GROUP_B)


def get_late_rule_for(target_date):
    """Picks the late-arrival rule based on BellSchedule of lesson 1.

    If target_date == today and local time is at/before end of lesson 1 → LATE_FIRST (-5).
    Otherwise → LATE_AFTER (-10). Same default for past/future dates (conservative).
    """
    today = timezone.localdate()
    if target_date == today:
        lesson1 = BellSchedule.objects.filter(lesson_number=1).first()
        if lesson1:
            now_t = timezone.localtime().time()
            if now_t <= lesson1.end_time:
                return _get_or_create_rule(LATE_FIRST_RULE_TITLE, LATE_FIRST_RULE_POINTS)
    return _get_or_create_rule(LATE_AFTER_RULE_TITLE, LATE_AFTER_RULE_POINTS)


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

        records = {
            r.student_id: r
            for r in AttendanceRecord.objects.filter(date=target_date)
        }

        data = []
        for school_class in classes:
            students_data = []
            absent_count = 0
            for s in school_class.students.all().order_by('last_name', 'first_name'):
                rec = records.get(s.id)
                st = rec.status if rec else 'PRESENT'
                students_data.append({
                    'id': s.id,
                    'first_name': s.first_name,
                    'last_name': s.last_name,
                    'status': st,
                    'late_minutes': rec.late_minutes if rec else None,
                    'is_absent': bool(rec and rec.is_absent),
                })
                if rec and rec.is_absent:
                    absent_count += 1
            data.append({
                'class_id': school_class.id,
                'class_name': school_class.name,
                'students': students_data,
                'absent_count': absent_count,
                'total_count': len(students_data),
            })

        return Response({
            'date': target_date.isoformat(),
            'classes': data,
        })


class AdminAttendanceStatsView(APIView):
    """
    Aggregated absence counts for various time ranges.
    Admin-only. Counts only unexcused absences (status=ABSENT).
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


ALLOWED_STATUSES = {'PRESENT', 'ABSENT', 'EXCUSED', 'LATE', 'SICK'}


class AttendanceToggleView(APIView):
    """
    Sets a student's attendance for a given date.

    POST /secretary/attendance/toggle/
      body: { student_id, date?, status?, late_minutes? }

    Backward-compat: if `status` is omitted, toggles between ABSENT and PRESENT
    (short-tap behaviour on the client).

    Status semantics:
      - PRESENT: deletes the record and its linked ActionLog (if any).
      - ABSENT: -15, rule "Бесабаб иштирок накардан дар дарс".
      - LATE: rule auto-picked by BellSchedule of lesson 1
              (-5 if within first lesson, else -10). `late_minutes` stored.
      - EXCUSED / SICK: no ActionLog, no points impact.
    """
    permission_classes = [IsSecretaryOrAdmin]

    def post(self, request):
        student_id = request.data.get('student_id')
        if not student_id:
            return Response({'detail': 'student_id is required'}, status=drf_status.HTTP_400_BAD_REQUEST)

        try:
            student = Student.objects.get(pk=student_id)
        except Student.DoesNotExist:
            return Response({'detail': 'Student not found'}, status=drf_status.HTTP_404_NOT_FOUND)

        target_date = _parse_date(request.data.get('date'))
        record = AttendanceRecord.objects.filter(student=student, date=target_date).first()

        raw_status = request.data.get('status')
        if raw_status is None:
            new_status = 'PRESENT' if (record and record.is_absent) else 'ABSENT'
        else:
            new_status = str(raw_status).upper()
            if new_status not in ALLOWED_STATUSES:
                return Response({'detail': 'invalid status'}, status=drf_status.HTTP_400_BAD_REQUEST)

        raw_minutes = request.data.get('late_minutes')
        late_minutes = None
        if raw_minutes is not None and raw_minutes != '':
            try:
                late_minutes = max(0, int(raw_minutes))
            except (TypeError, ValueError):
                late_minutes = None

        # 1) drop existing log if any — a clean slate makes the transition trivial
        if record and record.action_log_id:
            record.action_log.delete()
            record.action_log = None

        # 2) PRESENT → remove the record entirely
        if new_status == 'PRESENT':
            if record:
                record.delete()
            return Response({
                'student_id': student.id,
                'date': target_date.isoformat(),
                'status': 'PRESENT',
                'is_absent': False,
                'late_minutes': None,
            })

        # 3) For statuses with points, create a fresh ActionLog
        rule = None
        description = None
        if new_status == 'ABSENT':
            rule = get_absence_rule()
            description = f"Автоматически: отмечен отсутствующим {target_date.isoformat()}"
        elif new_status == 'LATE':
            rule = get_late_rule_for(target_date)
            mins_txt = f" ({late_minutes} мин)" if late_minutes else ""
            description = f"Автоматически: опоздал{mins_txt} {target_date.isoformat()}"

        log = None
        if rule is not None:
            active_quarter = Quarter.get_current_quarter()
            log = ActionLog.objects.create(
                student=student,
                rule=rule,
                teacher=request.user,
                quarter=active_quarter,
                description=description or "",
            )

        record, _ = AttendanceRecord.objects.update_or_create(
            student=student,
            date=target_date,
            defaults={
                'status': new_status,
                'late_minutes': late_minutes if new_status == 'LATE' else None,
                'marked_by': request.user,
                'action_log': log,
            },
        )

        return Response({
            'student_id': student.id,
            'date': target_date.isoformat(),
            'status': record.status,
            'is_absent': record.is_absent,
            'late_minutes': record.late_minutes,
        })
