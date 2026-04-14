import re
import os

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

def fix_file(filepath):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if we injected the import
    if "import { useTranslation } from 'react-i18next';" not in content:
        return
        
    if "const { t } = useTranslation();" in content:
        return
        
    print(f"Fixing {filepath}...")
    
    # Try to find functional component definitions
    pattern1 = re.compile(r'(export\s+(?:default\s+)?function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{)')
    pattern2 = re.compile(r'(export\s+(?:const|let|var)\s+[A-Za-z0-9_]+\s*=\s*(?:React\.FC<[^>]+>\s*)?=\s*\([^)]*\)\s*(?::\s*[^{]+)?=>\s*\{)')
    
    match = pattern1.search(content)
    if not match:
        match = pattern2.search(content)
        
    if match:
        insert_pos = match.end()
        content = content[:insert_pos] + "\n  const { t } = useTranslation();\n" + content[insert_pos:]
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  -> Fixed {filepath}")
    else:
        print(f"  -> Could not find component definition in {filepath}")

for f in files:
    fix_file(f)

print("Done fixing.")
