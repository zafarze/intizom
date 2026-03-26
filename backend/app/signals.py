from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import ActionLog, Student
from .services import create_user_for_student # 👈 Импортируем наш сервис

@receiver(post_save, sender=ActionLog)
@receiver(post_delete, sender=ActionLog)
def update_student_points(sender, instance, **kwargs):
    if instance.student:
        instance.student.recalculate_points()
