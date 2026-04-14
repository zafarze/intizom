import json
import re
import os

with open('frontend/src/locales/ru/translation.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

translations = data.get('auto', {})

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

for filepath in files:
    if not os.path.exists(filepath): continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    for key, text in translations.items():
        if text in ['auto', 't']: continue
        
        # 1. JSX text: >Текст< to >{t('auto.key')}<
        content = content.replace(f">{text}<", f">{{t('auto.{key}')}}<")
        content = content.replace(f"> {text} <", f"> {{t('auto.{key}')}} <")
        
        # 2. Object keys: 'Текст': to [t('auto.key')]:
        content = content.replace(f"'{text}':", f"[t('auto.{key}')]:")
        content = content.replace(f'"{text}":', f"[t('auto.{key}')]:")
        # Also handle without quotes if it was somehow valid (rare for cyrillic, but possible)
        
        # 3. String props: prop="Текст" to prop={t('auto.key')}
        content = re.sub(rf'(\w+)="{re.escape(text)}"', rf"\1={{t('auto.{key}')}}", content)
        content = re.sub(rf"(\w+)='{re.escape(text)}'", rf"\1={{t('auto.{key}')}}", content)
        
        # 4. Standalone string literals: "Текст" to t('auto.key')
        # Negative lookahead for colon to avoid matching object keys
        content = re.sub(rf'(?<!\w)"{re.escape(text)}"(?!\s*:)', rf"t('auto.{key}')", content)
        content = re.sub(rf"(?<!\w)'{re.escape(text)}'(?!\s*:)", rf"t('auto.{key}')", content)
        content = re.sub(rf"(?<!\w)`{re.escape(text)}`(?!\s*:)", rf"t('auto.{key}')", content)

    if original != content:
        # Add import
        if 'useTranslation' not in content:
            content = "import { useTranslation } from 'react-i18next';\n" + content
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Replaced strings in {filepath}")

print("Done smart replacement.")
