from django.core.management.base import BaseCommand
from app.models import Student, Quarter, AcademicYear, QuarterResult
import random

class Command(BaseCommand):
    help = 'Фейковые данные за 3 четверти для презентации'

    def handle(self, *args, **kwargs):
        QuarterResult.objects.all().delete() # Очищаем старые
        
        year = AcademicYear.objects.first()
        q1, _ = Quarter.objects.get_or_create(academic_year=year, name="Чоряки 1", is_active=False)
        q2, _ = Quarter.objects.get_or_create(academic_year=year, name="Чоряки 2", is_active=False)
        q3, _ = Quarter.objects.get_or_create(academic_year=year, name="Чоряки 3", is_active=True)

        students = list(Student.objects.all())
        # Выбираем 4 случайных "счастливчиков"
        lucky_students = random.sample(students, min(4, len(students)))

        for student in lucky_students:
            QuarterResult.objects.create(student=student, quarter=q1, final_points=random.randint(95, 110), is_exemplary=True)
            QuarterResult.objects.create(student=student, quarter=q2, final_points=random.randint(90, 105), is_exemplary=True)
            QuarterResult.objects.create(student=student, quarter=q3, final_points=random.randint(105, 120), is_exemplary=True)

        self.stdout.write(self.style.SUCCESS(f'Сгенерированы итоги 3-х четвертей для {len(lucky_students)} учеников. У них теперь >300 баллов!'))