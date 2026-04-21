from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from django.db import transaction
from django.shortcuts import get_object_or_404

from app.models import Student, SchoolClass, Quarter, QuarterResult
from app.serializers import StudentSerializer, StudentLiteSerializer

# 👇 ИМПОРТИРУЕМ НАШ СЕРВИС ГЕНЕРАЦИИ АККАУНТОВ
from app.services import create_user_for_student, generate_random_password


class StudentViewSet(viewsets.ModelViewSet):
    """API для управления учениками"""
    queryset = Student.objects.select_related('school_class').all()
    serializer_class = StudentSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['school_class']
    search_fields = ['first_name', 'last_name']

    # Базовые права: смотреть могут все авторизованные, менять — в зависимости от настроек
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        # ?light=1 на list — отдаём урезанный JSON без i18n-дубликатов (в 4× меньше).
        # Retrieve/create/update всегда используют полный сериализатор.
        if self.action == 'list' and self.request.query_params.get('light') in ('1', 'true'):
            return StudentLiteSerializer
        return StudentSerializer

    # ========================================================
    # 1. МАССОВЫЕ ОПЕРАЦИИ (ИМПОРТ И ПЕРЕВОД)
    # ========================================================
    
    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def bulk_update_class(self, request):
        """Массовый перевод учеников в другой класс"""
        student_ids = request.data.get('student_ids', [])
        new_class_id = request.data.get('new_class_id')

        if not student_ids or not new_class_id:
            return Response(
                {"detail": "Не переданы student_ids или new_class_id"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # get_object_or_404 сам отдаст 404 ошибку, если класса нет
        school_class = get_object_or_404(SchoolClass, id=new_class_id)
        
        with transaction.atomic():
            # update() возвращает количество обновленных строк
            updated_count = Student.objects.filter(id__in=student_ids).update(school_class=school_class)
            
        return Response({"detail": f"Успешно переведено {updated_count} учеников в класс {school_class.name}"})

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def bulk_create_students(self, request):
        """Оптимизированный массовый импорт учеников (решение N+1)"""
        students_data = request.data.get('students', [])
        if not students_data:
            return Response({"detail": "Список учеников пуст"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Собираем все уникальные названия классов из входных данных
        class_names = {data.get('class_name') for data in students_data if data.get('class_name')}
        
        # 2. Делаем ровно ОДИН запрос в БД, чтобы достать все нужные классы
        existing_classes = SchoolClass.objects.filter(name__in=class_names)
        
        # Создаем словарь { '1А': <SchoolClass object>, '2Б': <SchoolClass object> } для быстрого поиска
        class_map = {sc.name: sc for sc in existing_classes}

        students_to_create = []
        class_counts = {}
        not_found_classes = set()

        for data in students_data:
            class_name = data.get('class_name')
            school_class = class_map.get(class_name)
            
            # Добавляем в список только если класс реально существует в БД
            if school_class:
                students_to_create.append(
                    Student(
                        first_name=data.get('first_name'),
                        last_name=data.get('last_name'),
                        school_class=school_class
                    )
                )
                class_counts[class_name] = class_counts.get(class_name, 0) + 1
            else:
                if class_name:
                    not_found_classes.add(class_name)

        # 3. Делаем ровно ОДИН запрос на сохранение всех учеников
        with transaction.atomic():
            Student.objects.bulk_create(students_to_create)

        detail_msg = f"Успешно импортировано {len(students_to_create)} учеников."
        if class_counts:
            classes_info = ", ".join([f"{c} ({cnt})" for c, cnt in class_counts.items()])
            detail_msg += f" Добавлено по классам: {classes_info}."
        if not_found_classes:
            detail_msg += f" Внимание! Этих классов нет в базе: {', '.join(not_found_classes)}."

        return Response({"detail": detail_msg})

    # ========================================================
    # 2. ЛОГИКА СИН (ЧЕТВЕРТИ И СТАТУСЫ)
    # ========================================================
    
    @action(detail=False, methods=['get'])
    def requires_attention(self, request):
        """Возвращает список тех, у кого меньше 80 баллов (Для Завуча/Директора)"""
        problem_students = self.queryset.filter(points__lt=80).order_by('points')
        
        # Пагинация для кастомных action (чтобы не перегрузить фронт, если двоечников много)
        page = self.paginate_queryset(problem_students)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(problem_students, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def close_quarter(self, request):
        """Закрытие четверти: сохранение архива и перенос бонусов"""
        quarter_id = request.data.get('quarter_id')
        if not quarter_id:
            return Response({"detail": "Не передан quarter_id"}, status=status.HTTP_400_BAD_REQUEST)

        quarter = get_object_or_404(Quarter, id=quarter_id)
        
        if not quarter.is_active:
            return Response(
                {"detail": "Эта четверть уже закрыта или еще не активирована!"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Берем только активных учеников (у которых есть класс)
        from django.db.models import Exists, OuterRef
        from app.models import ActionLog

        students = Student.objects.filter(school_class__isnull=False).annotate(
            has_minuses=Exists(
                ActionLog.objects.filter(
                    student=OuterRef('pk'),
                    quarter=quarter,
                    rule__points_impact__lt=0
                )
            )
        )
        
        results_to_create = []
        students_to_update = []

        with transaction.atomic():
            # 1. Готовим данные для архива и считаем бонусы
            for student in students:
                is_exemplary = student.points >= 90
                results_to_create.append(QuarterResult(
                    student=student, 
                    quarter=quarter, 
                    final_points=student.points, 
                    is_exemplary=is_exemplary
                ))
                
                # 2. Проверяем, были ли у ученика минусы (нарушения) в этой четверти
                if not student.has_minuses:
                    # У кого никаких минусов не было, их накопленные сверху баллы (points - 100)
                    # добавляются к их бонусному счету на следующую четверть
                    extra_points = max(0, student.points - 100)
                    student.carryover_bonus = extra_points
                else:
                    # Если были минусы, бонус сгорает
                    student.carryover_bonus = 0
                    
                students_to_update.append(student)
            
            # Обновляем бонусы всем студентам ОДНИМ запросом
            Student.objects.bulk_update(students_to_update, ['carryover_bonus'])
            
            # 4. Сохраняем весь архив ОДНИМ запросом
            QuarterResult.objects.bulk_create(results_to_create)
            
            # 5. Закрываем четверть
            quarter.is_active = False
            quarter.save(update_fields=['is_active'])
            
            # 6. Пересчитываем баллы всех учеников (теперь active_quarter нет, будет 100 + carryover)
            for student in students:
                student.recalculate_points()

        return Response({
            "detail": f"Четверть '{quarter.name}' успешно закрыта. Баллы сброшены. Бонусы перенесены. Отличники сохранены в архив!"
        })

    # ========================================================
    # 3. ГЕНЕРАЦИЯ АККАУНТОВ ДЛЯ УЧЕНИКОВ
    # ========================================================
    
    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def generate_accounts(self, request):
        """
        Магическая кнопка для Директора: 
        Находит ВСЕХ учеников без аккаунтов, создает им логины/пароли
        и отдает списком (чтобы распечатать или скачать в Excel на фронте).
        """
        students_without_user = Student.objects.filter(user__isnull=True).select_related('school_class')
        
        if not students_without_user.exists():
            return Response({"detail": "У всех учеников уже есть аккаунты! Новых нет."}, status=status.HTTP_200_OK)

        generated_accounts = []
        
        with transaction.atomic():
            for student in students_without_user:
                username, password = create_user_for_student(student)
                
                # Сохраняем логин и сырой пароль в список для ответа
                generated_accounts.append({
                    "id": student.id,
                    "first_name": student.first_name,
                    "last_name": student.last_name,
                    "class_name": student.school_class.name if student.school_class else "-",
                    "username": username,
                    "password": password
                })

        return Response({
            "detail": f"Успешно создано {len(generated_accounts)} новых аккаунтов.",
            "accounts": generated_accounts
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def bulk_reset_passwords(self, request):
        """
        Массовый сброс паролей: генерирует новые пароли для выбранных учеников
        и возвращает их для печати на фронтенде.
        """
        student_ids = request.data.get('student_ids', [])
        if not student_ids:
            return Response({"detail": "Список учеников пуст"}, status=status.HTTP_400_BAD_REQUEST)

        students = Student.objects.filter(id__in=student_ids).select_related('school_class', 'user')
        generated_accounts = []

        with transaction.atomic():
            for student in students:
                # Если у ученика еще нет пользователя, создаем
                if not student.user:
                    username, password = create_user_for_student(student)
                else:
                    # Иначе сбрасываем пароль на рандомный
                    username = student.user.username
                    password = generate_random_password(8)
                    student.user.set_password(password)
                    student.user.save()

                generated_accounts.append({
                    "id": student.id,
                    "first_name": student.first_name,
                    "last_name": student.last_name,
                    "class_name": student.school_class.name if student.school_class else "-",
                    "username": username,
                    "password": password
                })

        return Response({
            "detail": f"Успешно сброшены и сгенерированы новые пароли для {len(generated_accounts)} учеников.",
            "accounts": generated_accounts
        })

# ========================================================
    # 4. ЛИЧНЫЙ КАБИНЕТ УЧЕНИКА
    # ========================================================
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        Эндпоинт для StudentDashboard.tsx
        Возвращает личные баллы, ранг в классе и историю логов авторизованного ученика.
        """
        # 1. Проверяем, есть ли у текущего пользователя профиль ученика
        if not hasattr(request.user, 'student_profile'):
            return Response({"detail": "Вы не являетесь учеником."}, status=status.HTTP_403_FORBIDDEN)
        
        student = request.user.student_profile
        
        # 2. Вычисляем ранг (место) ученика в его классе
        total_students = 0
        rank = 0
        if student.school_class:
            # Получаем всех учеников этого класса, отсортированных по баллам (по убыванию)
            class_students = list(Student.objects.filter(school_class=student.school_class).order_by('-points'))
            total_students = len(class_students)
            try:
                rank = class_students.index(student) + 1
            except ValueError:
                rank = 0

        # 3. Получаем последние 10 записей из журнала для этого ученика
        recent_logs = student.actions.select_related('rule', 'teacher').order_by('-created_at')[:10]
        
        logs_data = []
        for log in recent_logs:
            # Формируем ФИО учителя (например: Саидов Д.)
            teacher_name = "Система"
            if log.teacher:
                first_initial = f" {log.teacher.first_name[0]}." if log.teacher.first_name else ""
                teacher_name = f"{log.teacher.last_name}{first_initial}"

            logs_data.append({
                "id": log.id,
                "rule_title": log.rule.title,
                "points_impact": log.rule.points_impact,
                "teacher_name": teacher_name,
                "created_at": log.created_at,
                "is_positive": log.rule.points_impact > 0
            })

        # 4. Отдаем готовый JSON на фронтенд
        return Response({
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "class_name": student.school_class.name if student.school_class else "Нет класса",
            "points": student.points,
            "status_info": student.status_info, # Берем готовые статусы из модели
            "rank": rank,
            "total_students": total_students,
            "recent_logs": logs_data
        })

    # ========================================================
    # 5. ИСТОРИЯ УЧЕНИКА ДЛЯ АДМИНА/УЧИТЕЛЯ
    # ========================================================
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def history(self, request, pk=None):
        """
        Возвращает историю логов конкретного ученика.
        Используется при клике на ученика в поиске.
        """
        student = self.get_object()
        
        recent_logs = student.actions.select_related('rule', 'teacher').order_by('-created_at')[:50]
        
        logs_data = []
        for log in recent_logs:
            teacher_name = "Система"
            teacher_id = None
            if log.teacher:
                first_initial = f" {log.teacher.first_name[0]}." if log.teacher.first_name else ""
                teacher_name = f"{log.teacher.last_name}{first_initial}"
                teacher_id = log.teacher.id

            logs_data.append({
                "id": log.id,
                "rule_title": log.rule.title,
                "points_impact": log.rule.points_impact,
                "teacher_name": teacher_name,
                "teacher_id": teacher_id,
                "created_at": log.created_at,
                "is_positive": log.rule.points_impact > 0
            })
            
        return Response({
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "class_name": student.school_class.name if student.school_class else "Нет класса",
            "points": student.points,
            "status_info": student.status_info,
            "recent_logs": logs_data
        })
