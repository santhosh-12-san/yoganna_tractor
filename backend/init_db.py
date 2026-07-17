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
        phone_number='9886776655',
        username='owner',
        email='owner@gmail.com',
        first_name='Yoganna',
        last_name='Owner',
        role='OWNER',
        village='Hirehali',
        password='password'
    )
    print("Created owner user.")

    # 2. Create Customers
    cust_data = [
        {"name": "Ramesh Patil", "phone": "9980776655", "village": "Hirehali", "user": True},
        {"name": "Shankar Babu", "phone": "9900112233", "village": "Yeshwantpur", "user": True},
        {"name": "Mahesh Gowda", "phone": "9886776644", "village": "Magedi", "user": True},
        {"name": "Suresh Kumar", "phone": "9886776633", "village": "Wagadi", "user": False},
        {"name": "Ravi", "phone": "9886776622", "village": "Magadi", "user": False},
        {"name": "Nandini", "phone": "9886776611", "village": "Tumkur", "user": False},
    ]

    customers = {}
    for idx, c in enumerate(cust_data):
        u_profile = None
        if c["user"]:
            u_profile = User.objects.create_user(
                phone_number=c["phone"],
                username=c["name"].lower().replace(" ", "_"),
                email=f"{c['name'].lower().replace(' ', '')}@gmail.com",
                first_name=c["name"].split()[0],
                last_name=c["name"].split()[1],
                role='CUSTOMER',
                village=c["village"],
                password='password'
            )
        
        cust = Customer.objects.create(
            name=c["name"],
            phone=c["phone"],
            village=c["village"],
            user=u_profile
        )
        customers[c["name"]] = cust
    print("Created customers.")

    # 3. Create Drivers
    driver_data = [
        {"name": "Nagaraj", "phone": "9980776655", "village": "Hirehali", "daily_wage": 600.00},
        {"name": "Mahadeva", "phone": "9900112233", "village": "Yeshwantpur", "daily_wage": 600.00},
        {"name": "Shivanna", "phone": "9886776644", "village": "Magedi", "daily_wage": 600.00},
        {"name": "Kumar", "phone": "7799886655", "village": "Nelamangala", "daily_wage": 600.00},
        {"name": "Prakash", "phone": "7788554433", "village": "Tumkur", "daily_wage": 600.00},
    ]

    drivers = {}
    for d in driver_data:
        drv = Driver.objects.create(
            name=d["name"],
            phone=d["phone"],
            village=d["village"],
            daily_wage=d["daily_wage"],
            is_active=True
        )
        drivers[d["name"]] = drv
    print("Created drivers.")
    print("Created drivers.")
    print("Database seeding completed successfully!")

if __name__ == '__main__':
    clear_db()
    seed_db()
