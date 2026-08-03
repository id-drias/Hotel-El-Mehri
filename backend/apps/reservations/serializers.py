"""DRF serializers for reservations.

Validation lives at three levels and each catches a different class of mistake:

* field-level (``validate_<field>``) — one value in isolation
* object-level (``validate``) — relationships between fields, e.g. date order
* the service layer — anything needing a database lock, e.g. availability

Availability is deliberately *not* checked here. A serializer check runs outside
the transaction, so it can pass and be stale by the time the row is written.
``services.create_reservation`` re-checks under a row lock.
"""

from __future__ import annotations

import datetime as dt

from django.utils import timezone
from rest_framework import serializers

from apps.reservations.models import Payment, Reservation, ReservationRoom, RoomAssignment
from apps.rooms.models import Room

#: A stay longer than this is almost always a typo in the year.
MAX_STAY_NIGHTS = 30
#: How far ahead the hotel accepts bookings.
MAX_LEAD_DAYS = 730


class ReservationRoomSerializer(serializers.ModelSerializer):
    room_slug = serializers.SlugRelatedField(
        source="room", slug_field="slug", queryset=Room.objects.all()
    )

    class Meta:
        model = ReservationRoom
        fields = ("room_slug", "quantity", "unit_price")
        read_only_fields = ("unit_price",)


class RoomAssignmentSerializer(serializers.ModelSerializer):
    unit_number = serializers.CharField(source="unit.number", read_only=True)
    room_slug = serializers.CharField(source="unit.room.slug", read_only=True)

    class Meta:
        model = RoomAssignment
        fields = ("id", "unit_number", "room_slug", "start_date", "end_date")


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ("id", "amount", "currency", "status", "method", "captured_at")
        read_only_fields = fields


class ReservationReadSerializer(serializers.ModelSerializer):
    """What a guest gets back. No internal fields."""

    nights = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    rooms = ReservationRoomSerializer(many=True, read_only=True)

    class Meta:
        model = Reservation
        fields = (
            "reference",
            "full_name",
            "email",
            "phone_number",
            "check_in",
            "check_out",
            "nights",
            "adults",
            "children",
            "board",
            "message",
            "status",
            "total_price",
            "rooms",
            "created_at",
        )
        read_only_fields = fields


class StaffReservationSerializer(ReservationReadSerializer):
    """Console view: adds assignments, payments, VIP flag and the balance."""

    assignments = RoomAssignmentSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    is_vip = serializers.BooleanField(read_only=True)
    balance_due = serializers.SerializerMethodField()

    class Meta(ReservationReadSerializer.Meta):
        fields = (
            *ReservationReadSerializer.Meta.fields,
            "is_vip",
            "source",
            "language",
            "assignments",
            "payments",
            "balance_due",
            "confirmed_at",
            "checked_in_at",
            "checked_out_at",
            "cancelled_at",
            "cancellation_reason",
        )
        read_only_fields = fields

    def get_balance_due(self, obj) -> str:
        return str(obj.balance_due())


class ReservationCreateSerializer(serializers.Serializer):
    """Input for a new booking.

    A plain Serializer rather than a ModelSerializer: creation goes through
    ``services.create_reservation``, so there is no ``.save()`` worth
    inheriting, and a ModelSerializer would only invite someone to call it and
    bypass the locking.
    """

    room_slug = serializers.SlugRelatedField(
        slug_field="slug",
        queryset=Room.objects.filter(is_bookable=True),
        help_text="Slug of the room type to book.",
    )
    quantity = serializers.IntegerField(min_value=1, max_value=5, default=1)

    check_in = serializers.DateField()
    check_out = serializers.DateField()

    first_name = serializers.CharField(max_length=80)
    last_name = serializers.CharField(max_length=80)
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=32)

    adults = serializers.IntegerField(min_value=1, max_value=10, default=1)
    children = serializers.IntegerField(min_value=0, max_value=10, default=0)
    board = serializers.ChoiceField(choices=Reservation.Board.choices, default=Reservation.Board.BB)
    message = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    language = serializers.ChoiceField(choices=["fr", "ar", "en"], default="fr")

    # -- field level -------------------------------------------------------

    def validate_check_in(self, value: dt.date) -> dt.date:
        # `timezone.localdate()`, not `date.today()`: the server may run in UTC
        # while the hotel is on Africa/Algiers, and "today" differs between the
        # two for an hour every day.
        today = timezone.localdate()
        if value < today:
            raise serializers.ValidationError("Check-in cannot be in the past.")
        if value > today + dt.timedelta(days=MAX_LEAD_DAYS):
            raise serializers.ValidationError(f"Bookings open {MAX_LEAD_DAYS} days ahead at most.")
        return value

    def validate_phone_number(self, value: str) -> str:
        if sum(character.isdigit() for character in value) < 8:
            raise serializers.ValidationError("Enter a usable phone number.")
        return value.strip()

    def validate_email(self, value: str) -> str:
        return value.lower().strip()

    # -- object level ------------------------------------------------------

    def validate(self, attrs):
        check_in, check_out = attrs["check_in"], attrs["check_out"]

        if check_out <= check_in:
            # Attached to `check_out` so the frontend can highlight that field,
            # rather than a form-level error with nowhere to point.
            raise serializers.ValidationError({"check_out": "Check-out must be after check-in."})

        if (check_out - check_in).days > MAX_STAY_NIGHTS:
            raise serializers.ValidationError(
                {"check_out": f"Stays are limited to {MAX_STAY_NIGHTS} nights."}
            )

        room = attrs["room_slug"]
        quantity = attrs.get("quantity", 1)

        # Occupancy is per unit, so capacity scales with how many are booked.
        if attrs.get("adults", 1) > room.max_adults * quantity:
            raise serializers.ValidationError(
                {"adults": f"{room.slug} takes at most {room.max_adults} adult(s) per unit."}
            )
        if attrs.get("children", 0) > room.max_children * quantity:
            raise serializers.ValidationError(
                {"children": f"{room.slug} takes at most {room.max_children} child(ren) per unit."}
            )

        return attrs


class ReservationCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)


class AvailabilityQuerySerializer(serializers.Serializer):
    """Validates the public availability query string."""

    check_in = serializers.DateField()
    check_out = serializers.DateField()
    adults = serializers.IntegerField(min_value=1, max_value=10, default=1)
    children = serializers.IntegerField(min_value=0, max_value=10, default=0)

    def validate(self, attrs):
        if attrs["check_out"] <= attrs["check_in"]:
            raise serializers.ValidationError({"check_out": "Check-out must be after check-in."})
        return attrs
