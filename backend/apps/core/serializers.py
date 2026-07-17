from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Customer, Driver, Booking, DriverWageLog, FuelLog, Expense, Payment, Maintenance
)

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    username = serializers.CharField(required=False, allow_blank=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'phone_number', 'email', 'first_name', 'last_name', 'full_name', 'role', 'village', 'password')

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def create(self, validated_data):
        password = validated_data.pop('password')
        role = validated_data.get('role', 'CUSTOMER')
        
        # Ensure we have a username, use phone_number if not provided
        if 'username' not in validated_data or not validated_data['username']:
            validated_data['username'] = validated_data['phone_number']

        user = User(**validated_data)
        user.set_password(password)
        user.save()

        # If user is a customer, automatically create or link their Customer profile
        if role == 'CUSTOMER':
            Customer.objects.update_or_create(
                phone=user.phone_number,
                defaults={
                    'name': user.get_full_name() or user.username,
                    'village': user.village or 'Unknown',
                    'user': user
                }
            )
        return user


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'


class DriverSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = '__all__'


class BookingSerializer(serializers.ModelSerializer):
    customer_name = serializers.ReadOnlyField(source='customer.name')
    customer_phone = serializers.ReadOnlyField(source='customer.phone')
    customer_village = serializers.ReadOnlyField(source='customer.village')
    driver_name = serializers.ReadOnlyField(source='driver.name')
    customer = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all(), required=False, allow_null=True)

    def validate(self, attrs):
        # Obtain values from input or existing instance if not provided
        date = attrs.get('date', self.instance.date if self.instance else None)
        time_slot = attrs.get('time_slot', self.instance.time_slot if self.instance else None)
        status = attrs.get('status', self.instance.status if self.instance else 'Pending')

        # Overlap check
        if date and time_slot and status != 'Cancelled':
            overlapping = Booking.objects.filter(
                date=date,
                time_slot=time_slot
            ).exclude(status='Cancelled')

            if self.instance:
                overlapping = overlapping.exclude(id=self.instance.id)

            if overlapping.exists():
                raise serializers.ValidationError({
                    "time_slot": "This time slot is already booked on this date. Please choose another slot or date."
                })

        return attrs

    class Meta:
        model = Booking
        fields = '__all__'
        read_only_fields = ('total_amount',)


class DriverWageLogSerializer(serializers.ModelSerializer):
    driver_name = serializers.ReadOnlyField(source='driver.name')

    class Meta:
        model = DriverWageLog
        fields = '__all__'
        read_only_fields = ('total_amount',)


class FuelLogSerializer(serializers.ModelSerializer):
    driver_name = serializers.ReadOnlyField(source='driver.name')

    class Meta:
        model = FuelLog
        fields = '__all__'
        read_only_fields = ('total_amount',)


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'


class PaymentSerializer(serializers.ModelSerializer):
    customer_name = serializers.ReadOnlyField(source='customer.name')
    customer_phone = serializers.ReadOnlyField(source='customer.phone')

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ('pending_amount',)


class MaintenanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Maintenance
        fields = '__all__'
