from django.contrib import admin
from modeltranslation.admin import TranslationAdmin
from .models import SchoolClass, Student, Rule, ActionLog, Quarter, Subject

@admin.register(SchoolClass)
class SchoolClassAdmin(admin.ModelAdmin):
    list_display = ('name', 'get_class_teachers')
    search_fields = ('name',)

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('class_teachers')

    @admin.display(description='Классные руководители')
    def get_class_teachers(self, obj):
        return ", ".join([user.get_full_name() or user.username for user in obj.class_teachers.all()])

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    # Вот здесь мы заменили 'grade' на 'school_class'
    list_display = ('last_name', 'first_name', 'school_class', 'points', 'get_status')
    list_filter = ('school_class',)
    search_fields = ('first_name', 'last_name')
    list_select_related = ('school_class',)
    
    # Выводим наш "умный" статус прямо в таблицу админки!
    @admin.display(description='Мақоми (Статус)')
    def get_status(self, obj):
        return obj.status_info['text']

@admin.register(Rule)
class RuleAdmin(TranslationAdmin):
    list_display = ('title', 'category', 'points_impact')
    list_filter = ('category',)
    search_fields = ('title',)

@admin.register(Quarter)
class QuarterAdmin(TranslationAdmin):
    list_display = ('name', 'academic_year', 'is_active')

@admin.register(Subject)
class SubjectAdmin(TranslationAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(ActionLog)
class ActionLogAdmin(admin.ModelAdmin):
    list_display = ('student', 'rule', 'points_impact', 'teacher', 'created_at')
    list_filter = ('created_at', 'teacher', 'rule__category')
    search_fields = ('student__first_name', 'student__last_name', 'rule__title')
    list_select_related = ('student', 'rule', 'teacher')

    # Показываем, сколько баллов сняло или добавило конкретное правило
    @admin.display(description='Хол (Балл)')
    def points_impact(self, obj):
        impact = obj.rule.points_impact
        return f"+{impact}" if impact > 0 else str(impact)