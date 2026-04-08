from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from django.db.models import Q
from django.utils import timezone
from app.models import Message, UserActivity

class ChatContactsView(APIView):
    """API для получения списка контактов в чате"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        users = User.objects.exclude(id=request.user.id).select_related('student_profile', 'teacher_profile', 'activity')
        
        contacts = []
        for u in users:
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
                
            last_msg = Message.objects.filter(
                Q(sender=request.user, recipient=u, visible_to_sender=True) | 
                Q(sender=u, recipient=request.user, visible_to_recipient=True)
            ).order_by('-created_at').first()
            
            unread_count = Message.objects.filter(
                sender=u, recipient=request.user, is_read=False, visible_to_recipient=True
            ).count()
            
            contacts.append({
                'id': u.id,
                'name': name,
                'is_admin': is_admin,
                'role_subtitle': role_subtitle,
                'last_seen': last_seen,
                'last_message': last_msg.content if last_msg else None,
                'last_message_date': last_msg.created_at.isoformat() if last_msg else None,
                'unread_count': unread_count
            })
            
        contacts.sort(key=lambda c: c['last_message_date'] or "1970-01-01T00:00:00", reverse=True)
        return Response(contacts)


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
        ).select_related('reply_to', 'forwarded_from').order_by('created_at')
        
        result = []
        for m in messages:
            result.append({
                'id': m.id,
                'sender_id': m.sender.id,
                'recipient_id': m.recipient.id,
                'content': m.content,
                'is_read': m.is_read,
                'is_edited': m.is_edited,
                'is_pinned': m.is_pinned,
                'audio_file': m.audio_file.url if m.audio_file else None,
                'reply_to_id': m.reply_to_id,
                'reply_to_content': m.reply_to.content if m.reply_to else None,
                'forwarded_from_name': m.forwarded_from.username if m.forwarded_from else None,
                'created_at': m.created_at.isoformat(),
                'read_at': m.read_at.isoformat() if m.read_at else None,
                'can_edit': m.sender == request.user,
                'can_delete_for_all': m.sender == request.user
            })
        return Response(result)

    def post(self, request, user_id):
        try:
            other_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
            
        content = request.data.get('content', '').strip()
        audio_file = request.FILES.get('audio_file')
        if not content and not audio_file:
            return Response({"error": "Message is empty"}, status=400)
            
        reply_to_id = request.data.get('reply_to_id')
        forwarded_from_id = request.data.get('forwarded_from_id')
        
        msg = Message.objects.create(
            sender=request.user,
            recipient=other_user,
            content=content,
            audio_file=audio_file,
            reply_to_id=reply_to_id,
            forwarded_from_id=forwarded_from_id
        )
        
        return Response({
            'id': msg.id,
            'sender_id': msg.sender.id,
            'recipient_id': msg.recipient.id,
            'content': msg.content,
            'is_read': msg.is_read,
            'is_edited': msg.is_edited,
            'is_pinned': msg.is_pinned,
            'audio_file': msg.audio_file.url if msg.audio_file else None,
            'reply_to_id': msg.reply_to_id,
            'reply_to_content': msg.reply_to.content if msg.reply_to else None,
            'forwarded_from_name': msg.forwarded_from.username if msg.forwarded_from else None,
            'created_at': msg.created_at.isoformat(),
            'read_at': None,
            'can_edit': True,
            'can_delete_for_all': True
        })


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
            
        Message.objects.filter(
            sender=other_user, 
            recipient=request.user, 
            is_read=False
        ).update(is_read=True, read_at=timezone.now())
        
        return Response({"status": "messages marked as read"})