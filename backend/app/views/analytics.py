from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone

# 👇 ДОБАВЛЕН ИМПОРТ QuarterResult ДЛЯ СТАТИСТИКИ ОТЛИЧНИКОВ
from app.models import Student, SchoolClass, ActionLog, Rule, QuarterResult

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 1. Базовые метрики
        total_students = Student.objects.count()
        
        # Считаем средний балл по всей школе (если учеников нет, вернем 100)
        avg_score_dict = Student.objects.aggregate(avg=Avg('points'))
        avg_score = avg_score_dict['avg'] or 100
        
        # Сколько учеников в зоне риска (< 45 баллов)
        at_risk_count = Student.objects.filter(points__lt=45).count()

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
                "time": log.created_at.strftime("%H:%M"), # Можно отформатировать красивее
                "is_positive": log.rule.points_impact > 0
            }
            for log in recent_logs
        ]

        # Формируем итоговый ответ
        return Response({
            "total_students": total_students,
            "average_score": round(avg_score, 1),
            "at_risk_count": at_risk_count,
            "top_classes": classes_data,
            "recent_logs": logs_data
        })


class StatisticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 1. СТАТИСТИКА НАРУШЕНИЙ ПО ГРУППАМ (A, B, C, D)
        # Считаем, сколько раз нарушали правила каждой категории
        logs_by_category = ActionLog.objects.filter(rule__points_impact__lt=0).values('rule__category').annotate(count=Count('id'))
        
        # Считаем общее количество нарушений, чтобы вычислить проценты (or 1, чтобы не было деления на ноль)
        total_violations = sum(item['count'] for item in logs_by_category) or 1 
        
        violations_data = {
            'A': {'count': 0, 'percent': 0},
            'B': {'count': 0, 'percent': 0},
            'C': {'count': 0, 'percent': 0},
            'D': {'count': 0, 'percent': 0},
        }
        
        for item in logs_by_category:
            cat = item['rule__category']
            if cat in violations_data:
                violations_data[cat]['count'] = item['count']
                violations_data[cat]['percent'] = round((item['count'] / total_violations) * 100)

        # 2. УРОВНИ РИСКА УЧЕНИКОВ
        total_students = Student.objects.count() or 1
        
        # Разбиваем учеников по корзинам баллов
        risk_levels = Student.objects.aggregate(
            exemplary=Count('id', filter=Q(points__gte=90)),
            verbal=Count('id', filter=Q(points__gte=70, points__lt=90)),
            written=Count('id', filter=Q(points__gte=45, points__lt=70)),
            risk=Count('id', filter=Q(points__lt=45)),
        )
        
        risk_data = {
            'exemplary': {'count': risk_levels['exemplary'], 'percent': round((risk_levels['exemplary'] / total_students) * 100)},
            'verbal': {'count': risk_levels['verbal'], 'percent': round((risk_levels['verbal'] / total_students) * 100)},
            'written': {'count': risk_levels['written'], 'percent': round((risk_levels['written'] / total_students) * 100)},
            'risk': {'count': risk_levels['risk'], 'percent': round((risk_levels['risk'] / total_students) * 100)},
        }

        # 3. ПООЩРЕНИЯ (БОНУСЫ ЗА ЭТОТ МЕСЯЦ)
        now = timezone.now()
        bonuses = ActionLog.objects.filter(
            rule__points_impact__gt=0, # Только плюсовые баллы
            created_at__year=now.year,
            created_at__month=now.month
        ).aggregate(total=Sum('rule__points_impact'))
        
        total_bonuses = bonuses['total'] or 0

        # 👇 4. НОВЫЙ КОД: СУПЕР-УЧЕНИКИ (300+ БАЛЛОВ ЗА ГОД ПО ИТОГАМ ЧЕТВЕРТЕЙ)
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

        return Response({
            'violations': violations_data,
            'risk_levels': risk_data,
            'monthly_bonuses': total_bonuses,
            'super_students': super_students # 👈 Возвращаем массив отличников на фронтенд
        })

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