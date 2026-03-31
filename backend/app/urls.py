from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Импортируем все твои ViewSet-ы и наши новые APIView
from .views import (
    SchoolClassViewSet, 
    StudentViewSet, 
    RuleViewSet, 
    ActionLogViewSet, 
    AppNotificationViewSet,
    AcademicYearViewSet, 
    TeacherViewSet, 
    SubjectViewSet, 
    QuarterViewSet,
    BellScheduleViewSet,
    DashboardStatsView,
    StatisticsView,
    MonitoringView,
    SetActiveYearView,  
    ResetPointsView,
    CustomTokenObtainPairView
)

router = DefaultRouter()
router.register(r'classes', SchoolClassViewSet)
router.register(r'students', StudentViewSet)
router.register(r'rules', RuleViewSet)
router.register(r'logs', ActionLogViewSet)
router.register(r'notifications', AppNotificationViewSet, basename='notifications')
router.register(r'years', AcademicYearViewSet)    
router.register(r'teachers', TeacherViewSet)      
router.register(r'subjects', SubjectViewSet)
router.register(r'quarters', QuarterViewSet)
router.register(r'timetable', BellScheduleViewSet)

urlpatterns = [
    # 👇 ПОДКЛЮЧИЛИ КАСТОМНЫЙ ЛОГИН СЮДА
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),

    # 1. Сначала прописываем наши кастомные пути (APIView)
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('statistics/', StatisticsView.as_view(), name='statistics'),
    path('monitoring/', MonitoringView.as_view(), name='monitoring'),
    
    # НОВЫЕ ЭНДПОИНТЫ ДЛЯ НАСТРОЕК
    path('settings/set-year/<int:year_id>/', SetActiveYearView.as_view(), name='set-year'),
    path('settings/reset-points/', ResetPointsView.as_view(), name='reset-points'),
    
    # 2. Затем подключаем все стандартные роуты (CRUD), сгенерированные роутером
    path('', include(router.urls)),
]