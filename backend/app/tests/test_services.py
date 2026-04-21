from django.test import TestCase
from app.models import Student, SchoolClass
from app.services import create_user_for_student, transliterate, generate_random_password

class ServicesTestCase(TestCase):
    def test_transliterate(self):
        self.assertEqual(transliterate("Алишер"), "alisher")
        self.assertEqual(transliterate("Ҷомӣ"), "jomi")

    def test_generate_random_password(self):
        pwd = generate_random_password(8)
        self.assertEqual(len(pwd), 8)

    def test_create_user_for_student(self):
        school_class = SchoolClass.objects.create(name="10А")
        # Set points to default 100 explicitly if needed, but the model has default=100
        student = Student.objects.create(first_name="Ахмад", last_name="Азизов", school_class=school_class)
        
        username, password = create_user_for_student(student)
        
        self.assertIsNotNone(username)
        self.assertIsNotNone(password)
        self.assertEqual(username, "ahmad.azizov")
        
        student.refresh_from_db()
        self.assertIsNotNone(student.user)
