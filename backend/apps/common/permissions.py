"""Reusable DRF permissions.

Every class here answers one question about `request.user.role`. They are kept
small and composable rather than folded into the views, because an authorisation
rule buried in a view is a rule nobody reviews.

Two conventions worth knowing:

* `has_permission` gates the endpoint; `has_object_permission` gates the row.
  DRF only calls the second via `get_object()`, so a viewset that builds its own
  queryset must still filter by owner — a permission class cannot save a list
  endpoint that returns everything.
* Anonymous callers are rejected before any attribute is read. `AnonymousUser`
  has no `role`, and a `getattr(user, "role", None)` that quietly returns `None`
  is exactly how an unauthenticated request slips past a careless check.
"""

from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsStaffUserRole(BasePermission):
    """Staff, manager or admin. The floor for the admin console."""

    message = "This endpoint is restricted to hotel staff."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.is_staff_member)


class IsManagerUserRole(BasePermission):
    """Manager or admin — anything touching money, rates or cancellations."""

    message = "This endpoint is restricted to managers."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.is_manager)


class IsAdminUserRole(BasePermission):
    """Administrators only — user management and the audit trail."""

    message = "This endpoint is restricted to administrators."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.is_admin_role)


class IsOwnerOrAdmin(BasePermission):
    """Object-level: the row's owner, or any staff member.

    `owner_field` lets a view point at whichever FK holds the user; it defaults
    to `guest`, which is what `Reservation` uses.
    """

    message = "You can only access your own records."
    owner_field = "guest"

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj) -> bool:
        user = request.user
        if not (user and user.is_authenticated):
            return False

        # Staff see everything; that is what the console is for.
        if user.is_staff_member:
            return True

        field = getattr(view, "owner_field", self.owner_field)
        owner = getattr(obj, field, None)

        # A row with no owner — a phone booking taken at the front desk — belongs
        # to staff, not to everybody. Denying it explicitly avoids a None == None
        # comparison handing it to the first guest who guesses the reference.
        return owner is not None and owner == user


class ReadOnlyOrStaff(BasePermission):
    """Public reads, staff writes. For content the site displays anonymously."""

    def has_permission(self, request, view) -> bool:
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        return bool(user and user.is_authenticated and user.is_staff_member)
