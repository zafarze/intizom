import json
import os

paths = {
    'ru': 'd:/Projects/Intizom/frontend/src/locales/ru/translation.json',
    'en': 'd:/Projects/Intizom/frontend/src/locales/en/translation.json',
    'tg': 'd:/Projects/Intizom/frontend/src/locales/tg/translation.json'
}

keys_to_add = {
    "stats": {
        "analyzing_data": {"ru": "Анализ данных...", "en": "Analyzing data...", "tg": "Таҳлили маълумот..."},
        "server_error": {"ru": "Ошибка связи с сервером", "en": "Server connection error", "tg": "Хатогии пайвастшавӣ ба сервeр"},
        "try_again": {"ru": "Попробовать снова", "en": "Try again", "tg": "Аз нав кӯшиш кунед"},
        "loading_data": {"ru": "Загрузка данных...", "en": "Loading data...", "tg": "Боркунии маълумот..."},
        "no_data": {"ru": "Нет данных для отображения", "en": "No data to display", "tg": "Маълумот барои намоиш нест"},
        "unknown": {"ru": "Неизвестно", "en": "Unknown", "tg": "Номаълум"},
        "teacher": {"ru": "Учитель", "en": "Teacher", "tg": "Омӯзгор"},
        "class_not_specified": {"ru": "Класс не указан", "en": "Class not specified", "tg": "Синф муайян нашудааст"},
        "page_title": {"ru": "Статистика дисциплины", "en": "Discipline statistics", "tg": "Омори интизом"},
        "page_subtitle": {"ru": "Детальный анализ нарушений и поощрений", "en": "Detailed analysis of violations and rewards", "tg": "Таҳлили муфассали қонунвайронкуниҳо ва ҳавасмандкуниҳо"},
        "violations_by_group": {"ru": "Нарушения по группам", "en": "Violations by groups", "tg": "Қонунвайронкуниҳо аз рӯи гурӯҳҳо"},
        "group_a": {"ru": "Группа А (Мелкие)", "en": "Group A (Minor)", "tg": "Гурӯҳи А (Хурд)"},
        "group_b": {"ru": "Группа Б (Средние)", "en": "Group B (Medium)", "tg": "Гурӯҳи Б (Миёна)"},
        "group_c": {"ru": "Группа В (Серьезные)", "en": "Group C (Serious)", "tg": "Гурӯҳи В (Ҷиддӣ)"},
        "group_d": {"ru": "Группа Г (Особо тяжкие)", "en": "Group D (Severe)", "tg": "Гурӯҳи Г (Хеле вазнин)"},
        "risk_levels_title": {"ru": "Уровни риска учеников", "en": "Student risk levels", "tg": "Сатҳи хатари хонандагон"},
        "risk_exemplary": {"ru": "Образцовые (90-100 баллов)", "en": "Exemplary (90-100 points)", "tg": "Намунавӣ (90-100 хол)"},
        "risk_verbal": {"ru": "Устное предупреждение (70-89 баллов)", "en": "Verbal warning (70-89 points)", "tg": "Огоҳии шифоҳӣ (70-89 хол)"},
        "risk_written": {"ru": "Письм. предупреждение (45-69 баллов)", "en": "Written warning (45-69 points)", "tg": "Огоҳии хаттӣ (45-69 хол)"},
        "risk_expulsion": {"ru": "Риск исключения (<45 баллов)", "en": "Risk of expulsion (<45 points)", "tg": "Хатари хориҷшавӣ (<45 хол)"},
        "bonuses_title": {"ru": "Поощрения (Бонусы)", "en": "Rewards (Bonuses)", "tg": "Ҳавасмандгардонӣ (Бонусҳо)"},
        "bonuses_desc_1": {"ru": "В этом месяце начислено", "en": "Accrued this month", "tg": "Дар ин моҳ зиёд карда шуд"},
        "bonuses_desc_2": {"ru": "баллов", "en": "points", "tg": "хол"},
        "bonuses_desc_3": {"ru": "за хорошие поступки и достижения.", "en": "for good deeds and achievements.", "tg": "барои рафтори хуб ва дастовардҳо."},
        "more_details": {"ru": "Подробнее", "en": "More details", "tg": "Муфассал"},
        "trend_title": {"ru": "Тренд поведения школы (последние 6 месяцев)", "en": "School behavior trend (last 6 months)", "tg": "Тамоюли рафтори мактаб (6 моҳи охир)"},
        "trend_bonuses": {"ru": "Поощрения (+)", "en": "Rewards (+)", "tg": "Ҳавасмандгардонӣ (+)"},
        "trend_violations": {"ru": "Нарушения (-)", "en": "Violations (-)", "tg": "Қонунвайронкуниҳо (-)"},
        "top_worst": {"ru": "Топ-10 нарушителей", "en": "Top 10 violators", "tg": "Топ 10 қонуншиканон"},
        "top_best": {"ru": "Топ-10 лучших учеников", "en": "Top 10 given students", "tg": "Топ 10 беҳтаринҳо"},
        "pride_title": {"ru": "Ифтихори мактаб (300+ хол)", "en": "School Pride (300+ points)", "tg": "Ифтихори мактаб (300+ хол)"},
        "pride_subtitle": {"ru": "Номзадҳо барои экскурсия ва имтиёзҳо (Гордость школы)", "en": "Candidates for excursions and privileges (School Pride)", "tg": "Номзадҳо барои экскурсия ва имтиёзҳо (Ифтихори мактаб)"},
        "class_prefix": {"ru": "Синфи", "en": "Class", "tg": "Синфи"},
        "points": {"ru": "хол", "en": "points", "tg": "хол"},
        "pride_empty": {"ru": "Ҳоло чунин хонандагон нестанд (Пока нет отличников с 300+ баллами)", "en": "No excellent students with 300+ points yet", "tg": "Ҳоло чунин хонандагон нестанд"},
        "cases": {"ru": "случаев", "en": "cases", "tg": "ҳолатҳо"},
        "points_short": {"ru": "б.", "en": "pts.", "tg": "х."},
        "close": {"ru": "Закрыть", "en": "Close", "tg": "Пӯшидан"}
    }
}

for lang, path in paths.items():
    if not os.path.exists(path): continue
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    if 'stats' not in data:
        data['stats'] = {}
    for key, trans in keys_to_add['stats'].items():
        data['stats'][key] = trans[lang]
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

file_path = 'd:/Projects/Intizom/frontend/src/pages/admin/Statistics.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    'Анализ данных...': "{t('stats.analyzing_data')}",
    'Ошибка связи с сервером': "{t('stats.server_error')}",
    'Попробовать снова': "{t('stats.try_again')}",
    'Загрузка данных...': "{t('stats.loading_data')}",
    'Нет данных для отображения': "{t('stats.no_data')}",
    "Учитель: ": "{t('stats.teacher')}: ",
    "'Неизвестно'": "t('stats.unknown')",
    "'Класс не указан'": "t('stats.class_not_specified')",
    'Статистика дисциплины': "{t('stats.page_title')}",
    'Детальный анализ нарушений и поощрений': "{t('stats.page_subtitle')}",
    'Нарушения по группам': "{t('stats.violations_by_group')}",
    '"Группа А (Мелкие)"': "t('stats.group_a')",
    '"Группа Б (Средние)"': "t('stats.group_b')",
    '"Группа В (Серьезные)"': "t('stats.group_c')",
    '"Группа Г (Особо тяжкие)"': "t('stats.group_d')",
    'Уровни риска учеников': "{t('stats.risk_levels_title')}",
    '"Образцовые (90-100 баллов)"': "t('stats.risk_exemplary')",
    '"Устное предупреждение (70-89 баллов)"': "t('stats.risk_verbal')",
    '"Письм. предупреждение (45-69 баллов)"': "t('stats.risk_written')",
    '"Риск исключения (<45 баллов)"': "t('stats.risk_expulsion')",
    'Поощрения (Бонусы)': "{t('stats.bonuses_title')}",
    'В этом месяце начислено': "{t('stats.bonuses_desc_1')}",
    'баллов': "{t('stats.bonuses_desc_2')}",
    'за хорошие поступки и достижения.': "{t('stats.bonuses_desc_3')}",
    'Подробнее': "{t('stats.more_details')}",
    'Тренд поведения школы (последние 6 месяцев)': "{t('stats.trend_title')}",
    '"Поощрения (+)"': "t('stats.trend_bonuses')",
    '"Нарушения (-)"': "t('stats.trend_violations')",
    'Топ-10 нарушителей': "{t('stats.top_worst')}",
    'Топ-10 лучших учеников': "{t('stats.top_best')}",
    'Ифтихори мактаб (300+ хол)': "{t('stats.pride_title')}",
    'Номзадҳо барои экскурсия ва имтиёзҳо (Гордость школы)': "{t('stats.pride_subtitle')}",
    'Синфи ': "{t('stats.class_prefix')} ",
    'хол': "{t('stats.points')}",
    'Ҳоло чунин хонандагон нестанд (Пока нет отличников с 300+ баллами)': "{t('stats.pride_empty')}",
    ' случаев': " {t('stats.cases')}",
    ' б.': " {t('stats.points_short')}",
    'Закрыть': "{t('stats.close')}",
    'label="Группа А (Мелкие)"': "label={t('stats.group_a')}",
    'label="Группа Б (Средние)"': "label={t('stats.group_b')}",
    'label="Группа В (Серьезные)"': "label={t('stats.group_c')}",
    'label="Группа Г (Особо тяжкие)"': "label={t('stats.group_d')}",
    'label="Образцовые (90-100 баллов)"': "label={t('stats.risk_exemplary')}",
    'label="Устное предупреждение (70-89 баллов)"': "label={t('stats.risk_verbal')}",
    'label="Письм. предупреждение (45-69 баллов)"': "label={t('stats.risk_written')}",
    'label="Риск исключения (<45 баллов)"': "label={t('stats.risk_expulsion')}"
}

for old, new in replacements.items():
    content = content.replace(old, new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
