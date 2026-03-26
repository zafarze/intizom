import os

settings_path = 'config/settings.py'
with open(settings_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Вставляем WhiteNoise в MIDDLEWARE
for i, line in enumerate(lines):
    if 'django.middleware.security.SecurityMiddleware' in line:
        if 'whitenoise.middleware.WhiteNoiseMiddleware' not in "".join(lines):
            lines.insert(i + 1, "    'whitenoise.middleware.WhiteNoiseMiddleware',\n")
        break

# Проверяем STATIC_ROOT
has_static_root = any('STATIC_ROOT' in line for line in lines)

with open(settings_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
    if not has_static_root:
        f.write("\nimport os\n")
        f.write("if 'BASE_DIR' not in locals():\n")
        f.write("    from pathlib import Path\n")
        f.write("    BASE_DIR = Path(__file__).resolve().parent.parent\n")
        f.write("STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')\n")

print("Настройки settings.py успешно пропатчены!")
