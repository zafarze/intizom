import random
import string
from django.contrib.auth.models import User

# Функция для правильного перевода русских и таджикских букв в латиницу для логина
def transliterate(text):
    mapping = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
        'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
        'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
        'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        # Таджикские буквы
        'ғ': 'gh', 'ӣ': 'i', 'қ': 'q', 'ӯ': 'u', 'ҳ': 'h', 'ҷ': 'j'
    }
    text = text.lower()
    return ''.join(mapping.get(c, c) for c in text if c.isalpha())

def generate_random_password(length=6):
    """Генерирует простой цифровой пароль из 6 символов"""
    return ''.join(random.choices(string.digits, k=length))

def create_user_for_student(student):
    """Создает аккаунт для ученика, если его еще нет"""
    if student.user:
        return None, None # У ученика уже есть аккаунт
    
    # Генерируем логин по формату f.last_name (например, a.jomii)
    first_letter = transliterate(student.first_name)[0] if student.first_name else 's'
    last_name_trans = transliterate(student.last_name) or f"student{student.id}"
    
    base_username = f"{first_letter}.{last_name_trans}"
    username = base_username
    
    # Защита от одинаковых логинов (если в школе два А. Ҷомӣ)
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username}{counter}"
        counter += 1
        
    password = generate_random_password()
    
    # Создаем пользователя в Django
    user = User.objects.create_user(
        username=username,
        password=password,
        first_name=student.first_name,
        last_name=student.last_name
    )
    
    # Привязываем созданного User к ученику
    student.user = user
    student.save(update_fields=['user'])
    
    return username, password