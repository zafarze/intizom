import re

file_path = 'd:/Projects/Intizom/frontend/src/pages/admin/Statistics.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix `label=t(...)`
content = re.sub(r'label=t\((.*?)\)', r'label={t(\1)}', content)
content = re.sub(r'name=t\((.*?)\)', r'name={t(\1)}', content)

# Fix openModal arguments where I broke string interpolation:
# onClick={() => openModal('Образцовые (90-100 {t('stats.bonuses_desc_2')})', 'risk', 'exemplary')}
# should be:
# onClick={() => openModal(t('stats.risk_exemplary'), 'risk', 'exemplary')}

content = content.replace("openModal('Образцовые (90-100 {t('stats.bonuses_desc_2')})', 'risk', 'exemplary')", "openModal(t('stats.risk_exemplary'), 'risk', 'exemplary')")
content = content.replace("openModal('Устное предупреждение (70-89 {t('stats.bonuses_desc_2')})', 'risk', 'verbal')", "openModal(t('stats.risk_verbal'), 'risk', 'verbal')")
content = content.replace("openModal('Письм. предупреждение (45-69 {t('stats.bonuses_desc_2')})', 'risk', 'written')", "openModal(t('stats.risk_written'), 'risk', 'written')")
content = content.replace("openModal('Риск исключения (<45 {t('stats.bonuses_desc_2')})', 'risk', 'risk')", "openModal(t('stats.risk_expulsion'), 'risk', 'risk')")

# Fix string interpolation in strings
# 'Учитель: ' was replaced by "{t('stats.teacher')}: " which means `{t('stats.teacher')}: {log.teacher_name...`
# but it's inside text. No, it's inside React tags, so it should be fine.
content = content.replace(" • {t('stats.teacher')}: ", " • {t('stats.teacher')}: ")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
