import os
import sys
import django
import datetime

# Configure Django settings
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.core.models import (
    Customer, Driver, Booking, DriverWageLog, FuelLog, Expense, Payment, Maintenance
)

User = get_user_model()

def clear_db():
    print("Clearing database...")
    User.objects.all().delete()
    Customer.objects.all().delete()
    Driver.objects.all().delete()
    Booking.objects.all().delete()
    DriverWageLog.objects.all().delete()
    FuelLog.objects.all().delete()
    Expense.objects.all().delete()
    Payment.objects.all().delete()
    Maintenance.objects.all().delete()

def seed_db():
    print("Seeding database with mock data...")

    # 1. Create Owner Profile
    owner = User.objects.create_user(
        phone_number='9964808647',
        username='owner',
        email='owner@gmail.com',
        first_name='Yoganna',
        last_name='Owner',
        role='OWNER',
        village='Hirehali',
        password='yoganna'
    )
    print("Created owner user.")
    print("Database seeding completed successfully!")

if __name__ == '__main__':
    clear_db()
    seed_db()
