from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Exists, OuterRef
from app.models import Student, ActionLog, Rule

class Command(BaseCommand):
    help = 'Автоматическое начисление +10 баллов за безупречное поведение в этом месяце'

    def handle(self, *args, **kwargs):
        now = timezone.now()
        # Определяем начало текущего месяца
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # 1. Создаем или находим правило для авто-бонуса
        rule, _ = Rule.objects.get_or_create(
            title="Интизоми намунавӣ (Бе минус дар 1 моҳ)",
            defaults={'category': 'BONUS', 'points_impact': 10}
        )

        # 2. Ищем логи с МИНУСАМИ за этот месяц
        negative_logs = ActionLog.objects.filter(
            student=OuterRef('pk'),
            rule__points_impact__lt=0,
            created_at__gte=start_of_month
        )

        # 3. Берем учеников, у которых НЕТ таких логов (Exists = False)
        good_students = Student.objects.filter(~Exists(negative_logs))

        count = 0
        for student in good_students:
            # Защита: проверяем, не давали ли мы уже этот бонус в этом месяце
            already_awarded = ActionLog.objects.filter(
                student=student, rule=rule, created_at__gte=start_of_month
            ).exists()

            if not already_awarded:
                ActionLog.objects.create(
                    student=student,
                    rule=rule,
                    description="Автоматическое начисление системой",
                    teacher=None # Системное событие
                )
                student.recalculate_points()
                count += 1

        self.stdout.write(self.style.SUCCESS(f'🎉 Бонус +10 баллов успешно получили {count} учеников!'))