from .classes import SchoolClassViewSet
from .students import StudentViewSet
from .rules import RuleViewSet
from .logs import ActionLogViewSet, AppNotificationViewSet
from .years import AcademicYearViewSet, QuarterViewSet
from .teachers import TeacherViewSet
from .subjects import SubjectViewSet
from .analytics import DashboardStatsView, StatisticsView, MonitoringView, ComparisonMetadataView, CompareEntitiesView
from .settings import SetActiveYearView, ResetPointsView
from .auth import CustomTokenObtainPairView
from .timetable import BellScheduleViewSet
from .chat import ChatContactsView, ChatMessagesView, ChatReadView, ChatMessageDetailView, ChatHistoryDeleteView, ChatPinMessageView
from .ai_chat import AIChatView