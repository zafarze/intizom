import pytest
from unittest.mock import patch, MagicMock
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from app.models import AIConversation, Student, SchoolClass


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def regular_user(db):
    user = User.objects.create_user('user1', 'u@test.com', 'pass')
    school_class = SchoolClass.objects.create(name='9B')
    Student.objects.create(user=user, first_name='Ali', last_name='B', school_class=school_class)
    return user


@pytest.mark.django_db
def test_ai_chat_requires_auth(api_client):
    response = api_client.get('/api/ai/chat/')
    assert response.status_code == 401


@pytest.mark.django_db
def test_ai_chat_get_empty_history(api_client, regular_user):
    api_client.force_authenticate(user=regular_user)
    response = api_client.get('/api/ai/chat/')
    assert response.status_code == 200
    assert response.data['messages'] == []


@pytest.mark.django_db
def test_ai_chat_get_returns_history(api_client, regular_user):
    AIConversation.objects.create(user=regular_user, role='user', content='Hello')
    AIConversation.objects.create(user=regular_user, role='assistant', content='Hi there')
    api_client.force_authenticate(user=regular_user)
    response = api_client.get('/api/ai/chat/')
    assert response.status_code == 200
    assert len(response.data['messages']) == 2


@pytest.mark.django_db
def test_ai_chat_post_empty_message(api_client, regular_user):
    api_client.force_authenticate(user=regular_user)
    with patch.dict('os.environ', {'GEMINI_API_KEY': 'fake-key'}):
        response = api_client.post('/api/ai/chat/', {'message': ''}, format='json')
    assert response.status_code == 400


@pytest.mark.django_db
def test_ai_chat_post_no_api_key(api_client, regular_user):
    api_client.force_authenticate(user=regular_user)
    with patch('app.views.ai_chat.GEMINI_AVAILABLE', True), \
         patch.dict('os.environ', {}, clear=True), \
         patch('django.conf.settings.GEMINI_API_KEY', None, create=True):
        response = api_client.post('/api/ai/chat/', {'message': 'Hello'}, format='json')
    assert response.status_code == 503


@pytest.mark.django_db
def test_ai_chat_post_gemini_not_available(api_client, regular_user):
    api_client.force_authenticate(user=regular_user)
    with patch('app.views.ai_chat.GEMINI_AVAILABLE', False):
        response = api_client.post('/api/ai/chat/', {'message': 'Hello'}, format='json')
    assert response.status_code == 503


@pytest.mark.django_db
def test_ai_chat_post_saves_messages(api_client, regular_user):
    mock_response = MagicMock()
    mock_response.text = 'This is a test response from AI.'
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    api_client.force_authenticate(user=regular_user)
    with patch('app.views.ai_chat.GEMINI_AVAILABLE', True), \
         patch.dict('os.environ', {'GEMINI_API_KEY': 'fake-key'}), \
         patch('app.views.ai_chat.genai') as mock_genai:
        mock_genai.Client.return_value = mock_client
        response = api_client.post('/api/ai/chat/', {'message': 'Tell me something'}, format='json')

    assert response.status_code == 200
    assert AIConversation.objects.filter(user=regular_user).count() >= 1
