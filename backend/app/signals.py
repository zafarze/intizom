from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import ActionLog, Student, Rule, AppNotification, User
from .services import create_user_for_student # 👈 Импортируем наш сервис
from .fcm_utils import send_push_notification, send_bulk_push_notification

@receiver(post_save, sender=ActionLog)
def notify_action_log(sender, instance, created, **kwargs):
    if created and instance.student:
        # Обновляем баллы
        instance.student.recalculate_points()
        
        sign = '+' if instance.rule.points_impact > 0 else ''
        points_str = f"{sign}{instance.rule.points_impact} баллов: {instance.rule.title}"
        
        # 1. Отправляем Push ученику
        if instance.student.user:
            send_push_notification(
                user=instance.student.user,
                title="Изменение баллов",
                body=f"Вам начислено {points_str}"
            )
            
        # 2. Отправляем Push классным руководителям (оптимизировано, один вызов)
        if instance.student.school_class:
            class_teachers_to_notify = [
                ct for ct in instance.student.school_class.class_teachers.all() 
                if ct != instance.teacher
            ]
            if class_teachers_to_notify:
                send_bulk_push_notification(
                    users=class_teachers_to_notify,
                    title=f"Баллы ученика: {instance.student.first_name} {instance.student.last_name}",
                    body=points_str
                )
        
        # 3. Отправляем Push всем админам (оптимизировано, один вызов)
        admins_to_notify = [
            admin for admin in User.objects.filter(is_superuser=True)
            if admin != instance.teacher
        ]
        if admins_to_notify:
            send_bulk_push_notification(
                users=admins_to_notify,
                title=f"Действие: {instance.student.first_name} {instance.student.last_name}",
                body=f"{instance.teacher.username if instance.teacher else 'Система'} поставил(а) {instance.rule.points_impact} баллов."
            )

@receiver(post_delete, sender=ActionLog)
def delete_action_log(sender, instance, **kwargs):
    if instance.student:
        instance.student.recalculate_points()

@receiver(post_save, sender=AppNotification)
def notify_app_notification(sender, instance, created, **kwargs):
    if created:
        if instance.recipient:
            send_push_notification(
                user=instance.recipient,
                title=instance.title,
                body=instance.message
            )
        else:
            # Всем пользователям (осторожно с массовыми рассылками)
            pass

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
