from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()

class AuthTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            phone_number='9886776655',
            username='owner',
            role='OWNER',
            password='password123'
        )

    def test_jwt_login(self):
        # Test obtaining JWT tokens
        response = self.client.post('/api/token/', {
            'phone_number': '9886776655',
            'password': 'password123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
