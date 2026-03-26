import os

with open('config/settings.py', 'a', encoding='utf-8') as f:
    f.write("\n\n# --- НАСТРОЙКИ ДЛЯ GOOGLE CLOUD RUN ---\n")
    f.write("CSRF_TRUSTED_ORIGINS = ['https://intizom-backend-776689431155.europe-west3.run.app']\n")
    f.write("SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')\n")
    f.write("STORAGES = {'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'}, 'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage'}}\n")
