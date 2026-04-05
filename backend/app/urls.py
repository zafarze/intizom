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
    AIChatView,
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
    path('comparison-metadata/', ComparisonMetadataView.as_view(), name='comparison-metadata'),
    path('compare/', CompareEntitiesView.as_view(), name='compare'),
    
    # НОВЫЕ ЭНДПОИНТЫ ДЛЯ НАСТРОЕК
    path('settings/set-year/<int:year_id>/', SetActiveYearView.as_view(), name='set-year'),
    path('settings/reset-points/', ResetPointsView.as_view(), name='reset-points'),

    # Chat
    path('chat/contacts/', ChatContactsView.as_view(), name='chat_contacts'),
    path('chat/messages/<int:user_id>/', ChatMessagesView.as_view(), name='chat_messages'),
    path('chat/message/<int:message_id>/', ChatMessageDetailView.as_view(), name='chat_message_detail'),
    path('chat/pin/<int:message_id>/', ChatPinMessageView.as_view(), name='chat_pin_message'),
    path('chat/history/<int:user_id>/', ChatHistoryDeleteView.as_view(), name='chat_history_delete'),
    path('chat/read/<int:user_id>/', ChatReadView.as_view(), name='chat_read'),

    # AI Chat
    path('ai/chat/', AIChatView.as_view(), name='ai_chat'),
    
    # 2. Затем подключаем все стандартные роуты (CRUD), сгенерированные роутером
    path('', include(router.urls)),
]