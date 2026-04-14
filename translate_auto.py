import json
import re
import os
from deep_translator import GoogleTranslator

# Load strings
with open('untranslated.json', 'r', encoding='utf-8') as f:
    strings = json.load(f)

# Filter strings
clean_strings = []
for s in strings:
    s = s.strip()
    if not s or len(s) < 2: continue
    if '<html' in s or '<div' in s or '</tr>' in s or 'className' in s or '{' in s or '}' in s: continue
    # Skip single word with non-letters
    if not re.search(r'[А-Яа-яЁё]', s): continue
    clean_strings.append(s)

clean_strings = list(set(clean_strings))

print(f"Translating {len(clean_strings)} strings...")

en_translator = GoogleTranslator(source='ru', target='en')
tg_translator = GoogleTranslator(source='ru', target='tg')

translations = {
    'ru': {},
    'en': {},
    'tg': {}
}

def make_key(text):
    # take first 3-4 words, latinize
    words = re.findall(r'[А-Яа-яЁёA-Za-z0-9]+', text)
    key = "_".join(words[:4]).lower()
    
    # Simple transliteration for key names
    ru_map = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    }
    
    latin_key = ''
    for c in key:
        if c in ru_map:
            latin_key += ru_map[c]
        else:
            latin_key += c
    
    return latin_key

for i, text in enumerate(clean_strings):
    key = f"t_{i}_{make_key(text)}"
    try:
        en_text = en_translator.translate(text)
        tg_text = tg_translator.translate(text)
    except Exception as e:
        print("Error translating:", text)
        en_text = text
        tg_text = text
    
    translations['ru'][key] = text
    translations['en'][key] = en_text
    translations['tg'][key] = tg_text
    print(f"[{i+1}/{len(clean_strings)}] {text} -> {en_text}")

# Add to translation.json files
for lang in ['ru', 'en', 'tg']:
    path = f'frontend/src/locales/{lang}/translation.json'
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if 'auto' not in data:
        data['auto'] = {}
    
    data['auto'].update(translations[lang])
    
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Saved translations to JSON files. Now replacing in TSX...")

# Replace in files
files = [
    "frontend/src/components/chat/ChatWidget.tsx",
    "frontend/src/components/layout/Header.tsx",
    "frontend/src/components/layout/MainLayout.tsx",
    "frontend/src/components/layout/Sidebar.tsx",
    "frontend/src/pages/admin/AdminDashboard.tsx",
    "frontend/src/pages/admin/Management.tsx",
    "frontend/src/pages/admin/Monitoring.tsx",
    "frontend/src/pages/admin/Statistics.tsx",
    "frontend/src/pages/admin/management_tabs/RulesTab.tsx",
    "frontend/src/pages/admin/management_tabs/StudentsTab.tsx",
    "frontend/src/pages/admin/management_tabs/SubjectsTab.tsx",
    "frontend/src/pages/admin/management_tabs/TimeTableTab.tsx",
    "frontend/src/pages/admin/management_tabs/YearsTab.tsx",
    "frontend/src/pages/auth/LoginPage.tsx",
    "frontend/src/pages/student/StudentDashboard.tsx",
    "frontend/src/pages/teacher/TeacherDashboard.tsx",
    "frontend/src/pages/teacher/TeacherMyClass.tsx"
]

def replace_in_file(filepath):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    for key, text in translations['ru'].items():
        # Replace >Текст< with >{t('auto.key')}<
        content = content.replace(f">{text}<", f">{{t('auto.{key}')}}<")
        content = content.replace(f"> {text} <", f"> {{t('auto.{key}')}} <")
        
        # Replace "Текст" with t('auto.key')
        content = content.replace(f'"{text}"', f"t('auto.{key}')")
        content = content.replace(f"'{text}'", f"t('auto.{key}')")
        content = content.replace(f"`{text}`", f"t('auto.{key}')")

    if original != content:
        # Check if useTranslation is imported
        if 'useTranslation' not in content:
            # We can't automatically insert hook because we don't know the component name, but we can add the import and let user fix
            content = "import { useTranslation } from 'react-i18next';\n" + content
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Replaced strings in {filepath}")

for f in files:
    replace_in_file(f)

print("Done!")
