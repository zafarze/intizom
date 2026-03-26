from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Оставляем только обновление токена (refresh)
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # --- ПОДКЛЮЧАЕМ НАШИ API ---
    # Запрос /api/login/ теперь беспрепятственно полетит сюда:
    path('api/', include('app.urls')),
]