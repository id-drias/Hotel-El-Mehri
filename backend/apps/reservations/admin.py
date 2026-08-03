"""Back-office registration for Reservation requests."""

from django.contrib import admin

from apps.reservations.models import (
    Payment,
    Reservation,
    ReservationRoom,
    RoomAssignment,
)


class ReservationRoomInline(admin.TabularInline):
    model = ReservationRoom
    extra = 0
    autocomplete_fields = ("room",)


class RoomAssignmentInline(admin.TabularInline):
    model = RoomAssignment
    extra = 0
    autocomplete_fields = ("unit",)


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    inlines = [ReservationRoomInline, RoomAssignmentInline, PaymentInline]
    list_display = (
        "reference",
        "last_name",
        "check_in",
        "check_out",
        "status",
        "total_price",
        "source",
    )
    list_filter = ("status", "board", "source", "check_in")
    search_fields = ("reference", "last_name", "first_name", "email", "phone_number")
    date_hierarchy = "check_in"
    autocomplete_fields = ("guest",)

    # `reference` is the guest's handle on their booking and is printed on
    # confirmations; the timestamps are the audit surface. Neither is editable.
    readonly_fields = (
        "reference",
        "created_at",
        "confirmed_at",
        "checked_in_at",
        "checked_out_at",
        "cancelled_at",
    )

    def get_readonly_fields(self, request, obj=None):
        fields = super().get_readonly_fields(request, obj)
        # Status changes carry side effects — releasing units, stamping
        # timestamps, writing the audit trail. Those live in the service layer,
        # so the console is the right place to change status, not this form.
        return (*fields, "status") if obj is not None else fields


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("reservation", "amount", "currency", "status", "method", "captured_at")
    list_filter = ("status", "method", "currency")
    search_fields = ("reservation__reference", "provider_reference")
    autocomplete_fields = ("reservation",)


@admin.register(RoomAssignment)
class RoomAssignmentAdmin(admin.ModelAdmin):
    list_display = ("unit", "reservation", "start_date", "end_date")
    list_filter = ("unit__room",)
    search_fields = ("reservation__reference", "unit__number")
    autocomplete_fields = ("reservation", "unit")
