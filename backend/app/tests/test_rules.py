import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from app.models import Rule

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser('admin', 'admin@test.com', 'password123')

@pytest.mark.django_db
def test_create_rule_with_translated_title(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    response = api_client.post(
        '/api/rules/',
        {
            'title_ru': 'Плохое поведение',
            'category': 'A',
            'points_impact': -5,
            'is_multiple': False,
        },
        format='json'
    )

    assert response.status_code == 201
    assert response.data['title'] == 'Плохое поведение'
    assert response.data['title_ru'] == 'Плохое поведение'
    assert response.data['category'] == 'A'

@pytest.mark.django_db
def test_patch_rule_with_translated_title(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    rule = Rule.objects.create(title='Initial', category='A', points_impact=-5)

    response = api_client.patch(
        f'/api/rules/{rule.id}/',
        {
            'title_ru': 'Новое правило',
        },
        format='json'
    )

    assert response.status_code == 200
    assert response.data['title'] == 'Новое правило'
    assert response.data['title_ru'] == 'Новое правило'
