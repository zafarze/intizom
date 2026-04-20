from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0027_copy_student_names_to_translations'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AttendanceRecord',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(db_index=True, verbose_name='Сана')),
                ('is_absent', models.BooleanField(default=True, verbose_name='Ғоиб аст')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('marked_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='attendance_marked', to=settings.AUTH_USER_MODEL, verbose_name='Қайдкунанда')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attendance_records', to='app.student', verbose_name='Хонанда')),
            ],
            options={
                'verbose_name': 'Иштирок',
                'verbose_name_plural': 'Иштирок дар дарс',
                'ordering': ['-date'],
                'unique_together': {('student', 'date')},
            },
        ),
    ]
