from rest_framework import permissions

class IsOwner(permissions.BasePermission):
    """
    Allows access only to users with the role OWNER.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'OWNER'


class IsOwnerOrCustomerSelf(permissions.BasePermission):
    """
    Owners have full access. Customers have read/write access to their own records only.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Owners can access anything
        if request.user.role == 'OWNER':
            return True

        # Check for customer-specific instances
        # If it's a User model instance itself
        if hasattr(obj, 'role'):
            return obj == request.user

        # If it's a Customer profile
        if hasattr(obj, 'user'):
            return obj.user == request.user

        # If it's a Booking
        if hasattr(obj, 'customer'):
            return obj.customer.user == request.user

        # If it's a Payment
        if hasattr(obj, 'customer'):
            return obj.customer.user == request.user

        return False
