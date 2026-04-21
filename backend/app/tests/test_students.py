from django.test import TestCase
from app.models import Student, SchoolClass
from django.contrib.auth.models import User
from rest_framework.test import APIClient

class StudentBulkImportTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_superuser('admin', 'admin@example.com', 'adminpass')
        self.client.force_authenticate(user=self.admin_user)
        self.school_class = SchoolClass.objects.create(name="10А")

    def test_bulk_create_students(self):
        data = {
            "students": [
                {"first_name": "Иван", "last_name": "Иванов", "class_name": "10А"},
                {"first_name": "Петр", "last_name": "Петров", "class_name": "10А"}
            ]
        }
        response = self.client.post('/students/bulk_create_students/', data, format='json')
        # DRF Router endpoints without the base /api/ included in URLs locally? 
        # Actually URLs depends on main urls.py. Let's just test that the student was created if it hits the view 
        # or we just rely on calling the right path.
        if response.status_code == 404:
            # Let's try /api/students if mounted there
            response = self.client.post('/api/students/bulk_create_students/', data, format='json')
        
        self.assertIn(response.status_code, [200, 201])
        self.assertEqual(Student.objects.count(), 2)
