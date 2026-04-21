from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q, OuterRef, Subquery, Count, F
from django.db.models.functions import Coalesce
from django.utils import timezone
from app.models import Message, UserActivity, AppNotification
from app.fcm_utils import send_push_notification, send_bulk_push_notification
from django.core.paginator import Paginator
import json
import logging

logger = logging.getLogger(__name__)


def _sender_display_name(user):
    name = f"{user.first_name} {user.last_name}".strip()
    return name or user.username


def _unread_total_for(user):
    return Message.objects.filter(recipient=user, is_read=False, visible_to_recipient=True).count()


def _preview_for_message(content, has_image, has_audio, has_document):
    if content:
        return content[:120]
    if has_image:
        return "📷 Фото"
    if has_audio:
        return "🎤 Голосовое сообщение"
    if has_document:
        return "📎 Документ"
    return "Новое сообщение"

class ChatContactsView(APIView):
    """API для получения списка контактов в чате"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Subqueries for the latest message and unread count
        latest_message_subquery = Message.objects.filter(
            Q(sender=user, recipient=OuterRef('pk'), visible_to_sender=True) | 
            Q(sender=OuterRef('pk'), recipient=user, visible_to_recipient=True)
        ).order_by('-created_at')

        unread_count_subquery = Message.objects.filter(
            sender=OuterRef('pk'), recipient=user, is_read=False, visible_to_recipient=True
        ).values('sender').annotate(c=Count('*')).values('c')

        users_query = User.objects.exclude(id=user.id)

        if hasattr(user, 'student_profile'):
            # Ученики видят только суперадминов и тех, с кем уже есть сообщения
            users_query = users_query.filter(
                Q(is_superuser=True) |
                Q(sent_messages__recipient=user) |
                Q(received_messages__sender=user)
            ).distinct()

        users = users_query.select_related(
            'student_profile', 'student_profile__school_class', 'teacher_profile', 'activity'
        ).annotate(
            latest_msg_content=Subquery(latest_message_subquery.values('content')[:1]),
            latest_msg_date=Subquery(latest_message_subquery.values('created_at')[:1]),
            unread_msgs=Coalesce(Subquery(unread_count_subquery), 0)
        ).order_by(F('latest_msg_date').desc(nulls_last=True), 'first_name')
        
        # Pagination
        page_number = request.GET.get('page', 1)
        paginator = Paginator(users, 50)  # 50 contacts per page
        page_obj = paginator.get_page(page_number)
        
        contacts = []
        for u in page_obj:
            try:
                if hasattr(u, 'student_profile'):
                    name = f"{u.student_profile.first_name} {u.student_profile.last_name}"
                    school_class = u.student_profile.school_class
                    role_subtitle = f"Ученик {school_class.name}" if school_class else "Ученик"
                elif hasattr(u, 'teacher_profile'):
                    name = f"{u.first_name} {u.last_name}".strip() or u.username
                    role_subtitle = "Учитель"
                else:
                    name = f"{u.first_name} {u.last_name}".strip() or u.username
                    role_subtitle = "Сотрудник" if u.is_staff else "Пользователь"
            except Exception:
                name = u.username
                role_subtitle = "Пользователь"
                
            is_admin = u.is_superuser
            if is_admin:
                role_subtitle = "Администратор"
                
            last_seen = None
            if hasattr(u, 'activity') and u.activity:
                last_seen = u.activity.last_seen.isoformat()
            
            contacts.append({
                'id': u.id,
                'name': name,
                'is_admin': is_admin,
                'role_subtitle': role_subtitle,
                'last_seen': last_seen,
                'last_message': getattr(u, 'latest_msg_content', None),
                'last_message_date': getattr(u, 'latest_msg_date', None).isoformat() if getattr(u, 'latest_msg_date', None) else None,
                'unread_count': getattr(u, 'unread_msgs', 0)
            })
            
        return Response({
            "results": contacts,
            "has_next": page_obj.has_next(),
            "has_previous": page_obj.has_previous(),
            "total_pages": paginator.num_pages,
            "current_page": page_obj.number
        })


class ChatMessagesView(APIView):
    """API для получения и отправки сообщений конкретному пользователю"""
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        try:
            other_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
            
        messages = Message.objects.filter(
            Q(sender=request.user, recipient=other_user, visible_to_sender=True) |
            Q(sender=other_user, recipient=request.user, visible_to_recipient=True)
        ).select_related('reply_to', 'forwarded_from').order_by('-created_at') # Order DESC for pagination
        
        # Pagination
        page_number = request.GET.get('page', 1)
        paginator = Paginator(messages, 50) # 50 messages per page
        page_obj = paginator.get_page(page_number)
        
        result = []
        for m in reversed(list(page_obj)): # Reverse back to ASC for frontend display
            result.append({
                'id': m.id,
                'sender_id': m.sender.id,
                'recipient_id': m.recipient.id,
                'content': m.content,
                'is_read': m.is_read,
                'is_edited': m.is_edited,
                'is_pinned': m.is_pinned,
                'audio_file': m.audio_file.url if m.audio_file else None,
                'image_file': m.image_file.url if m.image_file else None,
                'document_file': m.document_file.url if m.document_file else None,
                'document_name': m.document_name,
                'reply_to_id': m.reply_to_id,
                'reply_to_content': m.reply_to.content if m.reply_to else None,
                'forwarded_from_name': m.forwarded_from.username if m.forwarded_from else None,
                'created_at': m.created_at.isoformat(),
                'read_at': m.read_at.isoformat() if m.read_at else None,
                'can_edit': m.sender == request.user,
                'can_delete_for_all': m.sender == request.user
            })
            
        return Response({
            "results": result,
            "has_next": page_obj.has_next(),
            "has_previous": page_obj.has_previous(),
            "total_pages": paginator.num_pages,
            "current_page": page_obj.number
        })

    # Allowed file types for chat uploads
    ALLOWED_AUDIO_TYPES = {'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/mp4', 'audio/x-m4a'}
    ALLOWED_AUDIO_EXTENSIONS = {'.mp3', '.wav', '.ogg', '.webm', '.aac', '.m4a', '.mp4'}
    ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'}
    ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'}
    ALLOWED_DOCUMENT_TYPES = {
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain', 'text/csv',
        'application/zip', 'application/x-rar-compressed',
    }
    ALLOWED_DOCUMENT_EXTENSIONS = {
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.txt', '.csv', '.zip', '.rar',
    }
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

    @staticmethod
    def _validate_file(file, allowed_types, allowed_extensions, label):
        """Validate uploaded file by MIME type, extension, and size."""
        import os
        if file is None:
            return None
        # Check file size
        if file.size > ChatMessagesView.MAX_FILE_SIZE:
            return f"{label}: файл слишком большой (макс. 10 МБ)"
        # Check extension
        _, ext = os.path.splitext(file.name)
        if ext.lower() not in allowed_extensions:
            return f"{label}: недопустимый тип файла ({ext})"
        # Check MIME type
        if file.content_type and file.content_type not in allowed_types:
            return f"{label}: недопустимый MIME-тип ({file.content_type})"
        return None

    def post(self, request, user_id):
        try:
            other_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
            
        if hasattr(request.user, 'student_profile'):
            if not other_user.is_superuser:
                return Response({"error": "Ученики могут писать только администратору."}, status=403)
            
        content = request.data.get('content', '').strip()
        audio_file = request.FILES.get('audio_file')
        image_file = request.FILES.get('image_file')
        document_file = request.FILES.get('document_file')
        document_name = request.data.get('document_name')
        
        if not content and not audio_file and not image_file and not document_file:
            return Response({"error": "Message is empty"}, status=400)

        # Validate file types
        for file, types, exts, label in [
            (audio_file, self.ALLOWED_AUDIO_TYPES, self.ALLOWED_AUDIO_EXTENSIONS, "Аудио"),
            (image_file, self.ALLOWED_IMAGE_TYPES, self.ALLOWED_IMAGE_EXTENSIONS, "Изображение"),
            (document_file, self.ALLOWED_DOCUMENT_TYPES, self.ALLOWED_DOCUMENT_EXTENSIONS, "Документ"),
        ]:
            error = self._validate_file(file, types, exts, label)
            if error:
                return Response({"error": error}, status=400)
            
        reply_to_id = request.data.get('reply_to_id')
        forwarded_from_id = request.data.get('forwarded_from_id')
        
        msg = Message.objects.create(
            sender=request.user,
            recipient=other_user,
            content=content,
            audio_file=audio_file,
            image_file=image_file,
            document_file=document_file,
            document_name=document_name or (document_file.name if document_file else None),
            reply_to_id=reply_to_id,
            forwarded_from_id=forwarded_from_id
        )
        
        response_data = {
            'id': msg.id,
            'sender_id': msg.sender.id,
            'recipient_id': msg.recipient.id,
            'content': msg.content,
            'is_read': msg.is_read,
            'is_edited': msg.is_edited,
            'is_pinned': msg.is_pinned,
            'audio_file': msg.audio_file.url if msg.audio_file else None,
            'image_file': msg.image_file.url if msg.image_file else None,
            'document_file': msg.document_file.url if msg.document_file else None,
            'document_name': msg.document_name,
            'reply_to_id': msg.reply_to_id,
            'reply_to_content': msg.reply_to.content if msg.reply_to else None,
            'forwarded_from_name': msg.forwarded_from.username if msg.forwarded_from else None,
            'created_at': msg.created_at.isoformat(),
            'read_at': None,
            'can_edit': True,
            'can_delete_for_all': True
        }
        
        # Send WebSocket event to recipient
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"user_{msg.recipient.id}",
            {
                "type": "chat.message",
                "message": response_data
            }
        )

        # Push-уведомление получателю. Не падаем, если FCM недоступен.
        try:
            sender_name = _sender_display_name(request.user)
            body = _preview_for_message(content, bool(image_file), bool(audio_file), bool(document_file))
            send_push_notification(
                user=other_user,
                title=sender_name,
                body=body,
                data={
                    'type': 'chat_message',
                    'sender_id': request.user.id,
                    'message_id': msg.id,
                    'unread_total': _unread_total_for(other_user),
                }
            )
        except Exception:
            logger.exception("Chat push failed: sender=%s recipient=%s", request.user.id, other_user.id)

        return Response(response_data)


class ChatMessageDetailView(APIView):
    """API для редактирования или удаления конкретного сообщения"""
    permission_classes = [IsAuthenticated]

    def put(self, request, message_id):
        try:
            msg = Message.objects.get(id=message_id, sender=request.user)
        except Message.DoesNotExist:
            return Response({"error": "Message not found or forbidden"}, status=404)
            
        content = request.data.get('content', '').strip()
        if content:
            msg.content = content
            msg.is_edited = True
            msg.save()
        return Response({"id": msg.id, "content": msg.content, "is_edited": msg.is_edited})
        
    def delete(self, request, message_id):
        for_all = request.GET.get('for_all', 'false').lower() == 'true'
        try:
            msg = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return Response({"error": "Message not found"}, status=404)

        if msg.sender_id != request.user.id and msg.recipient_id != request.user.id:
            return Response({"error": "Forbidden"}, status=403)

        if for_all:
            if msg.sender_id != request.user.id:
                return Response({"error": "Удалять у всех может только отправитель."}, status=403)
            msg.delete()
        else:
            if msg.sender == request.user:
                msg.visible_to_sender = False
            elif msg.recipient == request.user:
                msg.visible_to_recipient = False
            msg.save()
            
            if not msg.visible_to_sender and not msg.visible_to_recipient:
                msg.delete()
                
        return Response({"status": "message deleted"})


class ChatHistoryDeleteView(APIView):
    """API для очистки истории чата с пользователем"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id):
        for_all = request.GET.get('for_all', 'false').lower() == 'true'
        try:
            other_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
            
        msgs = Message.objects.filter(
            Q(sender=request.user, recipient=other_user) | 
            Q(sender=other_user, recipient=request.user)
        )
        
        if for_all:
            msgs.filter(sender=request.user).delete()
        else:
            # Массово скрываем сообщения, в которых инициатор был отправителем
            msgs.filter(sender=request.user).update(visible_to_sender=False)
            
            # Массово скрываем сообщения, в которых инициатор был получателем
            msgs.filter(recipient=request.user).update(visible_to_recipient=False)
            
            # Удаляем сообщения, которые не видит ни отправитель, ни получатель
            msgs.filter(visible_to_sender=False, visible_to_recipient=False).delete()
                    
        return Response({"status": "chat history cleared"})


class ChatPinMessageView(APIView):
    """API для закрепления/открепления сообщения"""
    permission_classes = [IsAuthenticated]

    def post(self, request, message_id):
        try:
            msg = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return Response({"error": "Message not found"}, status=404)

        if msg.sender_id != request.user.id and msg.recipient_id != request.user.id:
            return Response({"error": "Forbidden"}, status=403)

        msg.is_pinned = not msg.is_pinned
        msg.save()
        return Response({"is_pinned": msg.is_pinned})


class ChatReadView(APIView):
    """API для отметки сообщений как прочитанных"""
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        try:
            other_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
            
        updated_count = Message.objects.filter(
            sender=other_user,
            recipient=request.user,
            is_read=False,
            visible_to_recipient=True
        ).update(is_read=True, read_at=timezone.now())
        
        if updated_count > 0:
            # Notify the sender that their messages were read
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"user_{other_user.id}",
                {
                    "type": "chat.read",
                    "reader_id": request.user.id
                }
            )
            
        return Response({"status": "messages marked as read"})

class ChatBroadcastView(APIView):
    """API для массовой рассылки (только для админов)"""
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        if not request.user.is_superuser:
            return Response({"error": "Только администратор может делать рассылки."}, status=403)

        content = request.data.get('content', '').strip()
        image_file = request.FILES.get('image_file')

        # Validate image file type
        if image_file:
            error = ChatMessagesView._validate_file(
                image_file,
                ChatMessagesView.ALLOWED_IMAGE_TYPES,
                ChatMessagesView.ALLOWED_IMAGE_EXTENSIONS,
                "Изображение"
            )
            if error:
                return Response({"error": error}, status=400)

        if not content and not image_file:
            return Response({"error": "Сообщение не может быть пустым."}, status=400)

        target_type = request.data.get('target_type', 'all')
        target_classes_str = request.data.get('target_classes', '[]')
        target_users_str = request.data.get('target_users', '[]')

        try:
            target_classes = json.loads(target_classes_str)
        except:
            target_classes = []
            
        try:
            target_users = json.loads(target_users_str)
        except:
            target_users = []

        users_query = User.objects.exclude(id=request.user.id).filter(is_active=True)

        if target_type == 'teachers':
            users_query = users_query.filter(teacher_profile__isnull=False)
        elif target_type == 'students':
            if target_classes:
                users_query = users_query.filter(student_profile__school_class_id__in=target_classes)
            else:
                users_query = users_query.filter(student_profile__isnull=False)
        elif target_type == 'specific':
            if target_users:
                users_query = users_query.filter(id__in=target_users)
            else:
                return Response({"error": "Не выбраны конкретные пользователи."}, status=400)
        # Если 'all' - оставляем users_query без доп. фильтров

        recipients = list(users_query)

        if not recipients:
            return Response({"error": "Нет пользователей для рассылки по заданным критериям."}, status=400)

        notifications_to_create = []

        notif_text = content[:100] + ('...' if len(content) > 100 else '')
        if not notif_text and image_file:
            notif_text = "[Фотография]"

        # Сначала создадим оригинальное сообщение для рассылки с файлом
        # Мы должны создать по одному сообщению на каждого юзера.
        # Для bulk_create нельзя сохранить файлы нормально, поэтому мы создадим
        # первое сообщение через create(), чтобы сформировался image_file,
        # а для остальных просто скопируем имя файла.
        
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()

        base_msg = None
        messages_to_bulk = []
        
        # Если есть файл, то сохраняем его в первый инстанс
        if image_file:
            base_msg = Message.objects.create(
                sender=request.user,
                recipient=recipients[0], # первый получатель
                content=content,
                image_file=image_file,
                visible_to_sender=False
            )
            # Уведомление для первого 
            notifications_to_create.append(
                AppNotification(recipient=recipients[0], title="Рассылка от администратора", message=notif_text)
            )
            created_messages = [base_msg]
            
            # Для остальных - копируем URL файла без физического копирования файла на диске
            for i in range(1, len(recipients)):
                messages_to_bulk.append(
                    Message(
                        sender=request.user,
                        recipient=recipients[i],
                        content=content,
                        image_file=base_msg.image_file.name, # Тот же путь в БД
                        visible_to_sender=False
                    )
                )
                notifications_to_create.append(
                    AppNotification(recipient=recipients[i], title="Рассылка от администратора", message=notif_text)
                )
        else:
            # Нет файла, просто bulk
            for user in recipients:
                messages_to_bulk.append(Message(sender=request.user, recipient=user, content=content, visible_to_sender=False))
                notifications_to_create.append(
                    AppNotification(recipient=user, title="Рассылка от администратора", message=notif_text)
                )
            created_messages = []

        if messages_to_bulk:
            created_msgs = Message.objects.bulk_create(messages_to_bulk)
            created_messages.extend(created_msgs)

        AppNotification.objects.bulk_create(notifications_to_create)

        # Создаем системного пользователя для логов
        sys_broadcast, _ = User.objects.get_or_create(
            username='sys_broadcast',
            defaults={
                'first_name': '📢 История',
                'last_name': 'Рассылок',
                'is_active': False
            }
        )

        # Сообщение-история для администратора
        tag_map = {
            'all': 'Всем',
            'teachers': 'Учителям',
            'students': 'Ученикам',
            'specific': 'Выборочно'
        }
        history_content = f"[Кому: {tag_map.get(target_type, 'Неизвестно')}]\n{content}"

        history_msg = Message.objects.create(
            sender=request.user,
            recipient=sys_broadcast,
            content=history_content,
            image_file=base_msg.image_file.name if base_msg and hasattr(base_msg, 'image_file') and base_msg.image_file else None,
            visible_to_sender=True,
            visible_to_recipient=False
        )

        import asyncio

        WS_BATCH_SIZE = 100  # cap concurrency to avoid saturating the channel layer on large broadcasts

        async def send_all_ws_messages():
            tasks = []
            for msg in created_messages:
                response_data = {
                    'id': getattr(msg, 'id', 0),
                    'sender_id': request.user.id,
                    'recipient_id': msg.recipient_id,
                    'content': msg.content,
                    'is_read': False,
                    'is_edited': False,
                    'is_pinned': False,
                    'audio_file': None,
                    'image_file': msg.image_file.url if getattr(msg, 'image_file', None) else None,
                    'document_file': None,
                    'document_name': None,
                    'reply_to_id': None,
                    'created_at': timezone.now().isoformat(),
                    'can_edit': True,
                    'can_delete_for_all': True
                }
                tasks.append(channel_layer.group_send(
                    f"user_{msg.recipient_id}",
                    {
                        "type": "chat.message",
                        "message": response_data
                    }
                ))

            # WS уведомление самому админу об успешной истории
            history_response = {
                'id': getattr(history_msg, 'id', 0),
                'sender_id': request.user.id,
                'recipient_id': sys_broadcast.id,
                'content': history_msg.content,
                'is_read': False,
                'is_edited': False,
                'is_pinned': False,
                'audio_file': None,
                'image_file': history_msg.image_file.url if getattr(history_msg, 'image_file', None) else None,
                'document_file': None,
                'document_name': None,
                'reply_to_id': None,
                'created_at': timezone.now().isoformat(),
                'can_edit': True,
                'can_delete_for_all': True
            }
            tasks.append(channel_layer.group_send(
                f"user_{request.user.id}",
                {
                    "type": "chat.message",
                    "message": history_response
                }
            ))

            # Drain in batches so 1000-recipient broadcasts don't spawn 1000 concurrent
            # Redis calls at once and exhaust the channel layer pool.
            for i in range(0, len(tasks), WS_BATCH_SIZE):
                await asyncio.gather(*tasks[i:i + WS_BATCH_SIZE])

        # Запускаем все WS рассылки асинхронно, без блокировки на каждом пользователе
        async_to_sync(send_all_ws_messages)()

        # Push всем получателям рассылки. Chunk-safe внутри send_bulk_push_notification.
        try:
            sender_name = _sender_display_name(request.user)
            body = _preview_for_message(content, bool(image_file), False, False)
            send_bulk_push_notification(
                users=recipients,
                title=f"📢 {sender_name}",
                body=body,
                data={'type': 'chat_broadcast', 'sender_id': request.user.id},
            )
        except Exception:
            logger.exception("Chat broadcast push failed: sender=%s count=%d", request.user.id, len(recipients))

        return Response({"status": "success", "sent_count": len(recipients)})
