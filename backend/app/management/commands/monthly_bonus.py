from datetime import date, timedelta
from calendar import monthrange

from django.core.management.base import BaseCommand
from django.utils import timezone

from app.models import Student, ActionLog, Rule

BONUS_TITLE = "Интизоми намунавӣ дар давоми як моҳ"
BONUS_POINTS = 10


def previous_month_range(today: date):
    """Returns (first_day, last_day) of the calendar month before ``today``."""
    year = today.year
    month = today.month - 1
    if month == 0:
        month = 12
        year -= 1
    last_day = monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


class Command(BaseCommand):
    help = (
        'Начисляет +10 баллов ученикам, у которых за ПРЕДЫДУЩИЙ календарный '
        'месяц не было ни одного нарушения (минусового ActionLog).'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--year', type=int, default=None,
            help='Год календарного месяца. По умолчанию — прошлый месяц от сегодняшней даты.'
        )
        parser.add_argument(
            '--month', type=int, default=None,
            help='Номер месяца 1-12. Если указан --month, указывай и --year.'
        )

    def handle(self, *args, **options):
        today = timezone.localdate()
        if options['year'] and options['month']:
            year, month = options['year'], options['month']
            last_day = monthrange(year, month)[1]
            start = date(year, month, 1)
            end = date(year, month, last_day)
        else:
            start, end = previous_month_range(today)

        bonus_rule, _ = Rule.objects.get_or_create(
            title=BONUS_TITLE,
            defaults={'category': 'BONUS', 'points_impact': BONUS_POINTS},
        )

        # Не начислять повторно, если команду случайно вызвали дважды за месяц.
        dedup_window_end = end + timedelta(days=31)
        already_rewarded_ids = set(
            ActionLog.objects
            .filter(
                rule=bonus_rule,
                created_at__date__gte=start,
                created_at__date__lte=dedup_window_end,
            )
            .values_list('student_id', flat=True)
        )

        rewarded_count = 0
        for student in Student.objects.all():
            if student.id in already_rewarded_ids:
                continue
            had_violations = ActionLog.objects.filter(
                student=student,
                rule__points_impact__lt=0,
                created_at__date__gte=start,
                created_at__date__lte=end,
            ).exists()
            if had_violations:
                continue
            ActionLog.objects.create(
                student=student,
                rule=bonus_rule,
                description=f"Автоматический бонус за {start.strftime('%m.%Y')} (без нарушений)",
            )
            rewarded_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'Месяц {start.isoformat()} — {end.isoformat()}. Бонус получили {rewarded_count} учеников.'
        ))
