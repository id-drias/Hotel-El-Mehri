"""Serializers for the admin console.

These are staff-facing, so they carry fields the public serializers never
expose — VIP tier, internal notes, payment state.
"""

from __future__ import annotations

from rest_framework import serializers

from apps.concierge.models import ConciergeRequest, ExperienceBooking
from apps.rooms.models import RateOverride, Room, RoomClosure, RoomUnit


class RoomUnitSerializer(serializers.ModelSerializer):
    room_slug = serializers.CharField(source="room.slug", read_only=True)

    class Meta:
        model = RoomUnit
        fields = ("id", "room_slug", "number", "floor", "housekeeping", "is_sellable", "notes")
        read_only_fields = ("id", "room_slug", "number")


class RoomUnitStatusSerializer(serializers.Serializer):
    """The console's one-click housekeeping toggle."""

    housekeeping = serializers.ChoiceField(choices=RoomUnit.Housekeeping.choices)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=500)


class RoomInventorySerializer(serializers.ModelSerializer):
    """A room type with its units, for the inventory grid."""

    units = RoomUnitSerializer(many=True, read_only=True)
    units_ready = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = (
            "slug",
            "base_price",
            "is_bookable",
            "is_published",
            "max_adults",
            "max_children",
            "units",
            "units_ready",
        )
        read_only_fields = ("slug", "max_adults", "max_children")

    def get_units_ready(self, room) -> int:
        # Counted in Python off the prefetched list rather than a per-row query:
        # the view prefetches `units`, so this costs nothing extra.
        return sum(
            1
            for unit in room.units.all()
            if unit.is_sellable and unit.housekeeping in RoomUnit.SELLABLE_STATES
        )


class RateOverrideSerializer(serializers.ModelSerializer):
    class Meta:
        model = RateOverride
        fields = ("id", "date", "price", "reason")

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("A rate override must be positive.")
        return value


class RoomClosureSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomClosure
        fields = ("id", "start_date", "end_date", "reason")

    def validate(self, attrs):
        if attrs["end_date"] <= attrs["start_date"]:
            raise serializers.ValidationError({"end_date": "End must be after start."})
        return attrs


class ConciergeRequestSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True)
    unit_number = serializers.CharField(source="unit.number", read_only=True)
    guest_reference = serializers.CharField(source="reservation.reference", read_only=True)
    is_open = serializers.BooleanField(read_only=True)

    class Meta:
        model = ConciergeRequest
        fields = (
            "id",
            "kind",
            "priority",
            "status",
            "summary",
            "detail",
            "requested_for",
            "unit_number",
            "guest_reference",
            "assigned_to",
            "assigned_to_name",
            "is_open",
            "resolved_at",
            "created_at",
        )
        read_only_fields = ("id", "resolved_at", "created_at", "is_open")


class ConciergeStatusSerializer(serializers.Serializer):
    """One-click status advance from the feed."""

    status = serializers.ChoiceField(choices=ConciergeRequest.Status.choices)

    def validate_status(self, value):
        request_obj = self.context["request_obj"]
        if not request_obj.can_transition_to(value):
            # Rejecting illegal jumps here rather than in the view keeps the
            # state machine in one place — the model owns the transitions.
            raise serializers.ValidationError(
                f"Cannot move from {request_obj.get_status_display().lower()} to {value}."
            )
        return value


class ExperienceBookingSerializer(serializers.ModelSerializer):
    service_slug = serializers.CharField(source="service.slug", read_only=True)

    class Meta:
        model = ExperienceBooking
        fields = (
            "id",
            "service",
            "service_slug",
            "reservation",
            "guest_name",
            "starts_at",
            "duration_minutes",
            "party_size",
            "price",
            "status",
            "notes",
        )
        read_only_fields = ("id", "service_slug")
