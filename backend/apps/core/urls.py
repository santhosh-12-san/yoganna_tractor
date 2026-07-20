from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, CurrentUserView, ChangePasswordView, CustomerViewSet, DriverViewSet, BookingViewSet,
    DriverWageLogViewSet, FuelLogViewSet, ExpenseViewSet, PaymentViewSet, MaintenanceViewSet,
    DashboardSummaryView, ReportsView
)

router = DefaultRouter()
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'drivers', DriverViewSet, basename='driver')
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'wages', DriverWageLogViewSet, basename='wage')
router.register(r'fuel', FuelLogViewSet, basename='fuel')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'maintenance', MaintenanceViewSet, basename='maintenance')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('me/', CurrentUserView.as_view(), name='current-user'),
    path('me/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('dashboard/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard-summary-alt'),
    path('reports/', ReportsView.as_view(), name='reports'),
    path('', include(router.urls)),
]
