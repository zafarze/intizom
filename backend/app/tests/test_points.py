import pytest
from django.contrib.auth.models import User
from app.models import Student, SchoolClass, Quarter, Rule, ActionLog

@pytest.fixture
def test_data(db):
    user = User.objects.create_user('student1', 's1@test.com', 'pass')
    school_class = SchoolClass.objects.create(name='10A')
    student = Student.objects.create(user=user, first_name='Ivan', last_name='Ivanov', school_class=school_class, points=100)
    
    quarter = Quarter.objects.create(name='Q1', start_date='2025-01-01', end_date='2025-03-01', is_active=True)
    
    rule_minus = Rule.objects.create(title='Bad behavior', category='A', points_impact=-5)
    rule_plus = Rule.objects.create(title='Good behavior', category='BONUS', points_impact=10)
    
    return {
        'student': student,
        'quarter': quarter,
        'rule_minus': rule_minus,
        'rule_plus': rule_plus,
    }

@pytest.mark.django_db
def test_points_calculation_with_logs(test_data):
    student = test_data['student']
    quarter = test_data['quarter']
    
    # 100 base points
    assert student.points == 100
    
    # Add negative action
    ActionLog.objects.create(student=student, rule=test_data['rule_minus'], quarter=quarter)
    student.recalculate_points()
    assert student.points == 95
    
    # Add positive action
    ActionLog.objects.create(student=student, rule=test_data['rule_plus'], quarter=quarter)
    student.recalculate_points()
    assert student.points == 105

@pytest.mark.django_db
def test_points_carryover_bonus(test_data):
    student = test_data['student']
    student.carryover_bonus = 20
    student.save()
    
    student.recalculate_points()
    assert student.points == 120
    
    ActionLog.objects.create(student=student, rule=test_data['rule_minus'], quarter=test_data['quarter'])
    student.recalculate_points()
    assert student.points == 115
