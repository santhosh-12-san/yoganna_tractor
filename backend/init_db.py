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

    # 4. Create Bookings (and matching Payments)
    bookings_data = [
        {"customer": "Ramesh Patil", "date": datetime.date(2025, 6, 20), "work_type": "Ploughing", "acres_hours": 5.0, "rate": 1000.0, "driver": "Nagaraj", "advance": 2000.0, "status": "Completed"},
        {"customer": "Shankar Babu", "date": datetime.date(2025, 6, 20), "work_type": "Rotavator", "acres_hours": 5.0, "rate": 1000.0, "driver": "Mahadeva", "advance": 2000.0, "status": "In Progress"},
        {"customer": "Mahesh Gowda", "date": datetime.date(2025, 6, 19), "work_type": "Transport", "acres_hours": 2.0, "rate": 1500.0, "driver": "Shivanna", "advance": 1000.0, "status": "Completed"},
        {"customer": "Suresh Kumar", "date": datetime.date(2025, 6, 19), "work_type": "Ploughing", "acres_hours": 4.0, "rate": 1000.0, "driver": "Kumar", "advance": 2000.0, "status": "Pending"},
        {"customer": "Ravi", "date": datetime.date(2025, 6, 18), "work_type": "Rotavator", "acres_hours": 6.0, "rate": 1000.0, "driver": "Prakash", "advance": 2000.0, "status": "Completed"},
        {"customer": "Nandini", "date": datetime.date(2025, 6, 18), "work_type": "Rotavator", "acres_hours": 2.0, "rate": 1250.0, "driver": "Nagaraj", "advance": 1000.0, "status": "Completed"},
    ]

    for b in bookings_data:
        drv_obj = drivers.get(b["driver"]) if b["driver"] else None
        cust_obj = customers.get(b["customer"])
        
        booking = Booking.objects.create(
            customer=cust_obj,
            date=b["date"],
            work_type=b["work_type"],
            acres_hours=b["acres_hours"],
            rate_per_unit=b["rate"],
            driver=drv_obj,
            advance=b["advance"],
            status=b["status"]
        )

        # Create corresponding payment details
        # Make total payment equal to booking total_amount
        # Let's say paid = total if completed, else paid = advance
        paid_amt = booking.total_amount if booking.status == 'Completed' else booking.advance
        mode_val = 'Cash' if b["customer"] in ["Ramesh Patil", "Ravi"] else ('UPI' if b["customer"] == "Shankar Babu" else 'Bank')
        
        Payment.objects.create(
            date=booking.date,
            customer=cust_obj,
            booking=booking,
            total_amount=booking.total_amount,
            paid_amount=paid_amt,
            mode=mode_val
        )
    print("Created bookings and initial payments.")

    # 5. Seed Historical Payments to make Total Income match ₹1,25,000 exactly
    # Current payments total is 5000 (Ramesh) + 2000 (Shankar) + 3000 (Mahesh) + 2000 (Suresh) + 6000 (Ravi) + 2500 (Nandini) = 20,500.
    # We need remaining ₹1,04,500 of payments. Let's add them as historical payments
    hist_payments = [
        {"customer": "Ramesh Patil", "date": datetime.date(2025, 6, 10), "total": 45000.00, "paid": 45000.00, "mode": "Bank"},
        {"customer": "Mahesh Gowda", "date": datetime.date(2025, 6, 12), "total": 35000.00, "paid": 35000.00, "mode": "UPI"},
        {"customer": "Shankar Babu", "date": datetime.date(2025, 6, 15), "total": 24500.00, "paid": 24500.00, "mode": "Cash"},
    ]

    for hp in hist_payments:
        Payment.objects.create(
            date=hp["date"],
            customer=customers[hp["customer"]],
            total_amount=hp["total"],
            paid_amount=hp["paid"],
            mode=hp["mode"]
        )
    print("Seeded historical payments to reach total income Rs. 1,25,000.")

    # 6. Seed Driver Wages Logs
    # Nagaraj: 22 days worked * 600 = 13,200. Allowances: 2,200. Total = 15,400. Advance: 2000. Remaining: 2600. Paid: 10,800.
    # Let's seed this driver wage log
    DriverWageLog.objects.create(
        driver=drivers["Nagaraj"],
        date=datetime.date(2025, 6, 15),
        days_worked=22.0,
        daily_wage=600.00,
        allowance=2200.00,
        advance_given=2000.00,
        is_paid=True
    )
    # Another driver log (wages expense)
    DriverWageLog.objects.create(
        driver=drivers["Mahadeva"],
        date=datetime.date(2025, 6, 15),
        days_worked=2.5,
        daily_wage=600.00,
        allowance=0.00,
        advance_given=0.00,
        is_paid=True
    )
    print("Seeded driver wages logs.")

    # 7. Seed Fuel logs
    # Litres: 20, Price: 90. Total: 1800. Meter: 1230
    FuelLog.objects.create(
        date=datetime.date(2025, 6, 20),
        driver=drivers["Nagaraj"],
        litres=20,
        price_per_litre=90.00,
        meter_reading=1230
    )
    FuelLog.objects.create(
        date=datetime.date(2025, 6, 19),
        driver=drivers["Nagaraj"],
        litres=25,
        price_per_litre=90.00,
        meter_reading=1225
    )
    FuelLog.objects.create(
        date=datetime.date(2025, 6, 16),
        driver=drivers["Mahadeva"],
        litres=30,
        price_per_litre=90.00,
        meter_reading=1195
    )
    FuelLog.objects.create(
        date=datetime.date(2025, 6, 14),
        driver=drivers["Shivanna"],
        litres=20,
        price_per_litre=90.00,
        meter_reading=1175
    )
    FuelLog.objects.create(
        date=datetime.date(2025, 6, 12),
        driver=drivers["Nagaraj"],
        litres=25,
        price_per_litre=90.00,
        meter_reading=1150
    )
    print("Seeded fuel logs.")

    # 8. Seed Expenses to sum up to exactly ₹46,850
    # Current expenses created via Signal/Perform create:
    # wages: 15400 + 1500 = 16900
    # fuel: 1800 + 2250 + 2700 + 1800 + 2250 = 10800
    # We have 16900 + 10800 = 27700.
    # We need remaining ₹19,150. Let's add them as direct expenses:
    expenses_data = [
        {"date": datetime.date(2025, 6, 20), "category": "Engine Oil", "desc": "Engine oil change", "amount": 1200.00},
        {"date": datetime.date(2025, 6, 18), "category": "Repair", "desc": "Clutch plate change", "amount": 3500.00},
        {"date": datetime.date(2025, 6, 15), "category": "Tyre", "desc": "Front tyre", "amount": 4000.00},
        {"date": datetime.date(2025, 6, 12), "category": "Maintenance", "desc": "General service", "amount": 2000.00},
        {"date": datetime.date(2025, 6, 10), "category": "Spare Parts", "desc": "Filter set", "amount": 1250.00},
        {"date": datetime.date(2025, 6, 8), "category": "Others", "desc": "Hydraulic pipe repair", "amount": 7200.00}, # adds up to exactly ₹19,150
    ]

    for e in expenses_data:
        Expense.objects.create(
            date=e["date"],
            category='Others' if e["category"] in ['Engine Oil', 'Spare Parts'] else e["category"],
            description=e["desc"],
            amount=e["amount"]
        )
    print("Seeded expenses.")

    # 9. Seed Maintenance alerts
    maint_data = [
        {"item": "Engine Oil Change", "last": datetime.date(2025, 6, 10), "next": datetime.date(2025, 7, 10), "status": "Due Soon"},
        {"item": "General Service", "last": datetime.date(2025, 5, 15), "next": datetime.date(2025, 7, 15), "status": "Due Soon"},
        {"item": "Insurance", "last": datetime.date(2025, 1, 1), "next": datetime.date(2026, 1, 1), "status": "Valid"},
        {"item": "Pollution Certificate", "last": datetime.date(2025, 2, 10), "next": datetime.date(2026, 2, 10), "status": "Valid"},
        {"item": "Tyre Check", "last": datetime.date(2025, 6, 5), "next": datetime.date(2025, 7, 5), "status": "Due Soon"},
    ]

    for m in maint_data:
        Maintenance.objects.create(
            item=m["item"],
            last_done=m["last"],
            next_due=m["next"],
            status=m["status"]
        )
    print("Seeded maintenance data.")
    print("Database seeding completed successfully!")

if __name__ == '__main__':
    clear_db()
    seed_db()
