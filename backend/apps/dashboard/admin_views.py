"""Admin console API.

Every privileged endpoint in the project lives in this one module, so the
attack surface can be reviewed in a single file rather than hunted for across
eight apps.

Authorisation is layered:

* `IsStaffUserRole` is the floor — nothing here is reachable without a console
  role, and the default permission in settings is already `IsAuthenticated`.
* `IsManagerUserRole` guards anything touching money, pricing or cancellation.
"""

from __future__ import annotations

import datetime as dt

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import AuditLog, client_ip, record
from apps.audit.serializers import AuditLogSerializer
from apps.common.permissions import IsAdminUserRole, IsManagerUserRole, IsStaffUserRole
from apps.concierge.models import ConciergeRequest, ExperienceBooking
from apps.dashboard import selectors
from apps.dashboard.serializers import (
    ConciergeRequestSerializer,
    ConciergeStatusSerializer,
    ExperienceBookingSerializer,
    RateOverrideSerializer,
    RoomClosureSerializer,
    RoomInventorySerializer,
    RoomUnitSerializer,
    RoomUnitStatusSerializer,
)
from apps.reservations import services
from apps.reservations.models import Reservation
from apps.reservations.serializers import (
    ReservationCancelSerializer,
    StaffReservationSerializer,
)
from apps.rooms.models import RateOverride, Room, RoomUnit


def _parse_date(value: str | None, default: dt.date) -> dt.date:
    if not value:
        return default
    parsed = dt.date.fromisoformat(value) if len(value) == 10 else None
    if parsed is None:
        raise ValidationError({"date": "Use YYYY-MM-DD."})
    return parsed


# ---------------------------------------------------------------------------
# Executive overview
# ---------------------------------------------------------------------------


class ExecutiveStatsAPIView(APIView):
    """The four stat cards, computed live.

    One request, one payload — the console renders occupancy, revenue,
    reservation counts and VIP arrivals together, so splitting these into four
    endpoints would just be four round trips on every poll.
    """

    permission_classes = [IsStaffUserRole]

    def get(self, request):
        try:
            day = _parse_date(request.query_params.get("date"), timezone.localdate())
        except ValueError as exc:
            raise ValidationError({"date": "Use YYYY-MM-DD."}) from exc

        overview = selectors.executive_overview(day)

        # Revenue is manager-only. Staff still get occupancy and arrivals — the
        # front desk needs those — but not the takings.
        if not request.user.is_manager:
            overview.pop("revenue_mtd", None)
            overview.pop("revenue_series", None)
            overview.pop("adr_mtd", None)

        return Response(overview)


class OccupancySeriesAPIView(APIView):
    """Daily occupancy across a range, for the trend line."""

    permission_classes = [IsStaffUserRole]

    def get(self, request):
        today = timezone.localdate()
        try:
            start = _parse_date(request.query_params.get("from"), today - dt.timedelta(days=13))
            end = _parse_date(request.query_params.get("to"), today)
        except ValueError as exc:
            raise ValidationError({"from": "Use YYYY-MM-DD."}) from exc

        if end < start:
            raise ValidationError({"to": "`to` must be on or after `from`."})
        if (end - start).days > 366:
            raise ValidationError({"to": "Range is limited to one year."})

        days = (end - start).days + 1
        return Response(
            {
                "from": start,
                "to": end,
                "series": [
                    selectors.occupancy_for(start + dt.timedelta(days=offset))
                    for offset in range(days)
                ],
            }
        )


# ---------------------------------------------------------------------------
# Reservations
# ---------------------------------------------------------------------------


class AdminReservationViewSet(viewsets.ModelViewSet):
    """Full reservation management for the bookings table."""

    serializer_class = StaffReservationSerializer
    permission_classes = [IsStaffUserRole]
    lookup_field = "reference"
    http_method_names = ["get", "patch", "post", "head", "options"]

    def get_queryset(self):
        queryset = (
            Reservation.objects.select_related("guest", "guest__guest_profile")
            .prefetch_related("rooms__room", "assignments__unit", "payments")
            .order_by("-created_at")
        )

        params = self.request.query_params

        if status_filter := params.get("status"):
            queryset = queryset.filter(status=status_filter)

        if params.get("vip") == "true":
            queryset = queryset.exclude(guest__guest_profile__vip_tier="none").filter(
                guest__isnull=False
            )

        if arriving := params.get("arriving_on"):
            queryset = queryset.filter(check_in=arriving)

        if search := params.get("q"):
            from django.db.models import Q

            queryset = queryset.filter(
                Q(reference__icontains=search)
                | Q(last_name__icontains=search)
                | Q(first_name__icontains=search)
                | Q(email__icontains=search)
            )

        return queryset

    def _transition(self, request, reference, operation, **kwargs):
        """Shared wrapper: fetch, call the service, translate the error."""
        reservation = get_object_or_404(Reservation, reference=reference)
        try:
            operation(reservation=reservation, actor=request.user, **kwargs)
        except DjangoValidationError as exc:
            detail = exc.message_dict if hasattr(exc, "message_dict") else {"detail": str(exc)}
            raise ValidationError(detail) from exc
        return Response(StaffReservationSerializer(reservation).data)

    @action(detail=True, methods=["post"])
    def confirm(self, request, reference=None):
        """The console's Approve button."""
        return self._transition(request, reference, services.confirm_reservation)

    @action(detail=True, methods=["post"], url_path="check-in")
    def check_in(self, request, reference=None):
        return self._transition(request, reference, services.check_in)

    @action(detail=True, methods=["post"], url_path="check-out")
    def check_out(self, request, reference=None):
        return self._transition(request, reference, services.check_out)

    @action(detail=True, methods=["post"], permission_classes=[IsManagerUserRole])
    def cancel(self, request, reference=None):
        """Manager-only: cancelling releases inventory and may trigger a refund."""
        serializer = ReservationCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._transition(
            request,
            reference,
            services.cancel_reservation,
            reason=serializer.validated_data.get("reason", ""),
        )


# ---------------------------------------------------------------------------
# Inventory
# ---------------------------------------------------------------------------


class RoomInventoryViewSet(viewsets.ModelViewSet):
    """Room types with their units — the inventory grid."""

    serializer_class = RoomInventorySerializer
    permission_classes = [IsStaffUserRole]
    lookup_field = "slug"
    # `put` and `delete` are here for the rate-override actions, not for the
    # room type itself — creating and destroying room types is a Django admin
    # job, so `post` stays off the list.
    http_method_names = ["get", "put", "patch", "delete", "head", "options"]
    pagination_class = None  # a hotel has a handful of room types

    def get_queryset(self):
        return Room.objects.prefetch_related(
            Prefetch("units", queryset=RoomUnit.objects.order_by("number"))
        ).order_by("position", "id")

    def get_permissions(self):
        # Toggling a type open or closed for sale is a commercial decision.
        if self.request.method == "PATCH":
            return [IsManagerUserRole()]
        return super().get_permissions()

    @action(detail=True, methods=["put"], url_path=r"rates/(?P<date>\d{4}-\d{2}-\d{2})",
            permission_classes=[IsManagerUserRole])
    def set_rate(self, request, slug=None, date=None):
        """Create or replace the nightly rate override for one date.

        PUT, not PATCH: the body fully describes the override for that night,
        and repeating the call is idempotent.
        """
        room = self.get_object()
        try:
            night = dt.date.fromisoformat(date)
        except ValueError as exc:
            raise ValidationError({"date": "Use YYYY-MM-DD."}) from exc

        serializer = RateOverrideSerializer(data={**request.data, "date": night})
        serializer.is_valid(raise_exception=True)

        previous = (
            RateOverride.objects.filter(room=room, date=night)
            .values_list("price", flat=True)
            .first()
        )

        override, _created = RateOverride.objects.update_or_create(
            room=room,
            date=night,
            defaults={
                "price": serializer.validated_data["price"],
                "reason": serializer.validated_data.get("reason", ""),
                "created_by": request.user,
            },
        )

        record(
            action=AuditLog.Action.RATE_OVERRIDE,
            target=override,
            actor=request.user,
            changes={
                "price": [str(previous) if previous is not None else None, str(override.price)],
                "date": night.isoformat(),
                "room": room.slug,
            },
            note=override.reason,
            ip_address=client_ip(request),
        )
        return Response(RateOverrideSerializer(override).data)

    @action(detail=True, methods=["delete"], url_path=r"rates/(?P<date>\d{4}-\d{2}-\d{2})/clear",
            permission_classes=[IsManagerUserRole])
    def clear_rate(self, request, slug=None, date=None):
        room = self.get_object()
        RateOverride.objects.filter(room=room, date=date).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get", "post"], permission_classes=[IsManagerUserRole])
    def closures(self, request, slug=None):
        """List or create stop-sell windows for a room type."""
        room = self.get_object()

        if request.method == "GET":
            return Response(
                RoomClosureSerializer(room.closures.all(), many=True).data
            )

        serializer = RoomClosureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        closure = serializer.save(room=room, created_by=request.user)
        return Response(RoomClosureSerializer(closure).data, status=status.HTTP_201_CREATED)


class RoomUnitViewSet(viewsets.ModelViewSet):
    """Individual physical rooms."""

    serializer_class = RoomUnitSerializer
    permission_classes = [IsStaffUserRole]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        queryset = RoomUnit.objects.select_related("room").order_by("room__position", "number")
        if room_slug := self.request.query_params.get("room"):
            queryset = queryset.filter(room__slug=room_slug)
        if housekeeping := self.request.query_params.get("housekeeping"):
            queryset = queryset.filter(housekeeping=housekeeping)
        return queryset

    @action(detail=True, methods=["patch"], url_path="status")
    def update_room_status(self, request, pk=None):
        """The console's housekeeping chip.

        Housekeeping staff change this dozens of times a shift, so it is a
        single narrow endpoint taking one field rather than a general PATCH that
        could also flip `is_sellable`.
        """
        unit = self.get_object()

        serializer = RoomUnitStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        previous = unit.housekeeping
        unit.housekeeping = serializer.validated_data["housekeeping"]
        if "notes" in serializer.validated_data:
            unit.notes = serializer.validated_data["notes"]
        unit.save(update_fields=["housekeeping", "notes", "updated_at"])

        # Worth logging even though it looks routine: "who put 604 out of order
        # the night we oversold" is a question that gets asked.
        record(
            action=AuditLog.Action.ROOM_STATUS,
            target=unit,
            actor=request.user,
            changes={"housekeeping": [previous, unit.housekeeping]},
            ip_address=client_ip(request),
        )

        return Response(RoomUnitSerializer(unit).data)


# ---------------------------------------------------------------------------
# Concierge
# ---------------------------------------------------------------------------


class ConciergeRequestViewSet(viewsets.ModelViewSet):
    """The live request feed."""

    serializer_class = ConciergeRequestSerializer
    permission_classes = [IsStaffUserRole]

    def get_queryset(self):
        queryset = ConciergeRequest.objects.select_related(
            "assigned_to", "unit", "reservation"
        )

        params = self.request.query_params
        if status_filter := params.get("status"):
            queryset = queryset.filter(status=status_filter)
        elif params.get("open") != "false":
            # The feed defaults to open work. Resolved items are history and
            # would otherwise dominate the list within a week.
            queryset = queryset.filter(status__in=ConciergeRequest.OPEN_STATUSES)

        if priority := params.get("priority"):
            queryset = queryset.filter(priority=priority)

        return queryset

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None):
        """One-click advance: new → in progress → resolved."""
        concierge_request = self.get_object()

        serializer = ConciergeStatusSerializer(
            data=request.data, context={"request_obj": concierge_request}
        )
        serializer.is_valid(raise_exception=True)

        previous = concierge_request.status
        concierge_request.advance_to(serializer.validated_data["status"], actor=request.user)
        concierge_request.save(update_fields=["status", "assigned_to", "resolved_at", "updated_at"])

        record(
            action=AuditLog.Action.CONCIERGE_STATUS,
            target=concierge_request,
            actor=request.user,
            changes={"status": [previous, concierge_request.status]},
            ip_address=client_ip(request),
        )

        return Response(ConciergeRequestSerializer(concierge_request).data)

    @action(detail=True, methods=["post"])
    def claim(self, request, pk=None):
        """Assign the request to whoever pressed the button."""
        concierge_request = self.get_object()
        concierge_request.assigned_to = request.user
        if concierge_request.status == ConciergeRequest.Status.NEW:
            concierge_request.advance_to(ConciergeRequest.Status.IN_PROGRESS, actor=request.user)
        concierge_request.save(update_fields=["assigned_to", "status", "updated_at"])
        return Response(ConciergeRequestSerializer(concierge_request).data)


class ExperienceBookingViewSet(viewsets.ModelViewSet):
    """Spa, dining and transfer bookings."""

    serializer_class = ExperienceBookingSerializer
    permission_classes = [IsStaffUserRole]

    def get_queryset(self):
        queryset = ExperienceBooking.objects.select_related("service", "reservation")
        if on_date := self.request.query_params.get("date"):
            queryset = queryset.filter(starts_at__date=on_date)
        if status_filter := self.request.query_params.get("status"):
            queryset = queryset.filter(status=status_filter)
        return queryset


# ---------------------------------------------------------------------------
# Audit
# ---------------------------------------------------------------------------


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """The audit trail.

    Administrators only, and read-only at every level — `ReadOnlyModelViewSet`
    exposes no write verbs, and the model refuses to be updated. A trail that
    the people it records can edit is not a trail.
    """

    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminUserRole]

    def get_queryset(self):
        queryset = AuditLog.objects.select_related("actor")

        params = self.request.query_params
        if action := params.get("action"):
            queryset = queryset.filter(action=action)
        if target_type := params.get("target_type"):
            queryset = queryset.filter(target_type=target_type)
        if target_id := params.get("target_id"):
            queryset = queryset.filter(target_id=str(target_id))
        if actor := params.get("actor"):
            queryset = queryset.filter(actor_id=actor)
        if since := params.get("since"):
            queryset = queryset.filter(created_at__date__gte=since)

        return queryset
