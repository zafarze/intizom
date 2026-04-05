from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.conf import settings
from app.models import AIConversation
import os
import traceback

try:
    from google import genai
    from google.genai import types
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


def get_system_prompt(user):
    """Return role-specific system prompt."""
    is_teacher = hasattr(user, 'teacher_profile')
    is_admin = user.is_staff or user.is_superuser

    if is_admin:
        return """Ты — опытный образовательный консультант и психолог с 20-летним стажем.
Ты помогаешь администраторам школы принимать мудрые управленческие решения, 
решать конфликтные ситуации между учителями, учениками и родителями, 
строить здоровую школьную атмосферу. 
Ты всегда даёшь конкретные, практичные советы. Общаешься на русском языке.
Начни приветствием, представься как 'ИИ-консультант Intizom'."""

    elif is_teacher:
        try:
            subjects = ", ".join([s.name for s in user.teacher_profile.subjects.all()])
        except:
            subjects = ""

        return f"""Ты — ведущий педагог-психолог с 25-летним опытом работы в школах.
Специализируешься на помощи учителям в работе с детьми разных характеров и ситуаций.
{f'Ты знаешь что этот учитель преподаёт: {subjects}.' if subjects else ''}

Твои задачи:
- Давать конкретные педагогические советы: как объяснить тему, замотивировать ученика, работать с трудными детьми
- Помогать найти индивидуальный подход к каждому ученику
- Предлагать психологические техники управления классом
- Поддерживать учителя эмоционально и профессионально
- Подсказывать инновационные методы преподавания

Отвечай структурированно: сначала пойми ситуацию, потом дай 2-3 конкретных совета.
Тон — коллегиальный, уважительный, поддерживающий. Обязательно говори на русском языке.
Начни приветствием, представься как 'ИИ-наставник для учителей'."""

    else:
        try:
            cls_name = user.student_profile.school_class.name if user.student_profile.school_class else ""
        except:
            cls_name = ""

        return f"""Ты — самый добрый, мудрый и понимающий школьный психолог и наставник.
{f'Ты знаешь что этот ученик учится в классе: {cls_name}.' if cls_name else ''}

Твоя миссия — помочь ученику в любой ситуации:
- В учёбе: объясни сложную тему простыми словами, помоги с домашним заданием
- В отношениях: с одноклассниками, учителями, родителями
- В эмоциях: тревога, страх, одиночество, злость — ты всегда выслушаешь
- В жизненных вопросах: помоги найти правильный путь и принять мудрое решение
- В конфликтах: разберись в ситуации без осуждения

Принципы общения:
✦ НИКОГДА не осуждай — ты друг, а не судья
✦ Говори с уважением, как со взрослым
✦ Будь конкретным — давай практические советы, не только слова поддержки
✦ Если проблема серьёзная — мягко предложи поговорить с родителями или учителем
✦ Используй простые слова, понятные школьнику

Тон — тёплый, дружеский, поддерживающий. Говори на русском языке.
Начни приветствием, представься как 'ИИ-помощник'. Спроси чем можешь помочь."""


class AIChatView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get conversation history for this user."""
        history = AIConversation.objects.filter(user=request.user).order_by('created_at')
        messages = [{'role': m.role, 'content': m.content, 'created_at': m.created_at.isoformat()} for m in history]
        return Response({'messages': messages})

    def post(self, request):
        """Send a message to the AI and get a response."""
        if not GEMINI_AVAILABLE:
            return Response(
                {'error': 'google-genai пакет не установлен. Выполни: pip install google-genai'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        api_key = os.environ.get('OPENAI_API_KEY') or getattr(settings, 'OPENAI_API_KEY', None)
        if not api_key:
            return Response(
                {'error': 'OPENAI_API_KEY (Google API Key) не настроен в .env файле'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        user_message = request.data.get('message', '').strip()
        if not user_message:
            return Response({'error': 'Сообщение не может быть пустым'}, status=status.HTTP_400_BAD_REQUEST)

        # Save user message to DB
        AIConversation.objects.create(user=request.user, role='user', content=user_message)

        # Build conversation history (last 20 messages)
        history_qs = AIConversation.objects.filter(user=request.user).order_by('created_at')
        history = list(history_qs)

        try:
            client = genai.Client(api_key=api_key)

            # Build chat history for Gemini (excluding last user message we just saved)
            chat_history = []
            for msg in history[:-1][-18:]:  # last 18 messages (excluding the one just added)
                role = 'user' if msg.role == 'user' else 'model'
                chat_history.append(
                    types.Content(role=role, parts=[types.Part(text=msg.content)])
                )

            system_prompt = get_system_prompt(request.user)

            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=chat_history + [
                    types.Content(role='user', parts=[types.Part(text=user_message)])
                ],
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                )
            )

            ai_reply = response.text

            # Save AI response to DB
            AIConversation.objects.create(user=request.user, role='assistant', content=ai_reply)

            return Response({'reply': ai_reply})

        except Exception as e:
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request):
        """Clear conversation history."""
        AIConversation.objects.filter(user=request.user).delete()
        return Response({'status': 'ok'})
