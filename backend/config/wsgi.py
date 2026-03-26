"""
WSGI config for config project.
"""

import os

from django.core.wsgi import get_wsgi_application

# ЗДЕСЬ ИСПРАВЛЕНО НА config.settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()