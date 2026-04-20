from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0028_attendancerecord'),
    ]

    operations = [
        migrations.AddField(
            model_name='attendancerecord',
            name='action_log',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='attendance_records',
                to='app.actionlog',
                verbose_name='Сабти журнал',
            ),
        ),
    ]
