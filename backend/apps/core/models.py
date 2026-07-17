from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models.signals import post_save
from django.dispatch import receiver

class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('OWNER', 'Owner'),
        ('CUSTOMER', 'Customer'),
    )
    phone_number = models.CharField(max_length=15, unique=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='CUSTOMER')
    village = models.CharField(max_length=100, blank=True, null=True)

    # Use phone_number as username field for authentication
    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = ['username', 'email']

    def __str__(self):
        return f"{self.get_full_name()} ({self.phone_number} - {self.role})"


class Customer(models.Model):
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15, unique=True)
    village = models.CharField(max_length=100)
    user = models.OneToOneField(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='customer_profile')

    def __str__(self):
        return f"{self.name} - {self.village}"


class Driver(models.Model):
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)
    village = models.CharField(max_length=100)
    daily_wage = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Booking(models.Model):
    WORK_TYPE_CHOICES = (
        ('Ploughing', 'Ploughing'),
        ('Rotavator', 'Rotavator'),
        ('Transport', 'Transport'),
        ('Seed Sowing', 'Seed Sowing'),
        ('Others', 'Others'),
    )
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    )
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='bookings')
    date = models.DateField()
    booking_time = models.CharField(max_length=50, default='09:00', null=True, blank=True)
    work_type = models.CharField(max_length=50, choices=WORK_TYPE_CHOICES)
    acres_hours = models.DecimalField(max_digits=10, decimal_places=2)
    rate_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings')
    advance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    notes = models.TextField(blank=True, null=True)
    engine_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    def save(self, *args, **kwargs):
        self.total_amount = self.acres_hours * self.rate_per_unit
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.customer.name} - {self.work_type} ({self.date})"


class DriverWageLog(models.Model):
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='wage_logs')
    date = models.DateField()
    days_worked = models.DecimalField(max_digits=3, decimal_places=1, default=1.0)
    daily_wage = models.DecimalField(max_digits=10, decimal_places=2)
    allowance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    advance_given = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_paid = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        self.total_amount = (self.days_worked * self.daily_wage) + self.allowance
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.driver.name} - {self.date} (Wage: {self.total_amount})"


class FuelLog(models.Model):
    date = models.DateField()
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='fuel_logs')
    litres = models.DecimalField(max_digits=10, decimal_places=2)
    price_per_litre = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    meter_reading = models.IntegerField()

    def save(self, *args, **kwargs):
        self.total_amount = self.litres * self.price_per_litre
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Fuel - {self.date} ({self.litres}L)"


class Expense(models.Model):
    CATEGORY_CHOICES = (
        ('Fuel', 'Fuel'),
        ('Maintenance', 'Maintenance'),
        ('Wages', 'Wages'),
        ('Repair', 'Repair'),
        ('Tyre', 'Tyre'),
        ('Spare Parts', 'Spare Parts'),
        ('Others', 'Others'),
    )
    date = models.DateField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.category} - {self.amount} ({self.date})"


class Payment(models.Model):
    MODE_CHOICES = (
        ('Cash', 'Cash'),
        ('UPI', 'UPI'),
        ('Bank', 'Bank'),
    )
    date = models.DateField()
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='payments')
    booking = models.ForeignKey(Booking, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2)
    pending_amount = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    mode = models.CharField(max_length=20, choices=MODE_CHOICES)

    def save(self, *args, **kwargs):
        self.pending_amount = self.total_amount - self.paid_amount
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Payment - {self.customer.name} ({self.paid_amount} paid)"


class Maintenance(models.Model):
    STATUS_CHOICES = (
        ('Valid', 'Valid'),
        ('Due Soon', 'Due Soon'),
        ('Overdue', 'Overdue'),
    )
    item = models.CharField(max_length=100)
    last_done = models.DateField()
    next_due = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Valid')
    last_service_hours = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    next_service_hours = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return f"{self.item} (Due: {self.next_due})"
