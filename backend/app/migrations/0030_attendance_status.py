from django.db import migrations, models


def populate_status(apps, schema_editor):
    AttendanceRecord = apps.get_model('app', 'AttendanceRecord')
    AttendanceRecord.objects.filter(is_absent=True).update(status='ABSENT')


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0029_attendancerecord_action_log'),
    ]

    operations = [
        migrations.AddField(
            model_name='attendancerecord',
            name='status',
            field=models.CharField(
                choices=[
                    ('ABSENT', 'Ғоиб (бесабаб)'),
                    ('EXCUSED', 'Иҷозат гирифтааст'),
                    ('LATE', 'Дер омад'),
                    ('SICK', 'Бемор'),
                ],
                db_index=True,
                default='ABSENT',
                max_length=10,
                verbose_name='Ҳолат',
            ),
        ),
        migrations.AddField(
            model_name='attendancerecord',
            name='late_minutes',
            field=models.PositiveIntegerField(blank=True, null=True, verbose_name='Дақиқаҳои дерӣ'),
        ),
        migrations.RunPython(populate_status, noop_reverse),
    ]
