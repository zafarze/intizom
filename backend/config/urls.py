from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Оставляем только обновление токена (refresh)
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/jwt/refresh/', TokenRefreshView.as_view(), name='token_refresh_legacy'),

    # --- ПОДКЛЮЧАЕМ НАШИ API ---
    # Запрос /api/login/ теперь беспрепятственно полетит сюда:
    path('api/', include('app.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)