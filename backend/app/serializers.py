from rest_framework import serializers
from django.db import transaction
from django.contrib.auth.models import User
from .models import (
    SchoolClass, Student, Rule, ActionLog, 
    AcademicYear, Subject, Quarter, TeacherProfile, AppNotification, BellSchedule
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
        fields = ['id', 'academic_year', 'academic_year_name', 'name', 'is_active', 'start_date', 'end_date']
        extra_kwargs = {
            'academic_year': {'required': False, 'allow_null': True},
        }

    def validate(self, data):
        """
        Умное автоопределение учебного года по датам четверти.
        Логика: если start_date попадает в период сент–дек ГОДА_X,
        то ищем год формата ГОДА_X-ГОДА_X+1.
        """
        start_date = data.get('start_date') or getattr(self.instance, 'start_date', None)
        academic_year = data.get('academic_year') or getattr(self.instance, 'academic_year', None)

        if start_date and not academic_year:
            from .models import AcademicYear
            import re
            # Определяем, к какому учебному году относится дата
            # Сентябрь-декабрь: начало следующего
            m, y = start_date.month, start_date.year
            if m >= 9:
                year_str_start, year_str_end = y, y + 1
            else:
                year_str_start, year_str_end = y - 1, y

            pattern = f"{year_str_start}-{year_str_end}"
            matched = AcademicYear.objects.filter(year=pattern).first()
            if matched:
                data['academic_year'] = matched
            else:
                raise serializers.ValidationError(
                    f"Учебный год '{pattern}' не найден. Сначала создайте его."
                )
        return data

# ==========================================
# 1. КЛАССЫ
# ==========================================
class SchoolClassSerializer(serializers.ModelSerializer):
    class_teacher_names = serializers.SerializerMethodField()
    class_teacher_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_staff=True),
        source='class_teachers',
        many=True,
        required=False,
    )

    class Meta:
        model = SchoolClass
        fields = ['id', 'name', 'class_teacher_ids', 'class_teacher_names']

    def get_class_teacher_names(self, obj):
        return [f"{u.first_name} {u.last_name}".strip() or u.username for u in obj.class_teachers.all()]

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
    led_class_ids = serializers.PrimaryKeyRelatedField(
        queryset=SchoolClass.objects.all(), 
        many=True, 
        write_only=True, 
        required=False, 
        source='classes_to_lead'
    )
    
    # Для чтения (отправляем данные на фронт)
    taught_subjects = serializers.SerializerMethodField(read_only=True)
    active_subject_ids = serializers.SerializerMethodField(read_only=True)
    led_class_name = serializers.SerializerMethodField(read_only=True)
    active_class_ids = serializers.SerializerMethodField(read_only=True)

    def get_led_class_name(self, obj):
        classes = obj.led_classes.all()
        return ", ".join([c.name for c in classes]) if classes.exists() else ""

    def get_active_class_ids(self, obj):
        return list(obj.led_classes.values_list('id', flat=True))

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'password', 
            'subject_ids', 'led_class_ids', 'taught_subjects', 
            'active_subject_ids', 'led_class_name', 'active_class_ids'
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
        classes_to_lead = validated_data.pop('classes_to_lead', [])

        user = User.objects.create_user(**validated_data)
        user.is_staff = True 
        user.save()

        profile = TeacherProfile.objects.create(user=user)
        
        if subjects:
            profile.subjects.set(subjects)

        if classes_to_lead:
            for sc in classes_to_lead:
                sc.class_teachers.add(user)

        return user

    @transaction.atomic
    def update(self, instance, validated_data):
        subjects = validated_data.pop('subjects_to_set', None)
        classes_to_lead = validated_data.pop('classes_to_lead', None)
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
        if 'led_class_ids' in self.initial_data:
            for sc in instance.led_classes.all():
                sc.class_teachers.remove(instance)
            if classes_to_lead:
                for sc in classes_to_lead:
                    sc.class_teachers.add(instance)

        return instance

# ==========================================
# 5. ЖУРНАЛ АКТИВНОСТИ (ActionLog)
# ==========================================
class ActionLogSerializer(serializers.ModelSerializer):
    student_detail = StudentSerializer(source='student', read_only=True)
    rule_detail = RuleSerializer(source='rule', read_only=True)
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    teacher_id = serializers.PrimaryKeyRelatedField(source='teacher', read_only=True)

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
            'rule_detail', 'teacher_name', 'teacher_id', 'created_at', 'description'
        ]

# ==========================================
# 6. СИСТЕМНЫЕ УВЕДОМЛЕНИЯ (AppNotification)
# ==========================================
class AppNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppNotification
        fields = ['id', 'title', 'message', 'created_at', 'recipient']

# ==========================================
# 7. РАСПИСАНИЕ ЗВОНКОВ (BellSchedule)
# ==========================================
class BellScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = BellSchedule
        fields = ['id', 'lesson_number', 'start_time', 'end_time']