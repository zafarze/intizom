from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from app.models import Student, ActionLog, Rule

class Command(BaseCommand):
    help = 'Начисляет +10 баллов ученикам, у которых не было нарушений за последние 30 дней'

    def handle(self, *args, **kwargs):
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        # Получаем правило для ежемесячного бонуса (нужно создать его в БД)
        bonus_rule, created = Rule.objects.get_or_create(
            title="Интизоми намунавӣ дар давоми як моҳ",
            category='BONUS',
            defaults={'points_impact': 10}
        )

        all_students = Student.objects.all()
        rewarded_count = 0

        for student in all_students:
            # Проверяем, были ли у него минусы (нарушения) за 30 дней
            had_violations = ActionLog.objects.filter(
                student=student, 
                rule__points_impact__lt=0, 
                created_at__gte=thirty_days_ago
            ).exists()

            if not had_violations:
                # Начисляем бонус
                ActionLog.objects.create(
                    student=student,
                    rule=bonus_rule,
                    description="Автоматический бонус за отсутствие нарушений в течение месяца"
                )
                rewarded_count += 1

        self.stdout.write(self.style.SUCCESS(f'Успешно! Бонус получили {rewarded_count} учеников.'))