from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import ActionLog, Student, Rule, AppNotification
from .services import create_user_for_student # 👈 Импортируем наш сервис

@receiver(post_save, sender=ActionLog)
@receiver(post_delete, sender=ActionLog)
def update_student_points(sender, instance, **kwargs):
    if instance.student:
        instance.student.recalculate_points()

@receiver(post_save, sender=Rule)
def notify_new_rule(sender, instance, created, **kwargs):
    if created:
        AppNotification.objects.create(
            title="Новое правило!",
            message=f"Добавлено новое правило: {instance.title} ({'+' if instance.points_impact > 0 else ''}{instance.points_impact} баллов).",
            recipient=None # Всем
        )

@receiver(post_save, sender=Student)
def notify_new_student(sender, instance, created, **kwargs):
    if created and instance.school_class:
        class_teachers = instance.school_class.class_teachers.all()
        for teacher in class_teachers:
            AppNotification.objects.create(
                title="Новый ученик в вашем классе",
                message=f"Новый ученик {instance.first_name} {instance.last_name} добавлен в ваш класс ({instance.school_class.name}).",
                recipient=teacher
            )
