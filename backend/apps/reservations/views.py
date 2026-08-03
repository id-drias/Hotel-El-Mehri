"""API viewsets for reservations.

Two audiences, one viewset:

* anonymous visitors may POST a booking and look one up by reference
* authenticated guests may list and cancel their own

Staff endpoints live in ``apps.dashboard.admin_views`` rather than here, so the
public surface stays small and the privileged one is reviewable in one file.
"""

from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsOwnerOrAdmin
from apps.reservations import services
from apps.reservations.models import Reservation
from apps.reservations.serializers import (
    AvailabilityQuerySerializer,
    ReservationCancelSerializer,
    ReservationCreateSerializer,
    ReservationReadSerializer,
)
from apps.rooms.selectors import availability_for_range


def _as_drf_error(exc: DjangoValidationError) -> dict:
    return exc.message_dict if hasattr(exc, "message_dict") else {"detail": str(exc)}


class ReservationViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """Public booking funnel plus the guest's own history."""

    serializer_class = ReservationReadSerializer
    permission_classes = [IsOwnerOrAdmin]
    lookup_field = "reference"
    owner_field = "guest"
    throttle_scope = "reservation"

    def get_permissions(self):
        # Anyone may book — the hotel takes reservations from people with no
        # account. Everything else needs a session.
        if self.action == "create":
            return [AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = Reservation.objects.prefetch_related("rooms__room", "assignments__unit")

        user = self.request.user
        if not (user and user.is_authenticated):
            return queryset.none()
        if user.is_staff_member:
            return queryset

        # Scoped in the queryset, not only in the permission class: DRF calls
        # `has_object_permission` from `get_object()` alone, so a list action
        # would otherwise return every reservation in the hotel.
        return queryset.filter(guest=user)

    def get_serializer_class(self):
        if self.action == "create":
            return ReservationCreateSerializer
        return ReservationReadSerializer

    def create(self, request, *args, **kwargs):
        """Validate, then delegate to the transactional service.

        The view carries no business logic — it translates between HTTP and
        ``services.create_reservation`` and maps the failure modes onto status
        codes.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = request.user if request.user.is_authenticated else None

        try:
            reservation = services.create_reservation(
                room=data["room_slug"],
                quantity=data.get("quantity", 1),
                check_in=data["check_in"],
                check_out=data["check_out"],
                first_name=data["first_name"],
                last_name=data["last_name"],
                email=data["email"],
                phone_number=data["phone_number"],
                adults=data.get("adults", 1),
                children=data.get("children", 0),
                board=data.get("board", Reservation.Board.BB),
                message=data.get("message", ""),
                language=data.get("language", "fr"),
                guest=user,
            )
        except services.NoAvailability as exc:
            # 409, not 400: the request was well formed, the world moved. A
            # frontend can usefully retry a 409 with other dates; a 400 would
            # tell it the payload was wrong, which it was not.
            return Response(_as_drf_error(exc), status=status.HTTP_409_CONFLICT)
        except DjangoValidationError as exc:
            raise ValidationError(_as_drf_error(exc)) from exc
        except IntegrityError:
            # The database constraint fired, meaning the row lock was bypassed
            # or unavailable. Same meaning to the caller.
            return Response(
                {"detail": "That room was taken while your booking was being processed."},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(ReservationReadSerializer(reservation).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsOwnerOrAdmin])
    def cancel(self, request, reference=None):
        """A guest cancelling their own booking."""
        reservation = self.get_object()  # runs has_object_permission

        serializer = ReservationCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            services.cancel_reservation(
                reservation=reservation,
                actor=request.user,
                reason=serializer.validated_data.get("reason", ""),
            )
        except DjangoValidationError as exc:
            raise ValidationError(_as_drf_error(exc)) from exc

        return Response(ReservationReadSerializer(reservation).data)


class AvailabilityView(APIView):
    """Public availability search. Read-only, throttled, no personal data."""

    permission_classes = [AllowAny]
    throttle_scope = "reservation"

    def get(self, request):
        query = AvailabilityQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        data = query.validated_data

        results = availability_for_range(
            check_in=data["check_in"],
            check_out=data["check_out"],
            adults=data["adults"],
            children=data["children"],
        )

        return Response(
            {
                "check_in": data["check_in"],
                "check_out": data["check_out"],
                "results": [
                    {
                        "room_slug": row["room"].slug,
                        "units_available": row["units_available"],
                        "nights": row["nights"],
                        "total_price": row["total_price"],
                        "base_price": row["room"].base_price,
                    }
                    for row in results
                ],
            }
        )
