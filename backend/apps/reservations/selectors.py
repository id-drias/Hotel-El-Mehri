"""Read-side queries for Reservation requests (keep views thin)."""

from __future__ import annotations

import datetime as dt

from django.db.models import QuerySet

from apps.reservations.models import Reservation


def with_related() -> QuerySet[Reservation]:
    """Base queryset with everything the serializers touch already loaded."""
    return Reservation.objects.select_related("guest", "guest__guest_profile").prefetch_related(
        "rooms__room", "assignments__unit", "payments"
    )


def for_guest(user) -> QuerySet[Reservation]:
    """A guest's own bookings. Empty for anonymous callers."""
    if user is None or not user.is_authenticated:
        return Reservation.objects.none()
    return with_related().filter(guest=user)


def arrivals_on(day: dt.date) -> QuerySet[Reservation]:
    """Today's expected arrivals, for the front desk."""
    return with_related().filter(check_in=day, status__in=Reservation.ACTIVE_STATUSES)


def departures_on(day: dt.date) -> QuerySet[Reservation]:
    return with_related().filter(check_out=day, status=Reservation.Status.CHECKED_IN)


def in_house(day: dt.date) -> QuerySet[Reservation]:
    """Guests physically in the hotel on `day`.

    Half-open, like every other date comparison here: someone checking out on
    the 5th is not in house on the 5th.
    """
    return with_related().filter(
        check_in__lte=day, check_out__gt=day, status=Reservation.Status.CHECKED_IN
    )
