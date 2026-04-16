from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Avg, Count, Q, Sum, Case, When, IntegerField
from django.db.models.functions import TruncMonth
from django.utils import timezone
from django.core.cache import cache
from dateutil.relativedelta import relativedelta

from app.models import Student, SchoolClass, ActionLog, Rule, QuarterResult, Quarter

# Ключи и TTL кеша
DASHBOARD_CACHE_KEY = 'dashboard_stats'
DASHBOARD_CACHE_TTL = 60 * 2   # 2 минуты

STATISTICS_CACHE_KEY = 'statistics_view'
STATISTICS_CACHE_TTL = 60 * 5  # 5 минут

class MyClassMatrixView(APIView):
    """
    Панель классного руководителя.
    Возвращает классы, в которых текущий учитель является классным руководителем (class_teachers),
    а также список учеников в этих классах с их текущими баллами.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Получаем классы, где этот юзер - классный руководитель
        led_classes = SchoolClass.objects.filter(class_teachers=user).prefetch_related('students')
        
        if not led_classes.exists():
            return Response([])

        data = []
        for school_class in led_classes:
            students = school_class.students.all().order_by('last_name', 'first_name')
            
            students_data = []
            for s in students:
                students_data.append({
                    "id": s.id,
                    "first_name": s.first_name,
                    "last_name": s.last_name,
                    "points": s.points,
                })
            
            data.append({
                "class_id": school_class.id,
                "class_name": school_class.name,
                "students": students_data
            })
            
        return Response(data)

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cached = cache.get(DASHBOARD_CACHE_KEY)
        if cached is not None:
            return Response(cached)

        # 1. Базовые метрики
        total_students = Student.objects.count()

        # Считаем средний балл по всей школе (если учеников нет, вернем 100)
        avg_score_dict = Student.objects.aggregate(avg=Avg('points'))
        avg_score = avg_score_dict['avg'] or 100

        # Сколько учеников в зоне риска (< 25 баллов)
        at_risk_count = Student.objects.filter(points__lt=25).count()

        # 2. Рейтинг классов (Топ-5 лучших)
        # Django сам сгруппирует учеников по классам и посчитает средний балл
        top_classes = SchoolClass.objects.annotate(
            avg_points=Avg('students__points') # Учтена модель Student с related_name='students'
        ).order_by('-avg_points')[:5]

        classes_data = [
            {
                "name": c.name,
                "avg_points": round(c.avg_points, 1) if c.avg_points else 100
            }
            for c in top_classes
        ]

        # 3. Последние 5 нарушений/поощрений (Live лента)
        recent_logs = ActionLog.objects.select_related('student', 'rule').order_by('-created_at')[:5]
        logs_data = [
            {
                "id": log.id,
                "text": f"{log.student.last_name} ({'+' if log.rule.points_impact > 0 else ''}{log.rule.points_impact}) - {log.rule.title}",
                "time": log.created_at.strftime("%H:%M"),
                "is_positive": log.rule.points_impact > 0
            }
            for log in recent_logs
        ]

        # Формируем итоговый ответ
        result = {
            "total_students": total_students,
            "average_score": round(avg_score, 1),
            "at_risk_count": at_risk_count,
            "top_classes": classes_data,
            "recent_logs": logs_data,
        }
        cache.set(DASHBOARD_CACHE_KEY, result, DASHBOARD_CACHE_TTL)
        return Response(result)


class StatisticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cached = cache.get(STATISTICS_CACHE_KEY)
        if cached is not None:
            return Response(cached)

        # 1. СТАТИСТИКА НАРУШЕНИЙ ПО ГРУППАМ (A, B, C, D)
        logs_by_category = ActionLog.objects.filter(rule__points_impact__lt=0).values('rule__category').annotate(count=Count('id'))

        total_violations = sum(item['count'] for item in logs_by_category) or 1

        violations_data = {
            'A': {'count': 0, 'percent': 0},
            'B': {'count': 0, 'percent': 0},
            'C': {'count': 0, 'percent': 0},
            'D': {'count': 0, 'percent': 0},
            'BONUS': {'count': 0, 'percent': 0},
        }

        for item in logs_by_category:
            cat = item['rule__category']
            if cat in violations_data:
                violations_data[cat]['count'] = item['count']
                violations_data[cat]['percent'] = round((item['count'] / total_violations) * 100)

        # Считаем бонусы отдельно (points_impact > 0)
        bonus_logs = ActionLog.objects.filter(rule__category='BONUS').values('rule__category').annotate(count=Count('id'))
        total_bonus = sum(item['count'] for item in bonus_logs) or 0
        if total_bonus:
            violations_data['BONUS']['count'] = total_bonus
            violations_data['BONUS']['percent'] = 100

        # 2. УРОВНИ РИСКА УЧЕНИКОВ
        total_students = Student.objects.count() or 1

        risk_levels = Student.objects.aggregate(
            exemplary=Count('id', filter=Q(points__gte=90)),
            verbal=Count('id', filter=Q(points__gte=70, points__lt=90)),
            written=Count('id', filter=Q(points__gte=45, points__lt=70)),
            labor=Count('id', filter=Q(points__gte=30, points__lt=45)),
            risk=Count('id', filter=Q(points__lt=30)),
        )

        risk_data = {
            'exemplary': {'count': risk_levels['exemplary'], 'percent': round((risk_levels['exemplary'] / total_students) * 100)},
            'verbal':    {'count': risk_levels['verbal'],    'percent': round((risk_levels['verbal']    / total_students) * 100)},
            'written':   {'count': risk_levels['written'],   'percent': round((risk_levels['written']   / total_students) * 100)},
            'labor':     {'count': risk_levels['labor'],     'percent': round((risk_levels['labor']     / total_students) * 100)},
            'risk':      {'count': risk_levels['risk'],      'percent': round((risk_levels['risk']      / total_students) * 100)},
        }

        # 3. ПООЩРЕНИЯ (БОНУСЫ ЗА ЭТОТ МЕСЯЦ)
        now = timezone.now()
        bonuses = ActionLog.objects.filter(
            rule__points_impact__gt=0,
            created_at__year=now.year,
            created_at__month=now.month
        ).aggregate(total=Sum('rule__points_impact'))

        total_bonuses = bonuses['total'] or 0

        # 4. СУПЕР-УЧЕНИКИ (300+ БАЛЛОВ ЗА ГОД ПО ИТОГАМ ЧЕТВЕРТЕЙ)
        top_quarter_students = QuarterResult.objects.values(
            'student__id', 'student__first_name', 'student__last_name', 'student__school_class__name'
        ).annotate(total_points=Sum('final_points')).filter(total_points__gte=300).order_by('-total_points')

        super_students = [
            {
                "id": s['student__id'],
                "name": f"{s['student__first_name']} {s['student__last_name']}",
                "class_name": s['student__school_class__name'] or "Нет класса",
                "total": s['total_points']
            }
            for s in top_quarter_students
        ]

        # 5. ТРЕНД ПОВЕДЕНИЯ ПО МЕСЯЦАМ — 1 запрос вместо 12
        month_names = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
        six_months_ago = now - relativedelta(months=5)
        month_start_6 = six_months_ago.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        monthly_agg = (
            ActionLog.objects
            .filter(created_at__gte=month_start_6)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(
                bonuses=Sum(Case(
                    When(rule__points_impact__gt=0, then='rule__points_impact'),
                    default=0,
                    output_field=IntegerField(),
                )),
                violations=Sum(Case(
                    When(rule__points_impact__lt=0, then='rule__points_impact'),
                    default=0,
                    output_field=IntegerField(),
                )),
            )
            .order_by('month')
        )

        agg_by_month = {row['month'].strftime('%Y-%m'): row for row in monthly_agg}

        trend_data = []
        for i in range(5, -1, -1):
            target_date = now - relativedelta(months=i)
            key = target_date.strftime('%Y-%m')
            row = agg_by_month.get(key, {})
            trend_data.append({
                "month": month_names[target_date.month - 1],
                "bonuses": row.get('bonuses') or 0,
                "violations": abs(row.get('violations') or 0),
            })

        # 6. ТОП-10 ЛУЧШИХ И ТОП-10 ХУДШИХ УЧЕНИКОВ
        best_students_qs = Student.objects.select_related('school_class').order_by('-points')[:10]
        worst_students_qs = Student.objects.select_related('school_class').order_by('points')[:10]

        def format_student(s):
            return {
                "id": s.id,
                "first_name": s.first_name,
                "last_name": s.last_name,
                "points": s.points,
                "class_name": s.school_class.name if s.school_class else "Нет класса"
            }

        top_10_best = [format_student(s) for s in best_students_qs]
        top_10_worst = [format_student(s) for s in worst_students_qs]

        result = {
            'violations': violations_data,
            'risk_levels': risk_data,
            'monthly_bonuses': total_bonuses,
            'super_students': super_students,
            'trend_data': trend_data,
            'top_10_best': top_10_best,
            'top_10_worst': top_10_worst,
        }
        cache.set(STATISTICS_CACHE_KEY, result, STATISTICS_CACHE_TTL)
        return Response(result)

class MonitoringView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 1. Рейтинг всех классов
        classes = SchoolClass.objects.annotate(
            avg_points=Avg('students__points')
        ).order_by('-avg_points')

        classes_data = []
        for c in classes:
            # Если в классе нет учеников, считаем средний балл = 100
            avg = c.avg_points if c.avg_points is not None else 100
            
            # Считаем тренд: насколько класс ушел от изначальных 100 баллов
            trend_value = round(avg - 100, 1) 
            
            classes_data.append({
                "id": c.id,
                "name": c.name,
                "score": round(avg),
                "trend": f"+{trend_value}" if trend_value > 0 else str(trend_value),
                "isUp": trend_value >= 0
            })

        # 2. Живая лента (берем 20 последних событий)
        recent_logs = ActionLog.objects.select_related('student', 'rule').order_by('-created_at')[:20]
        logs_data = []
        
        for log in recent_logs:
            impact = log.rule.points_impact
            logs_data.append({
                "id": log.id,
                "text": f"{log.student.last_name} {log.student.first_name[0]}. ({'+' if impact > 0 else ''}{impact}) - {log.rule.title}",
                "time": log.created_at.isoformat(), # Отдаем точную дату, фронтенд сам посчитает "мин назад"
                "type": "positive" if impact > 0 else "negative"
            })

        return Response({
            "classes": classes_data,
            "live_logs": logs_data
        })

class ComparisonMetadataView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        quarters = list(Quarter.objects.values('id', 'name', 'is_active', 'academic_year__year').order_by('-id'))
        
        current_q = Quarter.get_current_quarter()
        
        # Format quarter name to include year
        formatted_quarters = []
        for q in quarters:
            is_truly_active = (current_q and q['id'] == current_q.id)
            formatted_quarters.append({
                "id": q['id'],
                "name": f"{q['name']} ({q['academic_year__year']})",
                "is_active": is_truly_active
            })
            
        classes = list(SchoolClass.objects.values('id', 'name').order_by('name'))
        students = list(Student.objects.values('id', 'first_name', 'last_name', 'school_class__name').order_by('school_class__name', 'last_name'))
        
        return Response({
            "quarters": formatted_quarters,
            "classes": classes,
            "students": [{"id": s['id'], "name": f"{s['last_name']} {s['first_name']}", "class_name": s['school_class__name'] or "Нет класса"} for s in students]
        })

class CompareEntitiesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entity_type = request.query_params.get('type') # 'student' or 'class'
        entity_id = request.query_params.get('id')
        quarter_id = request.query_params.get('quarter_id')
        
        if not entity_id:
            return Response({"error": "Missing entity id"}, status=400)
            
        # if quarter_id is empty, use current active quarter
        if not quarter_id:
            active_q = Quarter.get_current_quarter()
            if active_q:
                quarter_id = active_q.id

        if not quarter_id:
             return Response({"error": "Quarter not found"}, status=404)
             
        quarter = Quarter.objects.filter(id=quarter_id).first()
        if not quarter:
             return Response({"error": "Quarter not found"}, status=404)

        current_q = Quarter.get_current_quarter()
        is_queried_quarter_current = (current_q and quarter.id == current_q.id)

        if entity_type == 'student':
            student = Student.objects.filter(id=entity_id).first()
            if not student:
                 return Response({"error": "Student not found"}, status=404)
            
            # Get points: if active quarter, use current points. If past quarter, use QuarterResult.
            if is_queried_quarter_current:
                points = student.points
            else:
                qr = QuarterResult.objects.filter(student=student, quarter=quarter).first()
                points = qr.final_points if qr else 100 # default 100 if no record

            # Get actions
            actions = ActionLog.objects.filter(student=student, quarter=quarter)
            bonuses = actions.filter(rule__points_impact__gt=0).count()
            violations = actions.filter(rule__points_impact__lt=0).count()
            
            return Response({
                "name": f"{student.last_name} {student.first_name}",
                "subtitle": student.school_class.name if student.school_class else "Нет класса",
                "points": points,
                "bonuses": bonuses,
                "violations": violations
            })

        elif entity_type == 'class':
            school_class = SchoolClass.objects.filter(id=entity_id).first()
            if not school_class:
                 return Response({"error": "Class not found"}, status=404)

            students = school_class.students.all()
            
            if is_queried_quarter_current:
                avg_points = students.aggregate(avg=Avg('points'))['avg'] or 100
            else:
                avg_points = QuarterResult.objects.filter(student__in=students, quarter=quarter).aggregate(avg=Avg('final_points'))['avg'] or 100

            actions = ActionLog.objects.filter(student__in=students, quarter=quarter)
            bonuses = actions.filter(rule__points_impact__gt=0).count()
            violations = actions.filter(rule__points_impact__lt=0).count()

            return Response({
                "name": school_class.name,
                "subtitle": f"{students.count()} учеников",
                "points": round(avg_points, 1),
                "bonuses": bonuses,
                "violations": violations
            })

        return Response({"error": "Invalid type"}, status=400)
