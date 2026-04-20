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
    ComparisonMetadataView,
    CompareEntitiesView,
    SetActiveYearView,  
    ResetPointsView,
    CustomTokenObtainPairView,
    ChatContactsView,
    ChatMessagesView,
    ChatMessageDetailView,
    ChatHistoryDeleteView,
    ChatPinMessageView,
    ChatReadView,
    ChatBroadcastView,
    AIChatView,
    AITranslateView,
    MyClassMatrixView,
    SecretaryClassesView,
    AttendanceToggleView,
    AdminAttendanceStatsView,
    SystemUserViewSet,
)
from .views.fcm import FCMTokenRegisterView
from .views.cron import RunMonthlyBonusView

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
router.register(r'system-users', SystemUserViewSet, basename='system-users')

urlpatterns = [
    # 👇 ПОДКЛЮЧИЛИ КАСТОМНЫЙ ЛОГИН СЮДА
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),

    # 1. Сначала прописываем наши кастомные пути (APIView)
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('statistics/', StatisticsView.as_view(), name='statistics'),
    path('monitoring/', MonitoringView.as_view(), name='monitoring'),
    path('comparison-metadata/', ComparisonMetadataView.as_view(), name='comparison-metadata'),
    path('compare/', CompareEntitiesView.as_view(), name='compare'),
    
    # НОВЫЕ ЭНДПОИНТЫ ДЛЯ НАСТРОЕК
    path('settings/set-year/<int:year_id>/', SetActiveYearView.as_view(), name='set-year'),
    path('settings/reset-points/', ResetPointsView.as_view(), name='reset-points'),

    # Панель классного руководителя
    path('teacher/my-class/', MyClassMatrixView.as_view(), name='teacher-my-class'),

    # Панель секретаря (посещаемость)
    path('secretary/classes/', SecretaryClassesView.as_view(), name='secretary-classes'),
    path('secretary/attendance/toggle/', AttendanceToggleView.as_view(), name='attendance-toggle'),
    path('secretary/stats/', AdminAttendanceStatsView.as_view(), name='secretary-stats'),

    # Cloud Scheduler target
    path('cron/monthly-bonus/', RunMonthlyBonusView.as_view(), name='cron-monthly-bonus'),

    # Chat
    path('chat/broadcast/', ChatBroadcastView.as_view(), name='chat_broadcast'),
    path('chat/contacts/', ChatContactsView.as_view(), name='chat_contacts'),
    path('chat/messages/<int:user_id>/', ChatMessagesView.as_view(), name='chat_messages'),
    path('chat/message/<int:message_id>/', ChatMessageDetailView.as_view(), name='chat_message_detail'),
    path('chat/pin/<int:message_id>/', ChatPinMessageView.as_view(), name='chat_pin_message'),
    path('chat/history/<int:user_id>/', ChatHistoryDeleteView.as_view(), name='chat_history_delete'),
    path('chat/read/<int:user_id>/', ChatReadView.as_view(), name='chat_read'),

    # AI Chat
    path('ai/chat/', AIChatView.as_view(), name='ai_chat'),
    path('ai/translate/', AITranslateView.as_view(), name='ai_translate'),
    
    # FCM
    path('fcm-token/', FCMTokenRegisterView.as_view(), name='fcm-token'),

    # 2. Затем подключаем все стандартные роуты (CRUD), сгенерированные роутером
    path('', include(router.urls)),
]