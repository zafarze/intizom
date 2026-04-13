from django.db import migrations

def copy_translations(apps, schema_editor):
    Rule = apps.get_model('app', 'Rule')
    Quarter = apps.get_model('app', 'Quarter')
    Subject = apps.get_model('app', 'Subject')

    # Copy Rule titles
    for rule in Rule.objects.all():
        # If title_tg is empty but we have original title or title_ru
        source_text = rule.title_ru or rule.title
        if source_text:
            if not rule.title_tg:
                rule.title_tg = source_text
            if not rule.title_ru:
                rule.title_ru = source_text
            rule.save()

    # Copy Quarter names
    for quarter in Quarter.objects.all():
        source_text = quarter.name_ru or quarter.name
        if source_text:
            if not quarter.name_tg:
                quarter.name_tg = source_text
            if not quarter.name_ru:
                quarter.name_ru = source_text
            quarter.save()

    # Copy Subject names
    for subject in Subject.objects.all():
        source_text = subject.name_ru or subject.name
        if source_text:
            if not subject.name_tg:
                subject.name_tg = source_text
            if not subject.name_ru:
                subject.name_ru = source_text
            subject.save()

def reverse_copy(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('app', '0023_message_document_file_message_document_name'),
    ]

    operations = [
        migrations.RunPython(copy_translations, reverse_copy),
    ]
