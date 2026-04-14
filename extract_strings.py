import os
import re
import json

directory = 'd:/Projects/Intizom/frontend/src/pages/admin/management_tabs'
files_to_scan = [os.path.join(directory, f) for f in os.listdir(directory) if f.endswith('.tsx')]
files_to_scan.append('d:/Projects/Intizom/frontend/src/pages/admin/Management.tsx')

res = set()
pattern = re.compile(r'((?:>|[\'"])(?:\s*)?[A-Za-z0-9\s\,\.\!\(\)\-\:\?]*[А-Яа-яЁё][А-Яа-яЁёa-zA-Z0-9\s\,\.\!\(\)\-\:\?]*?(?:<|[\'"]))')
# We need text inside JSX tags or quotes containing at least one Cyrillic char.

def extract_strings(filepath):
    with open(filepath, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Text inside tags >...<
    for match in re.findall(r'>([^<]*[А-Яа-яЁё][^<]*)<', content):
        if match.strip(): res.add(match.strip())
        
    # Text inside single quotes '...'
    for match in re.findall(r"'([^']*[А-Яа-яЁё][^']*)'", content):
        if match.strip(): res.add(match.strip())
        
    # Text inside double quotes "..."
    for match in re.findall(r'"([^"]*[А-Яа-яЁё][^"]*)"', content):
        if match.strip(): res.add(match.strip())
        
    # Text inside backticks `...`
    for match in re.findall(r'`([^`]*[А-Яа-яЁё][^`]*)`', content):
        if match.strip(): res.add(match.strip())

for f in files_to_scan:
    extract_strings(f)

# Sort by length descending to replace longer strings first 
# (to avoid replacing parts of strings if they overlap)
sorted_res = sorted(list(res), key=len, reverse=True)

with open('d:/Projects/Intizom/extracted_strings.json', 'w', encoding='utf-8') as f:
    json.dump(sorted_res, f, ensure_ascii=False, indent=2)

print("Extracted strings: ", len(sorted_res))
