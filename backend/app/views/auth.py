# app/views/auth.py
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # 1. Получаем стандартный ответ (access, refresh)
        data = super().validate(attrs)
        
        # 2. Берем пользователя, который только что залогинился
        user = self.user
        
        # 3. Определяем его роль на основе структуры БД
        if user.is_superuser:
            role = 'admin'
        elif hasattr(user, 'student_profile'):
            role = 'student'
        elif user.is_staff:
            role = 'teacher'
        else:
            role = 'user' # Если кто-то без роли зашел

        # 4. Добавляем данные пользователя в ответ
        data['user'] = {
            'id': user.id,
            'first_name': getattr(user, 'first_name', ''),
            'last_name': getattr(user, 'last_name', ''),
            'username': user.username,
            'email': getattr(user, 'email', ''),
            'role': role
        }
        
        return data

from rest_framework.throttling import ScopedRateThrottle

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'
