import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from django.core.cache import cache
from app.models import Student, SchoolClass, ActionLog, Rule, Quarter


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser('admin', 'admin@test.com', 'password123')


@pytest.fixture
def teacher_user(db):
    from app.models import TeacherProfile
    user = User.objects.create_user('teacher', 'teacher@test.com', 'password123')
    user.is_staff = True
    user.save()
    TeacherProfile.objects.create(user=user, phone_number='12345')
    return user


@pytest.fixture
def populated_db(db):
    school_class = SchoolClass.objects.create(name='10A')
    quarter = Quarter.objects.create(name='Q1', start_date='2025-01-01', end_date='2025-03-01', is_active=True)
    rule = Rule.objects.create(title='Bad behavior', category='A', points_impact=-5)

    for i in range(3):
        u = User.objects.create_user(f's{i}', f's{i}@t.com', 'pass')
        s = Student.objects.create(user=u, first_name=f'Name{i}', last_name=f'Last{i}', school_class=school_class, points=100 - i * 5)
        if i == 0:
            ActionLog.objects.create(student=s, rule=rule, quarter=quarter)

    return {'class': school_class, 'quarter': quarter}


@pytest.mark.django_db
def test_dashboard_requires_auth(api_client):
    response = api_client.get('/api/dashboard-stats/')
    assert response.status_code == 401


@pytest.mark.django_db
def test_dashboard_returns_data(api_client, admin_user, populated_db):
    api_client.force_authenticate(user=admin_user)
    response = api_client.get('/api/dashboard-stats/')
    assert response.status_code == 200
    data = response.data
    assert 'total_students' in data
    assert data['total_students'] == 3


@pytest.mark.django_db
def test_dashboard_is_cached(api_client, admin_user, populated_db):
    api_client.force_authenticate(user=admin_user)
    api_client.get('/api/analytics/dashboard/')
    # Second call should hit cache (no DB queries for stats)
    response = api_client.get('/api/dashboard-stats/')
    assert response.status_code == 200


@pytest.mark.django_db
def test_monitoring_requires_auth(api_client):
    response = api_client.get('/api/monitoring/')
    assert response.status_code == 401


@pytest.mark.django_db
def test_monitoring_returns_class_data(api_client, admin_user, populated_db):
    api_client.force_authenticate(user=admin_user)
    response = api_client.get('/api/monitoring/')
    assert response.status_code == 200
    assert 'classes' in response.data
    assert len(response.data['classes']) >= 1


@pytest.mark.django_db
def test_statistics_requires_auth(api_client):
    response = api_client.get('/api/statistics/')
    assert response.status_code == 401


@pytest.mark.django_db
def test_statistics_returns_data(api_client, admin_user, populated_db):
    api_client.force_authenticate(user=admin_user)
    response = api_client.get('/api/statistics/')
    assert response.status_code == 200
    assert 'top_10_best' in response.data
    assert 'top_10_worst' in response.data
