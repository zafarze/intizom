import os
import re

files = [
    'frontend/src/components/chat/ChatWidget.tsx',
    'frontend/src/components/layout/Header.tsx',
    'frontend/src/components/layout/MainLayout.tsx',
    'frontend/src/components/layout/Sidebar.tsx',
    'frontend/src/pages/admin/AdminDashboard.tsx',
    'frontend/src/pages/admin/Management.tsx',
    'frontend/src/pages/admin/Monitoring.tsx',
    'frontend/src/pages/admin/Statistics.tsx',
    'frontend/src/pages/admin/management_tabs/RulesTab.tsx',
    'frontend/src/pages/admin/management_tabs/StudentsTab.tsx',
    'frontend/src/pages/admin/management_tabs/SubjectsTab.tsx',
    'frontend/src/pages/admin/management_tabs/TimeTableTab.tsx',
    'frontend/src/pages/admin/management_tabs/YearsTab.tsx',
    'frontend/src/pages/auth/LoginPage.tsx',
    'frontend/src/pages/student/StudentDashboard.tsx',
    'frontend/src/pages/teacher/TeacherDashboard.tsx',
    'frontend/src/pages/teacher/TeacherMyClass.tsx'
]

for filepath in files:
    if not os.path.exists(filepath): continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix placeholder=t(...) to placeholder={t(...)}
    content = re.sub(r'(placeholder)=t\(([^)]+)\)', r'\1={t(\2)}', content)
    
    # Fix title=t(...) to title={t(...)}
    content = re.sub(r'(title)=t\(([^)]+)\)', r'\1={t(\2)}', content)

    # Fix aria-label=t(...)
    content = re.sub(r'(aria-label)=t\(([^)]+)\)', r'\1={t(\2)}', content)
    
    # Fix alt=t(...)
    content = re.sub(r'(alt)=t\(([^)]+)\)', r'\1={t(\2)}', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done fixing JSX properties")
