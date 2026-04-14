import json
import os

locales = {
    'ru': {},
    'en': {},
    'tg': {}
}

management_data = {
    'tabs': {
        'years': {'ru': 'Учебный год', 'en': 'Academic Year', 'tg': 'Соли хониш'},
        'timetable': {'ru': 'Расписание', 'en': 'Timetable', 'tg': 'Ҷадвал'},
        'subjects': {'ru': 'Предметы', 'en': 'Subjects', 'tg': 'Фанҳо'},
        'classes': {'ru': 'Классы', 'en': 'Classes', 'tg': 'Синфҳо'},
        'teachers': {'ru': 'Учителя', 'en': 'Teachers', 'tg': 'Омӯзгорон'},
        'students': {'ru': 'Ученики', 'en': 'Students', 'tg': 'Хонандагон'},
        'rules': {'ru': 'Правила (СИН)', 'en': 'Rules (SIN)', 'tg': 'Қоидаҳо (СИН)'}
    },
    'common': {
        'create': {'ru': 'Создать', 'en': 'Create', 'tg': 'Сохтан'},
        'add': {'ru': 'Добавить', 'en': 'Add', 'tg': 'Илова кардан'},
        'save': {'ru': 'Сохранить', 'en': 'Save', 'tg': 'Захира кардан'},
        'saving': {'ru': 'Сохранение...', 'en': 'Saving...', 'tg': 'Захира мешавад...'},
        'cancel': {'ru': 'Отмена', 'en': 'Cancel', 'tg': 'Бекор кардан'},
        'close': {'ru': 'Закрыть', 'en': 'Close', 'tg': 'Пӯшидан'},
        'edit': {'ru': 'Редактировать', 'en': 'Edit', 'tg': 'Таҳрир кардан'},
        'delete': {'ru': 'Удалить', 'en': 'Delete', 'tg': 'Нест кардан'},
        'actions': {'ru': 'Действия', 'en': 'Actions', 'tg': 'Амалҳо'},
        'table_no': {'ru': '№', 'en': 'No.', 'tg': '№'},
        'status': {'ru': 'Статус', 'en': 'Status', 'tg': 'Ҳолат'},
        'search': {'ru': 'Поиск...', 'en': 'Search...', 'tg': 'Ҷустуҷӯ...'},
        'search_count': {'ru': 'Поиск ({{count}})...', 'en': 'Search ({{count}})...', 'tg': 'Ҷустуҷӯ ({{count}})...'},
        'confirm_delete': {'ru': 'Удалить?', 'en': 'Delete?', 'tg': 'Нест кунем?'},
        'deleted': {'ru': 'Удалено', 'en': 'Deleted', 'tg': 'Нест карда шуд'},
        'saved': {'ru': 'Сохранено', 'en': 'Saved', 'tg': 'Захира шуд'},
        'error': {'ru': 'Ошибка', 'en': 'Error', 'tg': 'Хатогӣ'},
        'attention': {'ru': 'Внимание', 'en': 'Attention', 'tg': 'Диққат'},
        'confirm': {'ru': 'Подтвердить', 'en': 'Confirm', 'tg': 'Тасдиқ кардан'},
        'loading': {'ru': 'Загрузка данных...', 'en': 'Loading data...', 'tg': 'Боргирии маълумот...'},
        'error_loading': {'ru': 'Ошибка загрузки данных', 'en': 'Error loading data', 'tg': 'Хатогӣ ҳангоми боргирии маълумот'}
    },
    'years': {
        'title': {'ru': 'Учебные годы', 'en': 'Academic Years', 'tg': 'Солҳои хониш'},
        'table_year': {'ru': 'Учебный год', 'en': 'Academic Year', 'tg': 'Соли хониш'},
        'status_completed': {'ru': 'Завершен', 'en': 'Completed', 'tg': 'Анҷомёфта'},
        'status_active': {'ru': 'Активный', 'en': 'Active', 'tg': 'Фаъол'},
        'status_inactive': {'ru': 'Неактивный', 'en': 'Inactive', 'tg': 'Ғайрифаъол'},
        'status_waiting': {'ru': 'Ожидает', 'en': 'Waiting', 'tg': 'Дар интизор'},
        'status_planned': {'ru': 'Запланирован', 'en': 'Planned', 'tg': 'Ба нақша гирифташуда'},
        'quarters_title': {'ru': 'Четверти (Чорякҳо)', 'en': 'Quarters', 'tg': 'Чорякҳо'},
        'quarters_desc': {'ru': 'Периоды внутри учебного года', 'en': 'Periods within the academic year', 'tg': 'Давраҳо дар дохили соли хониш'},
        'table_quarter': {'ru': 'Четверть', 'en': 'Quarter', 'tg': 'Чоряк'},
        'table_period': {'ru': 'Период', 'en': 'Period', 'tg': 'Давра'},
        'q_status_current': {'ru': 'Текущая', 'en': 'Current', 'tg': 'Ҷорӣ'},
        'q_status_archive': {'ru': 'Архив', 'en': 'Archive', 'tg': 'Бойгонӣ'},
        'modal_add_year': {'ru': 'Добавить учебный год', 'en': 'Add academic year', 'tg': 'Иловаи соли хониш'},
        'modal_edit_year': {'ru': 'Редактировать учебный год', 'en': 'Edit academic year', 'tg': 'Таҳрири соли хониш'},
        'year_placeholder': {'ru': 'Например: 2025-2026', 'en': 'e.g. 2025-2026', 'tg': 'Масалан: 2025-2026'},
        'make_active': {'ru': 'Сделать этот год активным', 'en': 'Make this year active', 'tg': 'Ин солро фаъол кунед'},
        'modal_add_quarter': {'ru': 'Добавить четверть', 'en': 'Add quarter', 'tg': 'Иловаи чоряк'},
        'modal_edit_quarter': {'ru': 'Редактировать четверть', 'en': 'Edit quarter', 'tg': 'Таҳрири чоряк'},
        'q_desc_auto': {'ru': 'Учебный год определится автоматически по датам', 'en': 'Academic year is determined automatically by dates', 'tg': 'Соли хониш аз рӯи санаҳо худкор муайян мешавад'},
        'q_name': {'ru': 'Название', 'en': 'Name', 'tg': 'Ном'},
        'q_start': {'ru': 'Начало', 'en': 'Start', 'tg': 'Оғоз'},
        'q_end': {'ru': 'Конец', 'en': 'End', 'tg': 'Анҷом'},
        'q_year_auto': {'ru': 'Учебный год:', 'en': 'Academic year:', 'tg': 'Соли хониш:'},
        'q_auto_hint': {'ru': '(автоматически)', 'en': '(automatically)', 'tg': '(худкор)'},
        'q_make_active': {'ru': 'Текущая (Активная) четверть', 'en': 'Current (Active) quarter', 'tg': 'Чоряки ҷорӣ (Фаъол)'},
        'delete_year_confirm': {'ru': 'Удалить этот учебный год?', 'en': 'Delete this academic year?', 'tg': 'Ин соли хониш нест карда шавад?'},
        'delete_quarter_confirm': {'ru': 'Удалить эту четверть?', 'en': 'Delete this quarter?', 'tg': 'Ин чоряк нест карда шавад?'}
    },
    'classes': {
        'create_class': {'ru': 'Создать класс', 'en': 'Create class', 'tg': 'Синф сохтан'},
        'table_name': {'ru': 'Название', 'en': 'Name', 'tg': 'Ном'},
        'table_students_count': {'ru': 'Кол-во учеников', 'en': 'Students count', 'tg': 'Миқдори хонандагон'},
        'table_class_teacher': {'ru': 'Классный руководитель', 'en': 'Class teacher', 'tg': 'Роҳбари синф'},
        'count_people': {'ru': 'чел.', 'en': 'people', 'tg': 'нафар'},
        'no_teacher': {'ru': 'Без классного руководителя', 'en': 'No class teacher', 'tg': 'Бе роҳбари синф'},
        'modal_class': {'ru': 'Класс', 'en': 'Class', 'tg': 'Синф'},
        'modal_class_placeholder': {'ru': 'Например: 10 А', 'en': 'e.g. 10 A', 'tg': 'Масалан: 10 А'}
    },
    'subjects': {
        'create_subject': {'ru': 'Создать предмет', 'en': 'Create subject', 'tg': 'Фан сохтан'},
        'table_subject_name': {'ru': 'Название предмета', 'en': 'Subject name', 'tg': 'Номи фан'},
        'table_teachers': {'ru': 'Учителя', 'en': 'Teachers', 'tg': 'Омӯзгорон'},
        'modal_edit_subject': {'ru': 'Редактировать предмет', 'en': 'Edit subject', 'tg': 'Таҳрири фан'},
        'modal_add_subject': {'ru': 'Добавить предмет', 'en': 'Add subject', 'tg': 'Иловаи фан'},
        'delete_subject_confirm': {'ru': 'Удалить этот предмет?', 'en': 'Delete this subject?', 'tg': 'Ин фан нест карда шавад?'},
        'msg_subject_deleted': {'ru': 'Предмет удален', 'en': 'Subject deleted', 'tg': 'Фан нест карда шуд'},
        'modal_teachers_title': {'ru': 'Учителя', 'en': 'Teachers', 'tg': 'Омӯзгорон'},
        'modal_teachers_desc': {'ru': 'Предмет:', 'en': 'Subject:', 'tg': 'Фан:'},
        'no_teachers': {'ru': 'Нет учителей', 'en': 'No teachers', 'tg': 'Омӯзгорон нестанд'},
        'no_teachers_desc': {'ru': 'К этому предмету еще не привязан ни один учитель', 'en': 'No teacher is assigned to this subject yet', 'tg': 'Ба ин фан ҳеҷ як омӯзгор вобаста нашудааст'},
        'login': {'ru': 'Логин:', 'en': 'Login:', 'tg': 'Логин:'},
        'placeholder_ru': {'ru': 'Например: Математика', 'en': 'e.g. Mathematics', 'tg': 'Масалан: Математика'},
        'placeholder_tg': {'ru': 'Например: Риёзиёт', 'en': 'e.g. Mathematics (TG)', 'tg': 'Масалан: Риёзиёт'},
        'placeholder_en': {'ru': 'Например: Mathematics', 'en': 'e.g. Mathematics', 'tg': 'Масалан: Mathematics'}
    },
    'rules': {
        'add_rule': {'ru': 'Добавить правило', 'en': 'Add rule', 'tg': 'Иловаи қоида'},
        'table_category': {'ru': 'Категория', 'en': 'Category', 'tg': 'Категория'},
        'table_rule_name': {'ru': 'Название правила', 'en': 'Rule name', 'tg': 'Номи қоида'},
        'table_points': {'ru': 'Баллы', 'en': 'Points', 'tg': 'Холҳо'},
        'table_type': {'ru': 'Тип (Wiegt)', 'en': 'Type', 'tg': 'Намуд'},
        'modal_rule': {'ru': 'Правило', 'en': 'Rule', 'tg': 'Қоида'},
        'placeholder_desc_ru': {'ru': 'Описание (напр. Опоздание)', 'en': 'Description (RU)', 'tg': 'Тавсиф (бо русӣ)'},
        'placeholder_desc_tg': {'ru': 'Описание (на таджикском)', 'en': 'Description (TG)', 'tg': 'Тавсиф (бо тоҷикӣ)'},
        'placeholder_desc_en': {'ru': 'Описание (на английском)', 'en': 'Description (EN)', 'tg': 'Тавсиф (бо англисӣ)'},
        'auto_translate_tooltip': {'ru': 'Авто-перевод (AI)', 'en': 'Auto-translate (AI)', 'tg': 'Тарҷумаи худкор (AI)'},
        'cat_a': {'ru': 'Мелкие', 'en': 'Minor', 'tg': 'Хурд'},
        'cat_b': {'ru': 'Средние', 'en': 'Moderate', 'tg': 'Миёна'},
        'cat_c': {'ru': 'Тяжкие', 'en': 'Serious', 'tg': 'Вазнин'},
        'cat_d': {'ru': 'Особо тяжкие', 'en': 'Severe', 'tg': 'Ниҳоят вазнин'},
        'cat_bonus': {'ru': 'Бонус', 'en': 'Bonus', 'tg': 'Бонус'},
        'type_single': {'ru': 'Одиночное (Single)', 'en': 'Single', 'tg': 'Якакарата'},
        'type_multiple': {'ru': 'Многократное (Multiple)', 'en': 'Multiple', 'tg': 'Бисёркарата'},
        'auto_translate_error': {'ru': 'Ошибка при переводе. Проверьте настройки AI.', 'en': 'Translation error. Check AI settings.', 'tg': 'Хатогии тарҷума. Танзимоти AI-ро санҷед.'}
    },
    'students': {
        'generate_accounts': {'ru': 'Выдать доступы', 'en': 'Issue Accesses', 'tg': 'Додани дастрасӣ'},
        'generating': {'ru': 'Генерация...', 'en': 'Generating...', 'tg': 'Дар ҳоли тавлид...'},
        'import': {'ru': 'Импорт', 'en': 'Import', 'tg': 'Воридот'},
        'empty_students_title': {'ru': 'Список учеников пуст', 'en': 'Student list is empty', 'tg': 'Рӯйхати хонандагон холӣ аст'},
        'empty_students_desc_search': {'ru': 'По вашему поисковому запросу ничего не найдено.', 'en': 'Nothing found for your search query.', 'tg': 'Аз рӯи дархости ҷустуҷӯии шумо чизе ёфт нашуд.'},
        'empty_students_desc_filter': {'ru': 'Пожалуйста, выберите параллель и класс на панели справа, чтобы начать работу с учениками.', 'en': 'Please select a grade and class in the right panel to start working with students.', 'tg': 'Лутфан, аз панели тарафи рост параллел ва синфро интихоб кунед, то ки бо хонандагон корро оғоз намоед.'},
        'table_fullname': {'ru': 'ФИО ученика', 'en': 'Student Full Name', 'tg': 'Ному насаби хонанда'},
        'table_class': {'ru': 'Класс', 'en': 'Class', 'tg': 'Синф'},
        'table_score_sin': {'ru': 'Балл СИН', 'en': 'SIN Score', 'tg': 'Холи СИН'},
        'table_login': {'ru': 'Логин', 'en': 'Login', 'tg': 'Логин'},
        'table_password': {'ru': 'Пароль', 'en': 'Password', 'tg': 'Парол'},
        'page_of': {'ru': 'Стр. {{current}} из {{total}}', 'en': 'Page {{current}} of {{total}}', 'tg': 'Саҳ. {{current}} аз {{total}}'},
        'filter_title': {'ru': 'Фильтр', 'en': 'Filter', 'tg': 'Филтр'},
        'stats_total': {'ru': 'Всего в школе', 'en': 'Total in school', 'tg': 'Ҳамагӣ дар мактаб'},
        'stats_in_classes': {'ru': 'В {{grade}}-х классах', 'en': 'In {{grade}}th grades', 'tg': 'Дар синфҳои {{grade}}'},
        'stats_selected_classes': {'ru': 'Выбрано классов: {{count}}', 'en': 'Classes selected: {{count}}', 'tg': 'Синфҳои интихобшуда: {{count}}'},
        'stats_in_class': {'ru': 'В {{class}} классе', 'en': 'In {{class}} class', 'tg': 'Дар синфи {{class}}'},
        'stats_students_word': {'ru': 'учеников', 'en': 'students', 'tg': 'хонандагон'},
        'filter_grade': {'ru': 'Параллель', 'en': 'Grade', 'tg': 'Параллел'},
        'filter_letter': {'ru': 'Буква класса', 'en': 'Class Letter', 'tg': 'Ҳарфи синф'},
        'no_data': {'ru': 'Нет данных', 'en': 'No data', 'tg': 'Маълумот нест'},
        'reset_filters': {'ru': 'Сбросить фильтры', 'en': 'Reset filters', 'tg': 'Тоза кардани филтрҳо'},
        'bulk_selected': {'ru': 'Выбрано', 'en': 'Selected', 'tg': 'Интихоб шуд'},
        'bulk_reset_passwords': {'ru': 'Сбросить доступы (PDF)', 'en': 'Reset Access (PDF)', 'tg': 'Барқарори дастрасӣ (PDF)'},
        'bulk_pdf_logins': {'ru': 'PDF логины', 'en': 'PDF Logins', 'tg': 'Логинҳо PDF'},
        'bulk_excel': {'ru': 'Excel', 'en': 'Excel', 'tg': 'Excel'},
        'bulk_change_class': {'ru': 'Сменить класс', 'en': 'Change class', 'tg': 'Ивази синф'},
        'modal_new_class': {'ru': 'Выберите новый класс', 'en': 'Select new class', 'tg': 'Синфи навро интихоб кунед'},
        'select_class_placeholder': {'ru': 'Выберите класс из списка', 'en': 'Select class from list', 'tg': 'Синфро аз рӯйхат интихоб кунед'},
        'btn_transfer': {'ru': 'Перевести', 'en': 'Transfer', 'tg': 'Гузаронидан'},
        'modal_edit_student': {'ru': 'Редактировать ученика', 'en': 'Edit student', 'tg': 'Таҳрири хонанда'},
        'modal_add_student': {'ru': 'Добавить ученика', 'en': 'Add student', 'tg': 'Иловаи хонанда'},
        'placeholder_firstname': {'ru': 'Имя', 'en': 'First Name', 'tg': 'Ном'},
        'placeholder_lastname': {'ru': 'Фамилия', 'en': 'Last Name', 'tg': 'Насаб'},
        'login_data': {'ru': 'Данные для входа (Опционально)', 'en': 'Login data (Optional)', 'tg': 'Маълумот барои вуруд (Ихтиёрӣ)'},
        'login_placeholder': {'ru': 'Логин (например: a.ivanov)', 'en': 'Login (e.g. a.ivanov)', 'tg': 'Логин (масалан: a.ivanov)'},
        'new_password_placeholder': {'ru': 'Новый пароль', 'en': 'New password', 'tg': 'Пароли нав'},
        'password_hint': {'ru': 'Оставьте пустым, если не хотите менять пароль.', 'en': "Leave empty if you don't want to change password.", 'tg': 'Агар паролро иваз кардан нахоҳед, холӣ гузоред.'},
        'modal_import_title': {'ru': 'Импорт учеников', 'en': 'Import Students', 'tg': 'Воридоти хонандагон'},
        'import_click_to_change': {'ru': 'Нажмите чтобы изменить', 'en': 'Click to change', 'tg': 'Барои иваз кардан пахш кунед'},
        'import_drag_drop': {'ru': 'Выберите файл или перетащите', 'en': 'Choose file or drag & drop', 'tg': 'Файлро интихоб кунед ё кашед'},
        'import_supported': {'ru': 'Поддерживаются .xlsx, .xls, .csv', 'en': 'Supported .xlsx, .xls, .csv', 'tg': 'Форматҳои .xlsx, .xls, .csv дастгирӣ мешаванд'},
        'btn_template': {'ru': 'Шаблон', 'en': 'Template', 'tg': 'Шаблон'},
        'btn_upload': {'ru': 'Загрузить', 'en': 'Upload', 'tg': 'Боргузорӣ'},
        'modal_accounts_title': {'ru': 'Доступы учеников ({{count}})', 'en': 'Student Accesses ({{count}})', 'tg': 'Дастрасии хонандагон ({{count}})'},
        'accounts_hint': {'ru': 'Обязательно сохраните их, пароли больше нигде не отобразятся!', 'en': "Make sure to save them, passwords won't be shown anywhere else!", 'tg': 'Ҳатман онҳоро нигоҳ доред, паролҳо дигар дар ҳеҷ ҷо намоиш дода намешаванд!'},
        'download_pdf': {'ru': 'Скачать в PDF', 'en': 'Download as PDF', 'tg': 'Боргирӣ ба PDF'},
        'history_points': {'ru': 'Баллы:', 'en': 'Points:', 'tg': 'Холҳо:'},
        'history_status': {'ru': 'Статус:', 'en': 'Status:', 'tg': 'Ҳолат:'},
        'history_changes': {'ru': 'История изменений', 'en': 'Change History', 'tg': 'Таърихи тағирот'},
        'history_empty_title': {'ru': 'История пуста', 'en': 'History is empty', 'tg': 'Таърих холӣ аст'},
        'history_empty_desc': {'ru': 'Никаких событий не зафиксировано', 'en': 'No events recorded', 'tg': 'Ягон ҳодиса сабт нашудааст'},
        'generate_acc_success': {'ru': 'Аккаунты сгенерированы', 'en': 'Accounts generated', 'tg': 'Аккаунтҳо тавлид шуданд'},
        'bulk_delete_confirm': {'ru': 'Вы уверены, что хотите безвозвратно удалить {{count}} учеников? Экспорт паролей не удалит, а только стерёт их из базы!', 'en': "Are you sure you want to permanently delete {{count}} students? Exporting passwords won't delete them, this will erase them from the database!", 'tg': 'Шумо мутмаин ҳастед, ки {{count}} хонандаро бебозгашт нест кунед? Содироти паролҳо онҳоро нест намекунад, ин танҳо аз махзан тоза мекунад!'},
        'bulk_reset_confirm': {'ru': 'ВНИМАНИЕ! Вы сбросите текущие пароли у {{count}} учеников и сгенерируете новые. Старые пароли будут потеряны навсегда. Продолжить?', 'en': 'ATTENTION! You will reset current passwords for {{count}} students and generate new ones. Old passwords will be lost forever. Continue?', 'tg': 'ДИҚҚАТ! Шумо паролҳои ҷории {{count}} хонандаро барқарор мекунед ва нав тавлид мекунед. Паролҳои кӯҳна абадан нест мешаванд. Идома медиҳед?'},
        'cancel_log_confirm': {'ru': 'Вы уверены, что хотите отменить это действие? Записи будут удалены, а баллы ученика пересчитаны.', 'en': 'Are you sure you want to cancel this action? Records will be deleted and student points recalculated.', 'tg': 'Шумо мутмаин ҳастед, ки ин амалро бекор кунед? Сабтҳо нест карда мешаванд ва холҳои хонанда аз нав ҳисоб карда мешаванд.'}
    },
    'teachers': {
        'table_fullname': {'ru': 'ФИО Учителя', 'en': 'Teacher Full Name', 'tg': 'Ному насаби омӯзгорон'},
        'table_subjects': {'ru': 'Предметы', 'en': 'Subjects', 'tg': 'Фанҳо'},
        'table_class_leader': {'ru': 'Кл. Рук.', 'en': 'Class Leader', 'tg': 'Роҳбари синф'},
        'table_login': {'ru': 'Логин', 'en': 'Login', 'tg': 'Логин'},
        'modal_add_teacher': {'ru': 'Добавить учителя', 'en': 'Add teacher', 'tg': 'Иловаи омӯзгор'},
        'modal_edit_teacher': {'ru': 'Редактировать учителя', 'en': 'Edit teacher', 'tg': 'Таҳрири омӯзгор'},
        'subjects_label': {'ru': 'ПРЕДМЕТЫ', 'en': 'SUBJECTS', 'tg': 'ФАНҲО'},
        'class_leader_label': {'ru': 'КЛАССНОЕ РУКОВОДСТВО', 'en': 'CLASS LEADERSHIP', 'tg': 'РОҲБАРИИ СИНФ'},
        'reset_password_confirm': {'ru': 'Сбросить пароль для {{name}} на "123456"?', 'en': 'Reset password for {{name}} to "123456"?', 'tg': 'Паролро барои {{name}} ба "123456" барқарор кунем?'},
        'password_reset_success': {'ru': 'Пароль сброшен 🔑', 'en': 'Password reset 🔑', 'tg': 'Парол барқарор шуд 🔑'}
    },
    'timetable': {
        'title': {'ru': 'Расписание звонков', 'en': 'Bell Schedule', 'tg': 'Ҷадвали зангҳо'},
        'lessons_count': {'ru': '{{count}} уроков в расписании', 'en': '{{count}} lessons in schedule', 'tg': '{{count}} дарс дар ҷадвал'},
        'add_lesson': {'ru': 'Добавить урок', 'en': 'Add lesson', 'tg': 'Иловаи дарс'},
        'empty_title': {'ru': 'Расписание пустое', 'en': 'Schedule is empty', 'tg': 'Ҷадвал холӣ аст'},
        'empty_desc': {'ru': 'Нажмите "Добавить урок" чтобы начать', 'en': 'Click "Add lesson" to start', 'tg': 'Барои оғоз кардан "Иловаи дарс"-ро пахш кунед'},
        'lunch_break': {'ru': 'Обеденный перерыв', 'en': 'Lunch break', 'tg': 'Танаффуси хӯроки нисфирӯзӣ'},
        'duration_label': {'ru': 'Длительность', 'en': 'Duration', 'tg': 'Давомнокӣ'},
        'duration_val': {'ru': '{{mins}} мин', 'en': '{{mins}} min', 'tg': '{{mins}} дақ'},
        'duration_hr': {'ru': '{{hours}} ч {{mins}} мин', 'en': '{{hours}} h {{mins}} m', 'tg': '{{hours}} с {{mins}} дақ'},
        'break_min': {'ru': 'Перемена {{mins}} мин', 'en': 'Break {{mins}} min', 'tg': 'Танаффус {{mins}} дақ'},
        'lesson_label': {'ru': 'УРОК', 'en': 'LESSON', 'tg': 'ДАРС'},
        'start_label': {'ru': 'Начало', 'en': 'Start', 'tg': 'Оғоз'},
        'end_label': {'ru': 'Конец', 'en': 'End', 'tg': 'Анҷом'},
        'modal_add_lesson': {'ru': 'Добавить урок', 'en': 'Add lesson', 'tg': 'Иловаи дарс'},
        'modal_edit_lesson': {'ru': 'Редактировать урок', 'en': 'Edit lesson', 'tg': 'Таҳрири дарс'},
        'modal_lesson_desc': {'ru': 'Укажите номер и время звонков', 'en': 'Specify lesson number and bell times', 'tg': 'Рақам ва вақти зангҳоро муайян кунед'},
        'lesson_number': {'ru': 'Номер урока', 'en': 'Lesson number', 'tg': 'Рақами дарс'},
        'delete_lesson_confirm': {'ru': 'Удалить этот урок из расписания?', 'en': 'Delete this lesson from schedule?', 'tg': 'Ин дарс аз ҷадвал нест карда шавад?'}
    }
}

base_path = 'frontend/src/locales'

for lang in locales.keys():
    filepath = os.path.join(base_path, lang, 'translation.json')
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # Create management group
        management_dict = {}
        for section, translations in management_data.items():
            management_dict[section] = {}
            for key, val in translations.items():
                management_dict[section][key] = val[lang]
                
        data['management'] = management_dict
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
print("Locales updated successfully.")
