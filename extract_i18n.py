import os
import re
import json

files = [
    "frontend/src/App.tsx",
    "frontend/src/main.tsx",
    "frontend/src/api/axios.ts",
    "frontend/src/api/syncQueue.ts",
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
    "frontend/src/pages/teacher/TeacherMyClass.tsx",
    "frontend/src/firebase.ts"
]

all_strings = set()

def extract_strings(filepath):
    if not os.path.exists(filepath):
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove single line comments
    content = re.sub(r'//.*', '', content)
    # Remove multi-line comments
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    
    # Find quotes strings
    quote_pattern = re.compile(r'(["\'`])(.*?)\1', flags=re.DOTALL)
    for match in quote_pattern.finditer(content):
        s = match.group(2)
        if re.search(r'[А-Яа-яЁё]', s) and not re.search(r'\$', s):
            all_strings.add(s.strip())

    # Find JSX text like > Текст <
    jsx_pattern = re.compile(r'>\s*([^<]*?[А-Яа-яЁё][^<]*?)\s*<', flags=re.DOTALL)
    for match in jsx_pattern.finditer(content):
        s = match.group(1)
        if '{' not in s and '}' not in s:
            all_strings.add(s.strip())

for f in files:
    extract_strings(f)

print(f"Found {len(all_strings)} strings.")
with open('untranslated.json', 'w', encoding='utf-8') as f:
    json.dump(list(all_strings), f, ensure_ascii=False, indent=2)
