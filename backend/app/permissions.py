from rest_framework import permissions

class IsSuperAdmin(permissions.BasePermission):
    """
    Доступ ТОЛЬКО для Директора / Завуча (Главного администратора).
    Проверяет флаг is_superuser=True.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)

class IsTeacher(permissions.BasePermission):
    """
    Доступ ТОЛЬКО для Учителей.
    Проверяет, что пользователь - персонал (is_staff=True), но НЕ суперюзер.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff and not request.user.is_superuser)

class IsTeacherOrAdmin(permissions.BasePermission):
    """
    Доступ для персонала школы (Учителя + Админы).
    Ученикам (у которых is_staff=False) сюда нельзя.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser))