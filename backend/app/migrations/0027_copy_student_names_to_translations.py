from django.db import migrations


def copy_student_names(apps, schema_editor):
    Student = apps.get_model('app', 'Student')
    students = Student.objects.using(schema_editor.connection.alias).filter(
        first_name__isnull=False
    ).exclude(first_name='')

    to_update = []
    for s in students:
        changed = False
        for lang_field in ('first_name_ru', 'first_name_tg', 'first_name_en'):
            if not getattr(s, lang_field):
                setattr(s, lang_field, s.first_name)
                changed = True
        for lang_field in ('last_name_ru', 'last_name_tg', 'last_name_en'):
            if not getattr(s, lang_field):
                setattr(s, lang_field, s.last_name)
                changed = True
        if changed:
            to_update.append(s)

    if to_update:
        Student.objects.using(schema_editor.connection.alias).bulk_update(
            to_update,
            ['first_name_ru', 'first_name_tg', 'first_name_en',
             'last_name_ru', 'last_name_tg', 'last_name_en'],
        )


def reverse_copy(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0026_alter_actionlog_created_at_alter_message_created_at_and_more'),
    ]

    operations = [
        migrations.RunPython(copy_student_names, reverse_copy),
    ]
