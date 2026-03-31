from rest_framework import serializers
from django.db import transaction
from django.contrib.auth.models import User
from .models import (
    SchoolClass, Student, Rule, ActionLog, 
    AcademicYear, Subject, Quarter, TeacherProfile, AppNotification
)

# ==========================================
# 0. УЧЕБНЫЙ ГОД И ЧЕТВЕРТИ
# ==========================================
class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = ['id', 'year', 'is_active']

class QuarterSerializer(serializers.ModelSerializer):
    # Поле для удобного вывода названия года на фронтенде
    academic_year_name = serializers.CharField(source='academic_year.year', read_only=True)

    class Meta:
        model = Quarter
        fields = ['id', 'academic_year', 'academic_year_name', 'name', 'is_active']

# ==========================================
# 1. КЛАССЫ
# ==========================================
class SchoolClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolClass
        fields = ['id', 'name']

# ==========================================
# 2. УЧЕНИКИ
# ==========================================
class StudentSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source='school_class.name', read_only=True)
    status_info = serializers.ReadOnlyField() 
    
    # Вытягиваем логин для отображения в таблице
    username = serializers.CharField(source='user.username', read_only=True)
    
    # Поля для редактирования (write_only означает, что они не будут отправляться всем подряд)
    new_username = serializers.CharField(write_only=True, required=False, allow_blank=True)
    new_password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Student
        fields = [
            'id', 'first_name', 'last_name', 'class_name', 'school_class', 
            'points', 'status_info', 'username', 'new_username', 'new_password'
        ]

    def create(self, validated_data):
        new_username = validated_data.pop('new_username', None)
        new_password = validated_data.pop('new_password', None)
        
        student = super().create(validated_data)
        
        # Если при добавлении ученика админ сразу вписал логин и пароль
        if new_username and new_password:
            user = User.objects.create_user(
                username=new_username, 
                password=new_password, 
                first_name=student.first_name, 
                last_name=student.last_name
            )
            student.user = user
            student.save()
            
        return student

    def update(self, instance, validated_data):
        new_username = validated_data.pop('new_username', None)
        new_password = validated_data.pop('new_password', None)
        
        instance = super().update(instance, validated_data)
        
        # Если админ решил обновить логин или пароль
        if new_username or new_password:
            if instance.user:
                # Обновляем существующего юзера
                if new_username:
                    instance.user.username = new_username
                if new_password:
                    instance.user.set_password(new_password)
                instance.user.save()
            else:
                # Если аккаунта не было, а админ решил его создать вручную
                if new_username and new_password:
                    user = User.objects.create_user(
                        username=new_username, 
                        password=new_password, 
                        first_name=instance.first_name, 
                        last_name=instance.last_name
                    )
                    instance.user = user
                    instance.save()
                    
        return instance

# ==========================================
# 3. ПРАВИЛА (СИН)
# ==========================================
class RuleSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = Rule
        fields = ['id', 'title', 'category', 'category_display', 'points_impact', 'is_multiple']

# ==========================================
# 4. УЧИТЕЛЯ (ПОЛЬЗОВАТЕЛИ) И ПРЕДМЕТЫ
# ==========================================
class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'name']
        
class TeacherSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    
    # Железобетонная валидация: DRF сам проверит, существуют ли такие предметы
    subject_ids = serializers.PrimaryKeyRelatedField(
        queryset=Subject.objects.all(), 
        many=True, 
        write_only=True, 
        required=False, 
        source='subjects_to_set'
    )
    
    # Железобетонная валидация: DRF сам проверит, существует ли такой класс
    led_class_id = serializers.PrimaryKeyRelatedField(
        queryset=SchoolClass.objects.all(), 
        write_only=True, 
        required=False, 
        allow_null=True, 
        source='class_to_lead'
    )
    
    # Для чтения (отправляем данные на фронт)
    taught_subjects = serializers.SerializerMethodField(read_only=True)
    active_subject_ids = serializers.SerializerMethodField(read_only=True)
    led_class_name = serializers.CharField(source='led_classes.first.name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'password', 
            'subject_ids', 'led_class_id', 'taught_subjects', 
            'active_subject_ids', 'led_class_name'
        ]
        extra_kwargs = {
            'username': {'required': True} # Защита от IntegrityError на уровне БД
        }

    def get_taught_subjects(self, obj):
        if hasattr(obj, 'teacher_profile'):
            return ", ".join([s.name for s in obj.teacher_profile.subjects.all()])
        return ""

    def get_active_subject_ids(self, obj):
        if hasattr(obj, 'teacher_profile'):
            return list(obj.teacher_profile.subjects.values_list('id', flat=True))
        return []

    @transaction.atomic
    def create(self, validated_data):
        subjects = validated_data.pop('subjects_to_set', [])
        school_class = validated_data.pop('class_to_lead', None)

        user = User.objects.create_user(**validated_data)
        user.is_staff = True 
        user.save()

        profile = TeacherProfile.objects.create(user=user)
        
        if subjects:
            profile.subjects.set(subjects)

        if school_class:
            school_class.class_teacher = user
            school_class.save(update_fields=['class_teacher'])

        return user

    @transaction.atomic
    def update(self, instance, validated_data):
        subjects = validated_data.pop('subjects_to_set', None)
        school_class = validated_data.pop('class_to_lead', None)
        password = validated_data.pop('password', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        if password:
            instance.set_password(password)
        instance.save()

        profile, _ = TeacherProfile.objects.get_or_create(user=instance)
        
        if subjects is not None:
            profile.subjects.set(subjects)

        # Безопасное обновление класса: проверяем, прислал ли вообще фронт это поле
        if 'class_to_lead' in self.initial_data:
            SchoolClass.objects.filter(class_teacher=instance).update(class_teacher=None)
            if school_class:
                school_class.class_teacher = instance
                school_class.save(update_fields=['class_teacher'])

        return instance

# ==========================================
# 5. ЖУРНАЛ АКТИВНОСТИ (ActionLog)
# ==========================================
class ActionLogSerializer(serializers.ModelSerializer):
    student_detail = StudentSerializer(source='student', read_only=True)
    rule_detail = RuleSerializer(source='rule', read_only=True)
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)

    student_id = serializers.PrimaryKeyRelatedField(
        queryset=Student.objects.all(), source='student', write_only=True
    )
    rule_id = serializers.PrimaryKeyRelatedField(
        queryset=Rule.objects.all(), source='rule', write_only=True
    )

    class Meta:
        model = ActionLog
        fields = [
            'id', 'student_id', 'student_detail', 'rule_id', 
            'rule_detail', 'teacher_name', 'created_at', 'description' # 👈 ДОБАВИЛИ description
        ]

# ==========================================
# 6. СИСТЕМНЫЕ УВЕДОМЛЕНИЯ (AppNotification)
# ==========================================
class AppNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppNotification
        fields = ['id', 'title', 'message', 'created_at', 'recipient']