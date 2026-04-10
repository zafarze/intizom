import os
import re

filepath = r'd:/Projects/Intizom/frontend/src/pages/admin/AdminDashboard.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace import
content = content.replace(
    "import { useNavigate } from 'react-router-dom';",
    "import { useNavigate } from 'react-router-dom';\nimport { useTranslation } from 'react-i18next';"
)

# Remove the outer SLIDES definition
outer_slides = """const SLIDES = [
	{
		id: 1,
		type: 'image',
		src: 'https://media.tenor.com/JaS6UyBMXtEAAAAC/tc-classmate.gif', 
		title: 'Добро пожаловать!',
		desc: 'Интеллектуальная система контроля. Следите за дисциплиной и управляйте школой.'
	},
	{
		id: 2,
		type: 'image',
		src: 'https://media.tenor.com/CXSAcNItAF8AAAAC/yes-blippi.gif',
		title: 'Управление успеваемостью',
		desc: 'Теперь вы можете выдавать оценки и контролировать успеваемость учеников наравне с учителями.'
	},
	{
		id: 3,
		type: 'image',
		src: 'https://media.tenor.com/7Z37gFSTJPcAAAAC/happy-children%27s-day-mighty-little-bheem.gif',
		title: 'Управляйте будущим',
		desc: 'Создавайте комфортные условия для учебы и радуйтесь успехам детей вместе с нами!'
	}
];"""
content = content.replace(outer_slides, "")

# Add t declaration and inner SLIDES definition
inner_insert = """export default function AdminDashboard() {
	const navigate = useNavigate();
	const { t } = useTranslation();

	const SLIDES = [
		{
			id: 1,
			type: 'image',
			src: 'https://media.tenor.com/JaS6UyBMXtEAAAAC/tc-classmate.gif', 
			title: t('dashboard.slides.welcome.title'),
			desc: t('dashboard.slides.welcome.desc')
		},
		{
			id: 2,
			type: 'image',
			src: 'https://media.tenor.com/CXSAcNItAF8AAAAC/yes-blippi.gif',
			title: t('dashboard.slides.performance.title'),
			desc: t('dashboard.slides.performance.desc')
		},
		{
			id: 3,
			type: 'image',
			src: 'https://media.tenor.com/7Z37gFSTJPcAAAAC/happy-children%27s-day-mighty-little-bheem.gif',
			title: t('dashboard.slides.future.title'),
			desc: t('dashboard.slides.future.desc')
		}
	];
"""
content = content.replace(
    "export default function AdminDashboard() {\n\tconst navigate = useNavigate();",
    inner_insert
)

# Text replacements inside JSX
replacements = {
    "'Система включена'": "t('dashboard.system_online')",
    ">Отчет<": ">{t('dashboard.report')}<",
    ">Оценить ученика<": ">{t('dashboard.grade_student')}<",
    "title=\"Всего учеников\"": "title={t('dashboard.total_students')}",
    "subtitle=\"В базе данных\"": "subtitle={t('dashboard.in_database')}",
    "title=\"Средний балл\"": "title={t('dashboard.average_score')}",
    ">Live<": ">{t('dashboard.live')}<",
    "subtitle=\"По всей школе\"": "subtitle={t('dashboard.across_school')}",
    "title=\"Нарушения\"": "title={t('dashboard.violations')}",
    "subtitle=\"За всё время\"": "subtitle={t('dashboard.all_time')}",
    "title=\"Риск исключения\"": "title={t('dashboard.risk_exclusion')}",
    ">Нужен педсовет<": ">{t('dashboard.council_needed')}<",
    "subtitle=\"Баллы < 25\"": "subtitle={t('dashboard.points_under_25')}",
    ">Последние серьезные нарушения<": ">{t('dashboard.recent_violations')}<",
    ">Смотреть все<": ">{t('dashboard.view_all')}<",
    ">УЧЕНИК<": ">{t('dashboard.table_student')}<",
    ">КЛАСС<": ">{t('dashboard.table_class')}<",
    ">НАРУШЕНИЕ<": ">{t('dashboard.table_violation')}<",
    ">БАЛЛ<": ">{t('dashboard.table_score')}<",
    ">Динамика дисциплины<": ">{t('dashboard.discipline_dynamics')}<",
    ">Средний балл по школе сейчас составляет {stats.averageScore}. Обратите внимание, {stats.riskCount} учеников находятся в зоне риска исключения!<": ">{t('dashboard.discipline_desc').replace('{score}', String(stats.averageScore)).replace('{riskCount}', String(stats.riskCount))}<",
    "<p className=\"text-white/80 font-medium text-[12px]\">Всего учеников</p>": "<p className=\"text-white/80 font-medium text-[12px]\">{t('dashboard.total_students')}</p>",
    "<p className=\"text-white/80 font-medium text-[12px]\">Нарушений всего</p>": "<p className=\"text-white/80 font-medium text-[12px]\">{t('dashboard.violations')}</p>",
    "<p className=\"text-white/80 font-medium text-[12px]\">Зона риска</p>": "<p className=\"text-white/80 font-medium text-[12px]\">{t('dashboard.risk_zone')}</p>",
    ">Уровень дисциплины<": ">{t('dashboard.discipline_level')}<",
    ">Смотреть итоги месяца<": ">{t('dashboard.view_monthly_results')}<"
}

for old, new in replacements.items():
    content = content.replace(old, new)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
