from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from django.db.models import Q, OuterRef, Subquery, Count, F
from django.db.models.functions import Coalesce
from django.utils import timezone
from app.models import Message, UserActivity, AppNotification
from django.core.paginator import Paginator
import json

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

        users = User.objects.exclude(id=user.id).select_related(
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
                
            is_admin = u.is_superuser or u.is_staff
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

    def post(self, request, user_id):
        try:
            other_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
            
        content = request.data.get('content', '').strip()
        audio_file = request.FILES.get('audio_file')
        image_file = request.FILES.get('image_file')
        document_file = request.FILES.get('document_file')
        document_name = request.data.get('document_name')
        
        if not content and not audio_file and not image_file and not document_file:
            return Response({"error": "Message is empty"}, status=400)
            
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
            
        if for_all and msg.sender == request.user:
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
            for m in msgs:
                if m.sender == request.user:
                    m.visible_to_sender = False
                elif m.recipient == request.user:
                    m.visible_to_recipient = False
                m.save()
                if not m.visible_to_sender and not m.visible_to_recipient:
                    m.delete()
                    
        return Response({"status": "chat history cleared"})


class ChatPinMessageView(APIView):
    """API для закрепления/открепления сообщения"""
    permission_classes = [IsAuthenticated]

    def post(self, request, message_id):
        try:
            msg = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return Response({"error": "Message not found"}, status=404)
            
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
            is_read=False
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

    def post(self, request):
        if not (request.user.is_superuser or request.user.is_staff):
            return Response({"error": "Только администратор может делать рассылки."}, status=403)

        content = request.data.get('content', '').strip()
        image_file = request.FILES.get('image_file')

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
                image_file=image_file
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
                        image_file=base_msg.image_file.name # Тот же путь в БД
                    )
                )
                notifications_to_create.append(
                    AppNotification(recipient=recipients[i], title="Рассылка от администратора", message=notif_text)
                )
        else:
            # Нет файла, просто bulk
            for user in recipients:
                messages_to_bulk.append(Message(sender=request.user, recipient=user, content=content))
                notifications_to_create.append(
                    AppNotification(recipient=user, title="Рассылка от администратора", message=notif_text)
                )
            created_messages = []

        if messages_to_bulk:
            created_msgs = Message.objects.bulk_create(messages_to_bulk)
            # bulk_create в SQLite не возвращает ID для созданных инстансов в старых версиях, 
            # но в Postgres и SQLite с 3.35+ возвращает.
            created_messages.extend(created_msgs)

        AppNotification.objects.bulk_create(notifications_to_create)

        # Рассылаем WS уведомления
        for msg in created_messages:
            # Если bulk_create не вернул ID, WS будет без ID, это не страшно,
            # клиент перезапросит при открытии чата. Но лучше достать последние:
            if not getattr(msg, 'id', None):
                # Fallback, но обычно WS триггеры достаточно просто дать
                pass
                
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
            async_to_sync(channel_layer.group_send)(
                f"user_{msg.recipient_id}",
                {
                    "type": "chat.message",
                    "message": response_data
                }
            )

        return Response({"status": "success", "sent_count": len(recipients)})
