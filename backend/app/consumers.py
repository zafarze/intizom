import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        self.user_group_name = None

        await self.accept()
        
        # If user is already authenticated via middleware (e.g. fallback)
        if self.user and not self.user.is_anonymous:
            self.user_group_name = f"user_{self.user.id}"
            await self.channel_layer.group_add(
                self.user_group_name,
                self.channel_name
            )
            await self.send(text_data=json.dumps({
                'type': 'system',
                'message': 'Connected to chat'
            }))

    async def disconnect(self, close_code):
        if self.user_group_name:
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )

    # Receive message from WebSocket (from client)
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get('action')
            
            if action == 'auth':
                token = data.get('token')
                if token:
                    from app.middleware import get_user_from_token
                    user = await get_user_from_token(token)
                    if user and not user.is_anonymous:
                        self.user = user
                        self.user_group_name = f"user_{self.user.id}"
                        await self.channel_layer.group_add(
                            self.user_group_name,
                            self.channel_name
                        )
                        await self.send(text_data=json.dumps({
                            'type': 'system',
                            'message': 'Authenticated and connected to chat'
                        }))
                    else:
                        await self.send(text_data=json.dumps({
                            'type': 'error',
                            'message': 'Invalid token'
                        }))
                        await self.close()
                return

            # Reject other actions if not authenticated
            if not self.user or self.user.is_anonymous:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Not authenticated'
                }))
                return

            if action == 'typing':
                # User is typing to someone
                recipient_id = data.get('recipient_id')
                if recipient_id:
                    recipient_group_name = f"user_{recipient_id}"
                    await self.channel_layer.group_send(
                        recipient_group_name,
                        {
                            'type': 'chat.typing',
                            'sender_id': self.user.id,
                        }
                    )
            elif action == 'read':
                # User read messages from someone
                sender_id = data.get('sender_id')
                if sender_id:
                    sender_group_name = f"user_{sender_id}"
                    await self.channel_layer.group_send(
                        sender_group_name,
                        {
                            'type': 'chat.read',
                            'reader_id': self.user.id,
                        }
                    )
        except json.JSONDecodeError:
            pass

    # Event handlers called by group_send

    async def chat_message(self, event):
        """Called when a new message is received"""
        message_data = event['message']
        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'message': message_data
        }))

    async def chat_typing(self, event):
        """Called when someone is typing to this user"""
        sender_id = event['sender_id']
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'sender_id': sender_id
        }))

    async def chat_read(self, event):
        """Called when someone read this user's messages"""
        reader_id = event['reader_id']
        await self.send(text_data=json.dumps({
            'type': 'messages_read',
            'reader_id': reader_id
        }))
