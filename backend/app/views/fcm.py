from rest_framework import status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from app.models import FCMDevice

class FCMTokenRegisterView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({"error": "Token is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Обновляем или создаем токен для пользователя
        FCMDevice.objects.update_or_create(
            token=token,
            defaults={'user': request.user}
        )
        return Response({"success": "Token registered"}, status=status.HTTP_200_OK)
