from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.conf import settings
from django.db.models import Avg
from app.models import AIConversation, ActionLog, Student, TeacherProfile
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
        try:
            students_count = Student.objects.count()
            teachers_count = TeacherProfile.objects.count()
            avg_points = Student.objects.aggregate(avg=Avg('points'))['avg'] or 0
        except Exception:
            students_count = teachers_count = avg_points = 0
            
        return f"""Ты — опытный образовательный консультант и психолог с 20-летним стажем.
Ты помогаешь администраторам школы принимать мудрые управленческие решения, 
решать конфликтные ситуации между учителями, учениками и родителями, 
строить здоровую школьную атмосферу. 

Вот текущая статистика школы для твоего контекста:
- Всего учеников: {students_count}
- Всего учителей: {teachers_count}
- Средний балл дисциплины учеников: {avg_points:.1f}/100

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
            student = user.student_profile
            cls_name = student.school_class.name if student.school_class else "Не указан"
            points = student.points
            
            logs = ActionLog.objects.filter(student=student).select_related('rule').order_by('-created_at')[:5]
            log_text = "\\n".join([f"- {l.created_at.strftime('%d.%m.%Y')}: {l.rule.title} ({'+' if l.rule.points_impact > 0 else ''}{l.rule.points_impact})" for l in logs])
            if not log_text:
                log_text = "Нет недавних нарушений или бонусов."
        except Exception:
            cls_name = "Не указан"
            points = 0
            log_text = "Нет данных"

        return f"""Ты — самый добрый, мудрый и понимающий школьный психолог и наставник.
Ты общаешься с учеником. Тебе СТРОГО ЗАПРЕЩЕНО упоминать, обсуждать или раскрывать данные других учеников. Отвечай только по поводу его собственных результатов и нарушений.

Данные этого ученика:
- Учится в классе: {cls_name}
- Текущий балл по дисциплине: {points}/100
- Последние действия (нарушения/бонусы):
{log_text}

Твоя миссия — помочь ученику:
- Давать конкретные практические советы (например, как улучшить свои баллы, избежать спада).
- Справляться с эмоциями, конфликтами или сложными задачами в учебе.
- НИКОГДА не осуждай — ты друг, а не судья.
- Говори с уважением, как со взрослым.
- Используй простые слова, понятные школьнику.

Тон — тёплый, дружеский, поддерживающий. Говори на русском языке.
Начни приветствием, представься как 'ИИ-помощник'."""


class AIChatView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get conversation history for this user."""
        # Keep only the last 50 messages to prevent infinite growth on the client
        history = list(AIConversation.objects.filter(user=request.user).order_by('-created_at')[:50])
        history.reverse()
        messages = [{'role': m.role, 'content': m.content, 'created_at': m.created_at.isoformat()} for m in history]
        return Response({'messages': messages})

    def post(self, request):
        """Send a message to the AI and get a response."""
        if not GEMINI_AVAILABLE:
            return Response(
                {'error': 'google-genai пакет не установлен. Выполни: pip install google-genai'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        api_key = os.environ.get('GEMINI_API_KEY') or getattr(settings, 'GEMINI_API_KEY', None)
        if not api_key:
            return Response(
                {'error': 'GEMINI_API_KEY не настроен в .env файле'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        user_message = request.data.get('message', '').strip()
        if not user_message:
            return Response({'error': 'Сообщение не может быть пустым'}, status=status.HTTP_400_BAD_REQUEST)

        # Save user message to DB
        AIConversation.objects.create(user=request.user, role='user', content=user_message)

        # Cleanup old messages to prevent infinite growth (keep last 50)
        messages_to_keep = list(AIConversation.objects.filter(user=request.user).order_by('-created_at').values_list('id', flat=True)[:50])
        AIConversation.objects.filter(user=request.user).exclude(id__in=messages_to_keep).delete()

        # Build conversation history
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

            contents = chat_history + [
                types.Content(role='user', parts=[types.Part(text=user_message)])
            ]
            config = types.GenerateContentConfig(system_instruction=system_prompt)

            # Пробуем самую мощную модель, потом fallback
            response = None
            last_err = None
            for model_name in ['gemini-2.5-pro', 'gemini-2.5-flash']:
                try:
                    response = client.models.generate_content(model=model_name, contents=contents, config=config)
                    break
                except Exception as e:
                    err_str = str(e).lower()
                    last_err = e
                    if '503' in err_str or 'unavailable' in err_str or '429' in err_str or 'quota' in err_str or 'resource_exhausted' in err_str:
                        continue
                    raise e

            if response is None:
                raise last_err

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

import json

class AITranslateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not GEMINI_AVAILABLE:
            return Response(
                {'error': 'google-genai пакет не установлен. Выполни: pip install google-genai'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        api_key = os.environ.get('GEMINI_API_KEY') or getattr(settings, 'GEMINI_API_KEY', None)
        if not api_key:
            return Response(
                {'error': 'GEMINI_API_KEY не настроен в .env файле'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        text = request.data.get('text', '').strip()
        source_lang = request.data.get('source_lang', 'ru')
        
        if not text:
            return Response({'error': 'Текст пуст'}, status=status.HTTP_400_BAD_REQUEST)
            
        langs = {'ru': 'русский', 'tg': 'таджикский', 'en': 'английский'}
        
        prompt = f"""
Переведи следующий текст (правило поведения в школе) с {langs.get(source_lang, 'исходного языка')} на остальные языки из списка: русский, таджикский, английский.
Текст: "{text}"
Ответь СТРОГО в формате JSON без markdown:
{{
    "ru": "перевод на русский",
    "tg": "перевод на таджикский",
    "en": "перевод на английский"
}}
"""
        # Список моделей: самая мощная → запасная
        MODEL_PRIORITY = ['gemini-2.5-pro', 'gemini-2.5-flash']

        def _call_gemini(model_name: str):
            client = genai.Client(api_key=api_key)
            return client.models.generate_content(model=model_name, contents=prompt)

        last_error = None
        response = None
        for model_name in MODEL_PRIORITY:
            try:
                response = _call_gemini(model_name)
                break  # Успех — выходим из цикла
            except Exception as e:
                err_str = str(e).lower()
                last_error = e
                # Продолжаем к следующей модели только при временных ошибках
                if '503' in err_str or 'unavailable' in err_str or '429' in err_str or 'quota' in err_str or 'resource_exhausted' in err_str:
                    continue
                # При других ошибках — сразу прерываем
                raise e

        if response is None:
            import traceback
            traceback.print_exc()
            err_str = str(last_error).lower() if last_error else ''
            if '429' in err_str or 'quota' in err_str or 'resource_exhausted' in err_str:
                return Response(
                    {'error': 'Лимит запросов к ИИ исчерпан. Проверьте тарифный план в Google AI Studio.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
            return Response(
                {'error': 'ИИ-сервис временно недоступен. Попробуйте позже.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        try:
            ai_reply = response.text.strip()
            if ai_reply.startswith('```json'):
                ai_reply = ai_reply[7:]
            if ai_reply.startswith('```'):
                ai_reply = ai_reply[3:]
            if ai_reply.endswith('```'):
                ai_reply = ai_reply[:-3]

            result = json.loads(ai_reply.strip())

            # Keep original text for the source lang
            result[source_lang] = text

            return Response(result)

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
