import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from app.models import Student, SchoolClass, Quarter, QuarterResult, ActionLog, Rule

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def admin_user(db):
    user = User.objects.create_superuser('admin', 'admin@test.com', 'password123')
    return user

@pytest.fixture
def test_data(db):
    school_class = SchoolClass.objects.create(name='10A')
    
    s1_user = User.objects.create_user('s1', 's1@test.com', 'pass')
    s2_user = User.objects.create_user('s2', 's2@test.com', 'pass')
    
    # student1 no minuses, will get carryover
    student1 = Student.objects.create(user=s1_user, first_name='Ivan', last_name='I', school_class=school_class, points=105)
    
    # student2 has minuses
    student2 = Student.objects.create(user=s2_user, first_name='Petr', last_name='P', school_class=school_class, points=110)
    
    quarter = Quarter.objects.create(name='Q1', start_date='2025-01-01', end_date='2025-03-01', is_active=True)
    rule_minus = Rule.objects.create(title='Minus', category='A', points_impact=-5)
    
    ActionLog.objects.create(student=student2, rule=rule_minus, quarter=quarter)
    
    return {
        'student1': student1,
        'student2': student2,
        'quarter': quarter,
    }

@pytest.mark.django_db
def test_close_quarter(api_client, admin_user, test_data):
    api_client.force_authenticate(user=admin_user)
    
    quarter = test_data['quarter']
    response = api_client.post('/api/students/close_quarter/', {'quarter_id': quarter.id})
    
    assert response.status_code == 200
    assert 'успешно закрыта' in response.data['detail']
    
    # Check quarter is closed
    quarter.refresh_from_db()
    assert not quarter.is_active
    
    # Check results archive created
    assert QuarterResult.objects.filter(quarter=quarter).count() == 2
    
    # Check student 1 (exemplary, no minuses -> carryover)
    s1 = test_data['student1']
    s1.refresh_from_db()
    
    # 105 points initially, carryover should be 5.
    # Recalculate will be 100 + 5 (carryover) = 105
    assert s1.carryover_bonus == 5
    assert s1.points == 105
    
    # Check student 2 (has minus -> no carryover)
    s2 = test_data['student2']
    s2.refresh_from_db()
    
    # Carryover should be 0 because of minuses
    assert s2.carryover_bonus == 0
    assert s2.points == 100

@pytest.mark.django_db
def test_close_quarter_already_closed(api_client, admin_user, test_data):
    api_client.force_authenticate(user=admin_user)
    quarter = test_data['quarter']
    quarter.is_active = False
    quarter.save()
    
    response = api_client.post('/api/students/close_quarter/', {'quarter_id': quarter.id})
    assert response.status_code == 400
    assert 'Эта четверть уже закрыта' in response.data['detail']
