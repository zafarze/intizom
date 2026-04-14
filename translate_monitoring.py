import json
import os
import re

paths = {
    'ru': 'd:/Projects/Intizom/frontend/src/locales/ru/translation.json',
    'en': 'd:/Projects/Intizom/frontend/src/locales/en/translation.json',
    'tg': 'd:/Projects/Intizom/frontend/src/locales/tg/translation.json'
}

keys_to_add = {
    "monitoring": {
        "connecting": {"ru": "Подключение к Live-серверу...", "en": "Connecting to Live Server...", "tg": "Пайвастшавӣ ба сервeри Live..."},
        "server_lost": {"ru": "Связь с сервером потеряна", "en": "Connection to server lost", "tg": "Иртибот бо сервер қатъ шуд"},
        "title": {"ru": "Мониторинг", "en": "Monitoring", "tg": "Мониторинг"},
        "desc": {"ru": "Данные обновляются автоматически каждые 10 секунд", "en": "Data is updated automatically every 10 seconds", "tg": "Маълумот дар ҳар 10 сония ба таври худкор нав мешавад"},
        "class_rating": {"ru": "Рейтинг классов (Сравнение)", "en": "Class Rating (Comparison)", "tg": "Рейтинги синфҳо (Муқоиса)"},
        "no_classes": {"ru": "Классы еще не созданы", "en": "Classes have not been created yet", "tg": "Синфҳо ҳанӯз сохта нашудаанд"},
        "activity_feed": {"ru": "Лента активности", "en": "Activity feed", "tg": "Навори фаъолият"},
        "no_violations": {"ru": "Нарушений нет! Все молодцы.", "en": "No violations! Well done everyone.", "tg": "Қонунвайронкуниҳо нестанд! Ҳама офарин."},
        "class_prefix": {"ru": "Класс", "en": "Class", "tg": "Синфи"},
        "points_short": {"ru": "б.", "en": "pts.", "tg": "х."},
        "just_now": {"ru": "Только что", "en": "Just now", "tg": "Ҳамин ҳоло"},
        "min_ago": {"ru": "мин назад", "en": "min ago", "tg": "дақ пеш"},
        "hours_ago": {"ru": "ч назад", "en": "hours ago", "tg": "hours ago", "tg": "соат пеш"}, # intentional duplicate tg key replaced in json dump later
        "yesterday": {"ru": "Вчера", "en": "Yesterday", "tg": "Дирӯз"}
    }
}
keys_to_add['monitoring']['hours_ago']['tg'] = "соат пеш"

for lang, path in paths.items():
    if not os.path.exists(path): continue
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    if 'monitoring' not in data:
        data['monitoring'] = {}
    for key, trans in keys_to_add['monitoring'].items():
        data['monitoring'][key] = trans[lang]
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

file_path = 'd:/Projects/Intizom/frontend/src/pages/admin/Monitoring.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()


content = content.replace('Подключение к Live-серверу...', "{t('monitoring.connecting')}")
content = content.replace('Связь с сервером потеряна', "{t('monitoring.server_lost')}")
content = content.replace('Мониторинг <span', "{t('monitoring.title')} <span")
content = content.replace('Данные обновляются автоматически каждые 10 секунд', "{t('monitoring.desc')}")
content = content.replace('Рейтинг классов (Сравнение)', "{t('monitoring.class_rating')}")
content = content.replace('Классы еще не созданы', "{t('monitoring.no_classes')}")
content = content.replace('Лента активности', "{t('monitoring.activity_feed')}")
content = content.replace('Нарушений нет! Все молодцы.', "{t('monitoring.no_violations')}")


# Fixing ClassRow
content = content.replace("function ClassRow({ name, score, trend, isUp }: any) {\n\treturn (", """function ClassRow({ name, score, trend, isUp }: any) {
\tconst { t } = useTranslation();
\treturn (""")
content = content.replace('Класс {name}', "{t('monitoring.class_prefix')} {name}")
content = content.replace('{score} б.', "{score} {t('monitoring.points_short')}")

# Update Monitoring function to use getTimeAgo from hook
content = content.replace('const { t } = useTranslation();', """const { t } = useTranslation();
\tconst getTimeAgo = useTimeAgo();""")

# Remove old getTimeAgo and insert new one
old_time_ago = """function getTimeAgo(isoDate: string) {
	const date = new Date(isoDate);
	const now = new Date();
	const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
	const minutes = Math.round(seconds / 60);
	const hours = Math.round(minutes / 60);
	const days = Math.round(hours / 24);

	if (seconds < 60) return 'Только что';
	if (minutes < 60) return `${minutes} мин назад`;
	if (hours < 24) return `${hours} ч назад`;
	if (days === 1) return 'Вчера';
	return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}"""

new_time_ago = """function useTimeAgo() {
\tconst { t, i18n } = useTranslation();
\treturn (isoDate: string) => {
\t\tconst date = new Date(isoDate);
\t\tconst now = new Date();
\t\tconst seconds = Math.round((now.getTime() - date.getTime()) / 1000);
\t\tconst minutes = Math.round(seconds / 60);
\t\tconst hours = Math.round(minutes / 60);
\t\tconst days = Math.round(hours / 24);

\t\tif (seconds < 60) return t('monitoring.just_now');
\t\tif (minutes < 60) return `${minutes} ${t('monitoring.min_ago')}`;
\t\tif (hours < 24) return `${hours} ${t('monitoring.hours_ago')}`;
\t\tif (days === 1) return t('monitoring.yesterday');
\t\t
\t\tlet locale = 'ru-RU';
\t\tif (i18n.language === 'en') locale = 'en-US';
\t\tif (i18n.language === 'tg') locale = 'tg-TJ';
\t\treturn date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
\t};
}"""

content = content.replace(old_time_ago, new_time_ago)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
