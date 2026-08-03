"""Read-side queries for Rooms & suites (keep views thin).

The overlap predicate defined here is the single most important rule in the
system, so it lives in exactly one place and everything else calls it.
"""

from __future__ import annotations

import datetime as dt
from decimal import Decimal

from django.db.models import Q, QuerySet

from apps.rooms.models import RateOverride, Room, RoomClosure, RoomUnit


def overlapping(check_in: dt.date, check_out: dt.date, prefix: str = "") -> Q:
    """Q object matching any date range that overlaps [check_in, check_out).

    Stays are **half-open**: a guest checking out on the 5th frees the room for
    a guest checking in on the 5th. Two ranges therefore overlap when

        existing.start < new.end   AND   existing.end > new.start

    Using ``<=`` / ``>=`` here would block same-day turnover and quietly cost
    the hotel a night's revenue on every changeover.

    `prefix` lets callers target a related model, e.g. ``prefix="assignments__"``.
    """
    return Q(**{f"{prefix}start_date__lt": check_out, f"{prefix}end_date__gt": check_in})


def booked_unit_ids(check_in: dt.date, check_out: dt.date) -> QuerySet:
    """Ids of units already assigned for any part of the range."""
    # Imported inside the function: reservations imports rooms, so a module-level
    # import here would be circular.
    from apps.reservations.models import RoomAssignment

    return (
        RoomAssignment.objects.filter(overlapping(check_in, check_out))
        .filter(reservation__status__in=RoomAssignment.BLOCKING_STATUSES)
        .values_list("unit_id", flat=True)
    )


def is_room_closed(room: Room, check_in: dt.date, check_out: dt.date) -> bool:
    """True when a stop-sell window covers any night of the range."""
    return RoomClosure.objects.filter(room=room).filter(overlapping(check_in, check_out)).exists()


def available_units(
    *, room: Room, check_in: dt.date, check_out: dt.date, for_update: bool = False
) -> QuerySet[RoomUnit]:
    """Units of `room` free for the whole range.

    `for_update=True` takes a row lock — that is what `create_reservation` uses
    to close the last-room race. Only meaningful inside a transaction, and a
    silent no-op on SQLite, which is why the database constraint exists too.
    """
    if is_room_closed(room, check_in, check_out):
        return RoomUnit.objects.none()

    queryset = (
        RoomUnit.objects.filter(room=room, is_sellable=True)
        .exclude(housekeeping__in=RoomUnit.BLOCKED_STATES)
        .exclude(id__in=booked_unit_ids(check_in, check_out))
        .order_by("number")
    )

    if for_update:
        # `of=("self",)` locks the RoomUnit rows only. Without it the lock would
        # extend to every joined table and serialise unrelated bookings.
        queryset = queryset.select_for_update(of=("self",))

    return queryset


def nights_between(check_in: dt.date, check_out: dt.date) -> int:
    return max((check_out - check_in).days, 0)


def total_for_stay(*, room: Room, check_in: dt.date, check_out: dt.date) -> Decimal | None:
    """Sum the nightly rate across the stay, honouring per-night overrides.

    Never ``nights * base_price``. That is wrong the moment one night in the
    range carries an override, and wrong for the whole stay if the rate changes
    mid-stay — which is the entire reason the rate calendar exists.

    Returns None when the room is priced on request and no override covers the
    range, so callers render "on request" rather than a misleading zero.
    """
    nights = nights_between(check_in, check_out)
    if nights == 0:
        return Decimal("0.00")

    overrides = dict(
        RateOverride.objects.filter(room=room, date__gte=check_in, date__lt=check_out).values_list(
            "date", "price"
        )
    )

    total = Decimal("0.00")
    priced_any = False

    for offset in range(nights):
        day = check_in + dt.timedelta(days=offset)
        rate = overrides.get(day, room.base_price)
        if rate is None:
            continue
        priced_any = True
        total += rate

    return total if priced_any else None


def availability_for_range(
    *, check_in: dt.date, check_out: dt.date, adults: int = 1, children: int = 0
) -> list[dict]:
    """Per-room-type availability, for the public availability endpoint."""
    rooms = (
        Room.objects.published()
        .filter(is_bookable=True, max_adults__gte=adults, max_children__gte=children)
        .prefetch_related("translations")
    )

    return [
        {
            "room": room,
            "units_available": available_units(
                room=room, check_in=check_in, check_out=check_out
            ).count(),
            "total_price": total_for_stay(room=room, check_in=check_in, check_out=check_out),
            "nights": nights_between(check_in, check_out),
        }
        for room in rooms
    ]
