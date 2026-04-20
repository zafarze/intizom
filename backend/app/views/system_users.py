from django.contrib.auth.models import User, Group
from django.db import transaction
from django.db.models import Q
from rest_framework import serializers, viewsets
from rest_framework.permissions import BasePermission


SECRETARY_GROUP = 'secretary'


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


def _role_of(user: User) -> str:
    if user.is_superuser:
        return 'admin'
    if user.groups.filter(name=SECRETARY_GROUP).exists():
        return 'secretary'
    return 'user'


class RoleField(serializers.ChoiceField):
    """Reads the role from the User instance (not a real model field)."""
    def get_attribute(self, instance):
        return _role_of(instance)


class SystemUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    role = RoleField(choices=['admin', 'secretary'])

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'password', 'role']
        extra_kwargs = {
            'username': {'required': True},
        }

    def _apply_role(self, user: User, role: str):
        if role == 'admin':
            user.is_superuser = True
            user.is_staff = True
            user.groups.remove(*user.groups.filter(name=SECRETARY_GROUP))
        elif role == 'secretary':
            user.is_superuser = False
            user.is_staff = False
            group, _ = Group.objects.get_or_create(name=SECRETARY_GROUP)
            user.groups.add(group)
        user.save()

    @transaction.atomic
    def create(self, validated_data):
        role = validated_data.pop('role')
        password = validated_data.pop('password', None) or '123456'
        user = User.objects.create_user(**validated_data, password=password)
        self._apply_role(user, role)
        return user

    @transaction.atomic
    def update(self, instance, validated_data):
        role = validated_data.pop('role', None)
        password = validated_data.pop('password', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()

        if role:
            self._apply_role(instance, role)
        return instance


class SystemUserViewSet(viewsets.ModelViewSet):
    """
    CRUD for system users (admins and secretaries).
    Excludes students and regular teachers (those have their own tabs).
    """
    serializer_class = SystemUserSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        return (
            User.objects
            .filter(student_profile__isnull=True)
            .filter(Q(is_superuser=True) | Q(groups__name=SECRETARY_GROUP))
            .distinct()
            .order_by('-is_superuser', 'last_name', 'first_name')
        )

    def perform_destroy(self, instance):
        if instance == self.request.user:
            raise serializers.ValidationError({'detail': 'You cannot delete your own account.'})
        instance.delete()
