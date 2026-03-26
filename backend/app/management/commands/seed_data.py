import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from django.db import transaction

from app.models import SchoolClass, Student, Rule, ActionLog, AcademicYear, Subject, Quarter, TeacherProfile
from app.services import create_user_for_student

class Command(BaseCommand):
    help = 'Генерация красивых тестовых данных для презентации (Учителя, Классы, Ученики, Журнал)'

    @transaction.atomic
    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING('Начинаем генерацию данных...'))

        # 1. ОЧИСТКА СТАРЫХ ДАННЫХ (кроме супер-админов)
        self.stdout.write('Очистка старой базы...')
        ActionLog.objects.all().delete()
        Student.objects.all().delete()
        SchoolClass.objects.all().delete()
        Rule.objects.all().delete()
        Subject.objects.all().delete()
        Quarter.objects.all().delete()
        AcademicYear.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

        # 2. УЧЕБНЫЙ ГОД И ЧЕТВЕРТЬ
        year = AcademicYear.objects.create(year="2025-2026", is_active=True)
        Quarter.objects.create(academic_year=year, name="Чоряки 3", is_active=True)

        # 3. ПРАВИЛА СИН (Реалистичные)
        rules_data = [
            ("Опоздание на урок", 'A', -5), ("Отсутствие дневника", 'A', -5),
            ("Использование телефона на уроке", 'B', -15), ("Срыв урока / Шум", 'B', -15),
            ("Прогул без уважительной причины", 'C', -35), ("Грубость учителю", 'C', -35),
            ("Драка на территории школы", 'D', -55), ("Порча школьного имущества", 'D', -55),
            ("Активность на уроке", 'BONUS', 10), ("Помощь учителю", 'BONUS', 15),
            ("Победа на олимпиаде", 'BONUS', 50)
        ]
        rules = []
        for title, cat, impact in rules_data:
            rules.append(Rule.objects.create(title=title, category=cat, points_impact=impact))
        self.stdout.write(self.style.SUCCESS(f'Создано правил: {len(rules)}'))

        # 4. ПРЕДМЕТЫ
        subjects = [Subject.objects.create(name=name) for name in ["Алгебра", "Физика", "Забони тоҷикӣ", "Таърих"]]

        # 5. УЧИТЕЛЯ
        teachers_data = [("t.karimov", "Тимур", "Каримов"), ("m.sharipova", "Мадина", "Шарипова"), ("a.saidov", "Алишер", "Саидов")]
        teachers = []
        for username, first, last in teachers_data:
            user = User.objects.create_user(username=username, password='123', first_name=first, last_name=last, is_staff=True)
            profile = TeacherProfile.objects.create(user=user)
            profile.subjects.set(random.sample(subjects, 2))
            teachers.append(user)
        self.stdout.write(self.style.SUCCESS(f'Создано учителей: {len(teachers)} (Пароль у всех: 123)'))

        # 6. КЛАССЫ И УЧЕНИКИ
        first_names = ["Умед", "Рустам", "Фарид", "Азиз", "Ситора", "Нигина", "Шабнам", "Комрон", "Амина", "Далер", "Парвиз", "Малика"]
        last_names = ["Раҳимов", "Зокиров", "Алиев", "Саидов", "Қурбонов", "Шарипов", "Одинаев", "Сафаров"]

        classes_data = ["5А", "9Б", "11В"]
        all_students = []

        for i, class_name in enumerate(classes_data):
            school_class = SchoolClass.objects.create(name=class_name, class_teacher=teachers[i])
            
            # Создаем 10-12 учеников для каждого класса
            num_students = random.randint(10, 12)
            for _ in range(num_students):
                student = Student.objects.create(
                    first_name=random.choice(first_names),
                    last_name=random.choice(last_names),
                    school_class=school_class
                )
                create_user_for_student(student) # Генерируем аккаунты
                all_students.append(student)

        self.stdout.write(self.style.SUCCESS(f'Создано классов: {len(classes_data)}, Учеников: {len(all_students)}'))

        # 7. ЖУРНАЛ АКТИВНОСТИ (МАГИЯ ДЛЯ ГРАФИКОВ И УВЕДОМЛЕНИЙ)
        self.stdout.write('Генерация истории нарушений...')
        now = timezone.now()
        
        # Создаем 40 случайных событий за последние 3 дня
        for _ in range(40):
            student = random.choice(all_students)
            rule = random.choice(rules)
            teacher = random.choice(teachers)
            
            # Создаем запись
            log = ActionLog.objects.create(
                student=student,
                rule=rule,
                teacher=teacher,
                description="Зафиксировано системой"
            )
            
            # Искусственно меняем дату создания (от 3 дней назад до сейчас), 
            # чтобы графики были "живыми"
            random_hours_ago = random.randint(1, 72)
            fake_time = now - timedelta(hours=random_hours_ago)
            ActionLog.objects.filter(id=log.id).update(created_at=fake_time)

        # Пересчитываем баллы всем ученикам после генерации логов
        for student in all_students:
            student.recalculate_points()

        self.stdout.write(self.style.SUCCESS('🎉 Успешно! База данных заполнена красивыми фейковыми данными.'))
        self.stdout.write(self.style.WARNING('Логины учителей: t.karimov, m.sharipova, a.saidov | Пароль: 123'))