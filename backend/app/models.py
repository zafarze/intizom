from django.db import models
from django.contrib.auth.models import User
from django.db.models import Sum

# ==========================================
# 0. УЧЕБНЫЙ ГОД И ЧЕТВЕРТИ
# ==========================================
class AcademicYear(models.Model):
    year = models.CharField(max_length=20, unique=True, verbose_name="Соли таҳсил (Учебный год)")
    is_active = models.BooleanField(default=False, verbose_name="Фаъол (Активный)")

    class Meta:
        verbose_name = "Соли таҳсил"
        verbose_name_plural = "Солҳои таҳсил"
        ordering = ['-year']

    def __str__(self):
        return self.year

# НОВАЯ МОДЕЛЬ: ЧЕТВЕРТЬ
class Quarter(models.Model):
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name="quarters", verbose_name="Соли таҳсил")
    name = models.CharField(max_length=50, verbose_name="Чоряк (Четверть)") # Например: "1-ум чоряк"
    is_active = models.BooleanField(default=False, verbose_name="Фаъол (Активный)")

    class Meta:
        verbose_name = "Чоряк"
        verbose_name_plural = "Чорякҳо"

    def __str__(self):
        return f"{self.name} ({self.academic_year.year})"
    
# ==========================================
# 1. МОДЕЛЬ КЛАССА
# ==========================================
class SchoolClass(models.Model):
    name = models.CharField(max_length=10, unique=True, verbose_name="Номи синф (Название класса)")
    class_teacher = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, 
        related_name="led_classes", verbose_name="Роҳбари синф"
    )

    class Meta:
        verbose_name = "Синф"
        verbose_name_plural = "Синфҳо"
        ordering = ['name']

    def __str__(self):
        return self.name

# ==========================================
# 2. МОДЕЛЬ УЧЕНИКА И АРХИВ БАЛЛОВ
# ==========================================
class Student(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, null=True, blank=True, 
        related_name="student_profile", verbose_name="Аккаунт"
    )
    first_name = models.CharField(max_length=100, verbose_name="Ном (Имя)")
    last_name = models.CharField(max_length=100, verbose_name="Насаб (Фамилия)")
    
    school_class = models.ForeignKey(
        SchoolClass, 
        on_delete=models.PROTECT, 
        null=True, 
        blank=True, 
        related_name="students", 
        verbose_name="Синф"
    )
    
    # Лимит в 100 убран, теперь баллы могут расти!
    points = models.IntegerField(default=100, verbose_name="Холҳо (Баллы)") 
    carryover_bonus = models.IntegerField(default=0, verbose_name="Бонуси гузаронидашуда")

    class Meta:
        verbose_name = "Хонанда"
        verbose_name_plural = "Хонандагон"
        ordering = ['school_class', 'last_name']

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.school_class.name if self.school_class else 'Синф нест'})"

    @property
    def status_info(self):
        # ТОЧНЫЕ СТАТУСЫ ИЗ ДОКУМЕНТА СИН
        if self.points >= 100:
            return {"level": "excellent", "text": "Намунавӣ (100+)", "responsible": "Директор"}
        elif self.points >= 81:
            return {"level": "good", "text": "Хуб (Хорошо)", "responsible": "Роҳбари синф"}
        elif self.points >= 70:
            return {"level": "warning", "text": "Огоҳии шифоҳӣ", "responsible": "Муовини интизом"}
        elif self.points >= 50:
            return {"level": "danger", "text": "Даъвати волидайн", "responsible": "Муовини интизом ва роҳбари синф"}
        elif self.points >= 25:
            return {"level": "critical", "text": "Ҷазои меҳнатӣ", "responsible": "Комиссияи интизом"}
        else:
            return {"level": "fatal", "text": "Шӯрои педагогӣ (Хориҷ)", "responsible": "Шӯрои педагогӣ"}

    def recalculate_points(self):
        """
        Метод-источник истины. Считает баллы по активной четверти.
        Вызывается сигналами при любом изменении ActionLog.
        """
        active_quarter = Quarter.objects.filter(is_active=True).first()
        if active_quarter:
            impact = self.actions.filter(quarter=active_quarter).aggregate(total=Sum('rule__points_impact'))['total'] or 0
        else:
            impact = 0
            
        self.points = 100 + self.carryover_bonus + impact
        self.save(update_fields=['points'])

# НОВАЯ МОДЕЛЬ: АРХИВ БАЛЛОВ ЗА ЧЕТВЕРТЬ
class QuarterResult(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="quarter_results", verbose_name="Хонанда")
    quarter = models.ForeignKey(Quarter, on_delete=models.CASCADE, verbose_name="Чоряк")
    final_points = models.IntegerField(verbose_name="Холҳои ҷамъбастӣ")
    is_exemplary = models.BooleanField(default=False, verbose_name="Намунавӣ буд?") # 90-100+ баллов

    class Meta:
        verbose_name = "Натиҷаи чоряк"
        verbose_name_plural = "Натиҷаҳои чоряк"
        unique_together = ('student', 'quarter')

# ==========================================
# 3. МОДЕЛЬ ПРАВИЛ (СИН)
# ==========================================
class Rule(models.Model):
    class Category(models.TextChoices):
        GROUP_A = 'A', 'Гурӯҳи А: Кӯчак (-5)'     
        GROUP_B = 'B', 'Гурӯҳи Б: Миёна (-15)'    
        GROUP_C = 'C', 'Гурӯҳи В: Вазнин (-35)'   
        GROUP_D = 'D', 'Гурӯҳи Г: Хеле вазнин (-55)' 
        BONUS = 'BONUS', 'Ҳавасмандкунӣ (Бонус)'  

    title = models.CharField(max_length=255, verbose_name="Қоидавайронкунӣ / Амали наҷиб")
    category = models.CharField(max_length=10, choices=Category.choices, verbose_name="Гурӯҳ")
    points_impact = models.IntegerField(verbose_name="Минус ё Плюс хол", help_text="Минус барои вайронкунӣ, Плюс барои бонус")
    is_multiple = models.BooleanField(default=False, verbose_name="Многократное (Multiple)", help_text="Можно ли применять это правило несколько раз в день")

    class Meta:
        verbose_name = "Қоида"
        verbose_name_plural = "Қоидаҳо"

    def __str__(self):
        impact_str = f"+{self.points_impact}" if self.points_impact > 0 else f"{self.points_impact}"
        return f"[{self.get_category_display()}] {self.title} ({impact_str})"


# ==========================================
# 4. ЖУРНАЛ АКТИВНОСТИ (ActionLog)
# ==========================================
class ActionLog(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='actions', verbose_name="Хонанда")
    rule = models.ForeignKey(Rule, on_delete=models.RESTRICT, verbose_name="Қоида")
    teacher = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='recorded_actions', verbose_name="Омӯзгор")
    quarter = models.ForeignKey(Quarter, on_delete=models.SET_NULL, null=True, blank=True, related_name='actions', verbose_name="Чоряк")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Сана (Дата)")
    description = models.TextField(blank=True, null=True, verbose_name="Шарҳ (Комментарий)")

    class Meta:
        verbose_name = "Сабти амал"
        verbose_name_plural = "Журнали интизом"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student.last_name} | {self.rule.title} | {self.created_at.strftime('%d.%m.%Y')}"
                
# ==========================================
# 5. ПРОФИЛЬ УЧИТЕЛЯ И ПРЕДМЕТЫ
# ==========================================
class Subject(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="Номи фан (Предмет)")

    class Meta:
        verbose_name = "Фан"
        verbose_name_plural = "Фанҳо"
        ordering = ['name']

    def __str__(self):
        return self.name
    
class TeacherProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='teacher_profile')
    subjects = models.ManyToManyField(Subject, related_name='teachers', blank=True, verbose_name="Предметы")

    def __str__(self):
        return f"Профиль: {self.user.username}"


# ==========================================
# 6. СИСТЕМНЫЕ УВЕДОМЛЕНИЯ (AppNotification)
# ==========================================
class AppNotification(models.Model):
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='app_notifications', null=True, blank=True, verbose_name="Получатель (если пусто - то всем)")
    title = models.CharField(max_length=255, verbose_name="Заголовок")
    message = models.TextField(verbose_name="Сообщение")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")

    class Meta:
        verbose_name = "Уведомление"
        verbose_name_plural = "Уведомления"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} -> {self.recipient.username if self.recipient else 'Всем'}"

# ==========================================
# 7. РАСПИСАНИЕ ЗВОНКОВ (Time Table)
# ==========================================
class BellSchedule(models.Model):
    lesson_number = models.PositiveIntegerField(unique=True, verbose_name="Номер урока")
    start_time = models.TimeField(verbose_name="Начало урока")
    end_time = models.TimeField(verbose_name="Конец урока")

    class Meta:
        verbose_name = "Звонок"
        verbose_name_plural = "Расписание звонков"
        ordering = ['lesson_number']

    def __str__(self):
        return f"Урок {self.lesson_number}: {self.start_time.strftime('%H:%M')} - {self.end_time.strftime('%H:%M')}"