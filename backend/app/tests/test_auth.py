import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from app.models import Student, SchoolClass, TeacherProfile

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def admin_user(db):
    user = User.objects.create_superuser('admin', 'admin@test.com', 'password123')
    return user

@pytest.fixture
def student_user(db):
    user = User.objects.create_user('student', 'student@test.com', 'password123')
    school_class = SchoolClass.objects.create(name='10A')
    Student.objects.create(user=user, first_name='Test', last_name='Student', school_class=school_class)
    return user

@pytest.fixture
def teacher_user(db):
    user = User.objects.create_user('teacher', 'teacher@test.com', 'password123')
    user.is_staff = True
    user.save()
    TeacherProfile.objects.create(user=user, phone_number='12345')
    return user

@pytest.mark.django_db
def test_admin_auth(api_client, admin_user):
    response = api_client.post('/api/auth/token/', {'username': 'admin', 'password': 'password123'})
    assert response.status_code == 200
    assert 'access' in response.data
    assert 'user' in response.data
    assert response.data['user']['role'] == 'admin'

@pytest.mark.django_db
def test_student_auth(api_client, student_user):
    response = api_client.post('/api/auth/token/', {'username': 'student', 'password': 'password123'})
    assert response.status_code == 200
    assert response.data['user']['role'] == 'student'

@pytest.mark.django_db
def test_teacher_auth(api_client, teacher_user):
    response = api_client.post('/api/auth/token/', {'username': 'teacher', 'password': 'password123'})
    assert response.status_code == 200
    assert response.data['user']['role'] == 'teacher'

@pytest.mark.django_db
def test_invalid_auth(api_client):
    response = api_client.post('/api/auth/token/', {'username': 'nobody', 'password': 'wrong'})
    assert response.status_code == 401
