import datetime
import calendar
from django.db.models import Sum, Count
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action

from openpyxl import Workbook
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from .models import (
    Customer, Driver, Booking, DriverWageLog, FuelLog, Expense, Payment, Maintenance
)
from .serializers import (
    UserSerializer, CustomerSerializer, DriverSerializer, BookingSerializer,
    DriverWageLogSerializer, FuelLogSerializer, ExpenseSerializer, PaymentSerializer,
    MaintenanceSerializer
)
from .permissions import IsOwner, IsOwnerOrCustomerSelf
from .consumers import broadcast_dashboard_update

User = get_user_model()

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")

        if not user.check_password(old_password):
            return Response({"detail": "Old password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({"detail": "Password updated successfully."})


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('name')
    serializer_class = CustomerSerializer
    
    def get_serializer_class(self):
        return CustomerSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsOwnerOrCustomerSelf()]
        return [IsOwner()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'OWNER':
            return Customer.objects.all().order_by('name')
        try:
            return Customer.objects.filter(user=user)
        except Exception:
            return Customer.objects.none()

    def perform_create(self, serializer):
        instance = serializer.save()
        broadcast_dashboard_update("CUSTOMER_CREATED", CustomerSerializer(instance).data)

    def perform_update(self, serializer):
        instance = serializer.save()
        broadcast_dashboard_update("CUSTOMER_UPDATED", CustomerSerializer(instance).data)

    def perform_destroy(self, instance):
        data = CustomerSerializer(instance).data
        instance.delete()
        broadcast_dashboard_update("CUSTOMER_DELETED", data)


class DriverViewSet(viewsets.ModelViewSet):
    queryset = Driver.objects.all().order_by('name')
    serializer_class = DriverSerializer
    permission_classes = [IsOwner]

    def perform_create(self, serializer):
        instance = serializer.save()
        broadcast_dashboard_update("DRIVER_CREATED", DriverSerializer(instance).data)

    def perform_update(self, serializer):
        instance = serializer.save()
        broadcast_dashboard_update("DRIVER_UPDATED", DriverSerializer(instance).data)

    def perform_destroy(self, instance):
        data = DriverSerializer(instance).data
        instance.delete()
        broadcast_dashboard_update("DRIVER_DELETED", data)


class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer

    def get_permissions(self):
        return [IsOwnerOrCustomerSelf()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'OWNER':
            return Booking.objects.all().order_by('-date')
        try:
            customer = user.customer_profile
            return Booking.objects.filter(customer=customer).order_by('-date')
        except Customer.DoesNotExist:
            return Booking.objects.none()

    def perform_create(self, serializer):
        # Auto-link customer if requesting user is customer
        if self.request.user.role == 'CUSTOMER':
            try:
                customer = self.request.user.customer_profile
                instance = serializer.save(customer=customer)
            except Customer.DoesNotExist:
                from rest_framework.exceptions import ValidationError
                raise ValidationError("Customer profile missing.")
        else:
            instance = serializer.save()

        # Trigger corresponding unpaid payment log for tracking
        Payment.objects.create(
            date=instance.date,
            customer=instance.customer,
            booking=instance.obj if hasattr(instance, 'obj') else instance,
            total_amount=instance.total_amount,
            paid_amount=instance.advance,
            mode='Cash'
        )
        broadcast_dashboard_update("BOOKING_CREATED", BookingSerializer(instance).data)

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        instance = serializer.save()
        # Sync with Payment
        payment = Payment.objects.filter(booking=instance).first()
        if payment:
            payment.total_amount = instance.total_amount
            payment.save()
        broadcast_dashboard_update("BOOKING_UPDATED", BookingSerializer(instance).data)

        # Dispatch status transition notifications safely
        new_status = instance.status
        if old_status != new_status and instance.customer:
            try:
                from .notifications import send_notification
                cust_name = instance.customer.name
                phone = instance.customer.phone
                work = instance.work_type
                
                if new_status == 'In Progress':
                    drv = instance.driver.name if instance.driver else 'Unassigned'
                    msg = f"Hi {cust_name}, your tractor service request for {work} has started. Driver: {drv}."
                    send_notification(phone, msg, mode='sms')
                    send_notification(phone, msg, mode='whatsapp')
                elif new_status == 'Completed':
                    msg = f"Hi {cust_name}, your {work} work is completed. Total Amount: Rs. {instance.total_amount}. View details at: http://3.86.203.49/bookings"
                    send_notification(phone, msg, mode='sms')
                    send_notification(phone, msg, mode='whatsapp')
                elif new_status == 'Cancelled':
                    msg = f"Hi {cust_name}, your tractor service request for {work} on {instance.date} has been cancelled."
                    send_notification(phone, msg, mode='sms')
                    send_notification(phone, msg, mode='whatsapp')
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Error dispatching status notification: {str(e)}")

        # Check maintenance running hour thresholds on completion
        if new_status == 'Completed':
            from django.db.models import Sum
            total_hours = Booking.objects.filter(status='Completed').aggregate(val=Sum('engine_hours'))['val'] or 0
            
            # Check Maintenance alerts
            for alert in Maintenance.objects.all():
                if alert.next_service_hours:
                    if total_hours >= alert.next_service_hours:
                        alert.status = 'Overdue'
                    elif alert.next_service_hours - total_hours <= 25:
                        alert.status = 'Due Soon'
                    else:
                        alert.status = 'Valid'
                    alert.save()
                    from .serializers import MaintenanceSerializer
                    broadcast_dashboard_update("MAINTENANCE_UPDATED", MaintenanceSerializer(alert).data)

    def perform_destroy(self, instance):
        data = BookingSerializer(instance).data
        Payment.objects.filter(booking=instance).delete()
        instance.delete()
        broadcast_dashboard_update("BOOKING_DELETED", data)


class DriverWageLogViewSet(viewsets.ModelViewSet):
    queryset = DriverWageLog.objects.all().order_by('-date')
    serializer_class = DriverWageLogSerializer
    permission_classes = [IsOwner]

    def perform_create(self, serializer):
        instance = serializer.save()
        # Add to business expenses automatically
        Expense.objects.create(
            date=instance.date,
            category='Wages',
            description=f"Wages for {instance.driver.name} - {instance.days_worked} days",
            amount=instance.total_amount
        )
        broadcast_dashboard_update("WAGE_LOG_CREATED", DriverWageLogSerializer(instance).data)

    def perform_update(self, serializer):
        instance = serializer.save()
        broadcast_dashboard_update("WAGE_LOG_UPDATED", DriverWageLogSerializer(instance).data)

    def perform_destroy(self, instance):
        data = DriverWageLogSerializer(instance).data
        instance.delete()
        broadcast_dashboard_update("WAGE_LOG_DELETED", data)


class FuelLogViewSet(viewsets.ModelViewSet):
    queryset = FuelLog.objects.all().order_by('-date')
    serializer_class = FuelLogSerializer
    permission_classes = [IsOwner]

    def perform_create(self, serializer):
        instance = serializer.save()
        # Add to business expenses automatically
        Expense.objects.create(
            date=instance.date,
            category='Fuel',
            description=f"Fuel refill: {instance.litres}L by {instance.driver.name if instance.driver else 'Owner'}",
            amount=instance.total_amount
        )
        broadcast_dashboard_update("FUEL_LOG_CREATED", FuelLogSerializer(instance).data)

    def perform_update(self, serializer):
        instance = serializer.save()
        broadcast_dashboard_update("FUEL_LOG_UPDATED", FuelLogSerializer(instance).data)

    def perform_destroy(self, instance):
        data = FuelLogSerializer(instance).data
        instance.delete()
        broadcast_dashboard_update("FUEL_LOG_DELETED", data)


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all().order_by('-date')
    serializer_class = ExpenseSerializer
    permission_classes = [IsOwner]

    def perform_create(self, serializer):
        instance = serializer.save()
        broadcast_dashboard_update("EXPENSE_CREATED", ExpenseSerializer(instance).data)

    def perform_update(self, serializer):
        instance = serializer.save()
        broadcast_dashboard_update("EXPENSE_UPDATED", ExpenseSerializer(instance).data)

    def perform_destroy(self, instance):
        data = ExpenseSerializer(instance).data
        instance.delete()
        broadcast_dashboard_update("EXPENSE_DELETED", data)


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer

    def get_permissions(self):
        return [IsOwnerOrCustomerSelf()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'OWNER':
            return Payment.objects.all().order_by('-date')
        try:
            customer = user.customer_profile
            return Payment.objects.filter(customer=customer).order_by('-date')
        except Customer.DoesNotExist:
            return Payment.objects.none()

    def perform_create(self, serializer):
        instance = serializer.save()
        broadcast_dashboard_update("PAYMENT_CREATED", PaymentSerializer(instance).data)

    def perform_update(self, serializer):
        instance = serializer.save()
        broadcast_dashboard_update("PAYMENT_UPDATED", PaymentSerializer(instance).data)

    def perform_destroy(self, instance):
        data = PaymentSerializer(instance).data
        instance.delete()
        broadcast_dashboard_update("PAYMENT_DELETED", data)


class MaintenanceViewSet(viewsets.ModelViewSet):
    queryset = Maintenance.objects.all().order_by('next_due')
    serializer_class = MaintenanceSerializer
    permission_classes = [IsOwner]

    def perform_create(self, serializer):
        instance = serializer.save()
        broadcast_dashboard_update("MAINTENANCE_CREATED", MaintenanceSerializer(instance).data)

    def perform_update(self, serializer):
        instance = serializer.save()
        broadcast_dashboard_update("MAINTENANCE_UPDATED", MaintenanceSerializer(instance).data)

    def perform_destroy(self, instance):
        data = MaintenanceSerializer(instance).data
        instance.delete()
        broadcast_dashboard_update("MAINTENANCE_DELETED", data)


class DashboardSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        today = datetime.date.today()
        start_of_month = today.replace(day=1)

        # -----------------
        # Customer View
        # -----------------
        if user.role == 'CUSTOMER':
            customer, _ = Customer.objects.get_or_create(
                user=user,
                defaults={
                    'name': user.get_full_name() or user.username,
                    'phone': user.phone_number or '0000000000',
                    'village': getattr(user, 'village', 'Karnataka')
                }
            )

            bookings = Booking.objects.filter(customer=customer)
            payments = Payment.objects.filter(customer=customer)

            total_bookings = bookings.count()
            completed_bookings = bookings.filter(status='Completed').count()
            pending_bookings = bookings.filter(status='Pending').count()
            
            total_billed = payments.aggregate(val=Sum('total_amount'))['val'] or 0
            total_paid = payments.aggregate(val=Sum('paid_amount'))['val'] or 0
            total_pending = total_billed - total_paid

            recent_bookings = BookingSerializer(bookings.order_by('-date')[:5], many=True).data

            return Response({
                'role': 'CUSTOMER',
                'summary': {
                    'totalBookings': total_bookings,
                    'completedBookings': completed_bookings,
                    'pendingBookings': pending_bookings,
                    'totalPaid': float(total_paid),
                    'pendingPayment': float(total_pending),
                },
                'recentBookings': recent_bookings
            })

        # -----------------
        # Owner View
        # -----------------
        # Summary KPI details
        total_customers = Customer.objects.count()
        
        today_bookings = Booking.objects.filter(date=today)
        today_bookings_count = today_bookings.count()
        
        # Today's earnings = Sum of paid amounts logged today
        today_earnings = Payment.objects.filter(date=today).aggregate(val=Sum('paid_amount'))['val'] or 0
        
        # Pending payments total
        pending_payments = Payment.objects.aggregate(val=Sum('pending_amount'))['val'] or 0

        # Fuel Expense this month
        fuel_expense = Expense.objects.filter(date__gte=start_of_month, category='Fuel').aggregate(val=Sum('amount'))['val'] or 0
        
        # Maintenance Expense this month
        maint_expense = Expense.objects.filter(date__gte=start_of_month, category='Maintenance').aggregate(val=Sum('amount'))['val'] or 0

        # Total Income this month (total customer payments)
        total_income = Payment.objects.filter(date__gte=start_of_month).aggregate(val=Sum('paid_amount'))['val'] or 0
        
        # Total Expenses this month
        total_expenses = Expense.objects.filter(date__gte=start_of_month).aggregate(val=Sum('amount'))['val'] or 0
        
        # Profit
        net_profit = total_income - total_expenses

        # Income overview over the last 30 days
        thirty_days_ago = today - datetime.timedelta(days=30)
        daily_payments = Payment.objects.filter(date__gte=thirty_days_ago).values('date').annotate(amount=Sum('paid_amount')).order_by('date')
        
        income_chart = []
        # Fill in missing dates to make a smooth chart
        date_map = {dp['date']: float(dp['amount']) for dp in daily_payments}
        curr_date = thirty_days_ago
        while curr_date <= today:
            income_chart.append({
                'date': curr_date.strftime('%Y-%m-%d'),
                'amount': date_map.get(curr_date, 0.0)
            })
            curr_date += datetime.timedelta(days=1)

        # Work Types distribution
        work_types_data = Booking.objects.values('work_type').annotate(count=Count('id'))
        work_types = {item['work_type']: item['count'] for item in work_types_data}
        total_bookings_all = sum(work_types.values()) or 1
        work_types_percentage = {k: round((v / total_bookings_all) * 100, 2) for k, v in work_types.items()}

        # Recent Bookings
        recent_bookings = BookingSerializer(Booking.objects.all().order_by('-id')[:5], many=True).data

        return Response({
            'role': 'OWNER',
            'summary': {
                'totalCustomers': total_customers,
                'todayBookings': today_bookings_count,
                'todayEarnings': float(today_earnings),
                'pendingPayments': float(pending_payments),
                'fuelExpense': float(fuel_expense),
                'maintenanceExpense': float(maint_expense),
                'totalIncome': float(total_income),
                'netProfit': float(net_profit),
            },
            'charts': {
                'incomeOverview': income_chart,
                'workTypes': work_types_percentage
            },
            'recentBookings': recent_bookings
        })


class ReportsView(APIView):
    permission_classes = [IsOwner]

    def get(self, request):
        export_format = request.query_params.get('export')
        if export_format == 'excel':
            return self.export_excel(request)
        elif export_format == 'pdf':
            return self.export_pdf(request)

        report_type = request.query_params.get('type', 'profit')
        today = datetime.date.today()
        start_of_month = today.replace(day=1)

        # Build reports data dictionaries based on selection
        if report_type == 'profit':
            total_income = Payment.objects.aggregate(val=Sum('paid_amount'))['val'] or 0
            total_expenses = Expense.objects.aggregate(val=Sum('amount'))['val'] or 0
            net_profit = total_income - total_expenses
            profit_percentage = round((net_profit / total_income * 100), 2) if total_income > 0 else 0

            # Expense breakdown
            expense_summary = Expense.objects.values('category').annotate(total=Sum('amount'))
            breakdown = {item['category']: float(item['total']) for item in expense_summary}

            # Bookings Summary
            bookings_count = Booking.objects.count()
            completed = Booking.objects.filter(status='Completed').count()
            cancelled = Booking.objects.filter(status='Cancelled').count()
            customers_count = Customer.objects.count()

            # Village analytics
            village_summary = Booking.objects.filter(status='Completed').values('customer__village').annotate(
                total_revenue=Sum('total_amount'),
                total_bookings=Count('id'),
                total_hours=Sum('engine_hours')
            ).order_by('-total_revenue')
            
            villages = [
                {
                    'village': item['customer__village'] or 'Unassigned',
                    'revenue': float(item['total_revenue'] or 0.00),
                    'bookings': item['total_bookings'] or 0,
                    'hours': float(item['total_hours'] or 0.00)
                } for item in village_summary
            ]

            # Real Daily Income calculation for current month
            days_in_month = calendar.monthrange(today.year, today.month)[1]
            daily_payments = Payment.objects.filter(
                date__year=today.year, 
                date__month=today.month
            ).values('date__day').annotate(daily_total=Sum('paid_amount'))
            
            daily_income_map = {item['date__day']: float(item['daily_total'] or 0) for item in daily_payments}
            
            daily_bookings = Booking.objects.filter(
                status='Completed',
                date__year=today.year,
                date__month=today.month
            ).values('date__day').annotate(daily_total=Sum('total_amount'))
            
            for item in daily_bookings:
                d = item['date__day']
                if d not in daily_income_map or daily_income_map[d] == 0:
                    daily_income_map[d] = float(item['daily_total'] or 0)
            
            daily_data = [daily_income_map.get(d, 0.0) for d in range(1, days_in_month + 1)]
            month_total = sum(daily_data)

            return Response({
                'report_type': 'profit',
                'summary': {
                    'totalIncome': float(total_income),
                    'totalExpenses': float(total_expenses),
                    'netProfit': float(net_profit),
                    'profitPercentage': float(profit_percentage)
                },
                'daily_income': {
                    'month_label': today.strftime("%B %Y"),
                    'days_in_month': days_in_month,
                    'total': month_total,
                    'daily_data': daily_data
                },
                'breakdown': breakdown,
                'villages': villages,
                'metrics': {
                    'totalBookings': bookings_count,
                    'completedBookings': completed,
                    'cancelledBookings': cancelled,
                    'totalCustomers': customers_count
                }
            })
            
        elif report_type == 'driver':
            drivers_summary = DriverWageLog.objects.values('driver__name').annotate(
                days=Sum('days_worked'),
                wage=Sum('total_amount'),
                advance=Sum('advance_given')
            )
            return Response({
                'report_type': 'driver',
                'drivers': list(drivers_summary)
            })

        elif report_type == 'expense':
            expenses = Expense.objects.all().order_by('-date')
            return Response({
                'report_type': 'expense',
                'expenses': ExpenseSerializer(expenses[:50], many=True).data
            })

        return Response({"detail": "Invalid report type"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        report_type = request.query_params.get('type', 'profit')
        wb = Workbook()
        ws = wb.active
        ws.title = f"{report_type.capitalize()} Report"

        if report_type == 'profit':
            ws.append(["Yoganna Tractor Works - Profit Report"])
            ws.append([])
            ws.append(["Metric", "Value"])
            total_income = Payment.objects.aggregate(val=Sum('paid_amount'))['val'] or 0
            total_expenses = Expense.objects.aggregate(val=Sum('amount'))['val'] or 0
            net_profit = total_income - total_expenses
            ws.append(["Total Income", float(total_income)])
            ws.append(["Total Expenses", float(total_expenses)])
            ws.append(["Net Profit", float(net_profit)])
            ws.append(["Profit %", round((net_profit / total_income * 100), 2) if total_income > 0 else 0])
        elif report_type == 'expense':
            ws.append(["Date", "Category", "Description", "Amount"])
            expenses = Expense.objects.all().order_by('-date')
            for exp in expenses:
                ws.append([exp.date.strftime('%Y-%m-%d'), exp.category, exp.description, float(exp.amount)])
        else:
            ws.append(["Report Details"])
            ws.append(["Generated on", datetime.date.today().strftime('%Y-%m-%d')])

        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="Yoganna_{report_type}_Report.xlsx"'
        wb.save(response)
        return response

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        report_type = request.query_params.get('type', 'profit')
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Yoganna_{report_type}_Report.pdf"'

        doc = SimpleDocTemplate(response, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []

        # Title
        story.append(Paragraph("Yoganna Tractor Works - Report", styles['Title']))
        story.append(Spacer(1, 20))

        if report_type == 'profit':
            story.append(Paragraph("Profit and Loss Summary", styles['Heading2']))
            story.append(Spacer(1, 10))

            total_income = Payment.objects.aggregate(val=Sum('paid_amount'))['val'] or 0
            total_expenses = Expense.objects.aggregate(val=Sum('amount'))['val'] or 0
            net_profit = total_income - total_expenses

            data = [
                ["Item Description", "Value"],
                ["Total Income (Collections)", f"Rs. {total_income:,.2f}"],
                ["Total Operating Expenses", f"Rs. {total_expenses:,.2f}"],
                ["Net Profit", f"Rs. {net_profit:,.2f}"],
                ["Profit Percentage", f"{round((net_profit / total_income * 100), 2) if total_income > 0 else 0}%"]
            ]
            t = Table(data)
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0e623f')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0,0), (-1,0), 8),
                ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#f5f5f5')),
                ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#dddddd'))
            ]))
            story.append(t)
        else:
            story.append(Paragraph(f"Report: {report_type.capitalize()}", styles['Heading2']))
            story.append(Spacer(1, 10))
            story.append(Paragraph("Details exported successfully.", styles['Normal']))

        doc.build(story)
        return response
