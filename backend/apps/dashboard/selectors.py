"""Aggregations for the admin console.

Every figure here is a database aggregate. Nothing loops over a queryset in
Python — the console polls this, and a nested loop over reservations is the
difference between a 20 ms response and a 2 s one once the hotel has a season
of history.
"""

from __future__ import annotations

import datetime as dt
from decimal import Decimal

from django.db.models import Avg, Count, DecimalField, Q, Sum
from django.db.models.functions import Coalesce, TruncDate

from apps.accounts.models import GuestProfile
from apps.concierge.models import ConciergeRequest
from apps.reservations.models import Payment, Reservation, RoomAssignment
from apps.rooms.models import RoomUnit

_ZERO = Decimal("0.00")
_MONEY = DecimalField(max_digits=14, decimal_places=2)


def sellable_unit_count() -> int:
    """Units that count towards the denominator of the occupancy rate.

    Rooms out of order are excluded: a hotel with half its rooms under
    renovation is not running at 50% occupancy, it is running at capacity on the
    half it can actually sell.
    """
    return (
        RoomUnit.objects.filter(is_sellable=True)
        .exclude(housekeeping__in=RoomUnit.BLOCKED_STATES)
        .count()
    )


def occupancy_for(day: dt.date) -> dict:
    """Occupied units over sellable units, for one night.

    Counts *assignments overlapping the night*, not confirmed reservations — a
    confirmed no-show is not an occupied room, and a reservation spanning five
    nights occupies its unit on each of them.
    """
    sellable = sellable_unit_count()

    occupied = (
        RoomAssignment.objects.filter(
            start_date__lte=day,
            end_date__gt=day,  # half-open: check-out day is already free
            reservation__status__in=RoomAssignment.BLOCKING_STATUSES,
        )
        .values("unit_id")
        .distinct()
        .count()
    )

    rate = round(occupied / sellable * 100, 1) if sellable else 0.0
    return {"date": day, "occupied": occupied, "sellable": sellable, "rate_pct": rate}


def revenue_between(start: dt.date, end: dt.date) -> dict:
    """Captured payment totals over a date range (end exclusive).

    Captured, not reservation totals: a booking is not revenue until the money
    has actually moved. Counting `Reservation.total_price` here would report
    pending enquiries as income.
    """
    captured = Payment.objects.filter(
        status=Payment.Status.CAPTURED,
        captured_at__date__gte=start,
        captured_at__date__lt=end,
    )

    aggregate = captured.aggregate(
        total=Coalesce(Sum("amount"), _ZERO, output_field=_MONEY),
        transactions=Count("id"),
        average=Coalesce(Avg("amount"), _ZERO, output_field=_MONEY),
    )
    aggregate.update(start=start, end=end)
    return aggregate


def revenue_series(start: dt.date, end: dt.date) -> list[dict]:
    """Daily captured revenue — the sparkline behind the revenue card."""
    rows = (
        Payment.objects.filter(
            status=Payment.Status.CAPTURED,
            captured_at__date__gte=start,
            captured_at__date__lt=end,
        )
        .annotate(day=TruncDate("captured_at"))
        .values("day")
        .annotate(total=Coalesce(Sum("amount"), _ZERO, output_field=_MONEY))
        .order_by("day")
    )
    return [{"date": row["day"], "total": row["total"]} for row in rows]


def arrivals_for(day: dt.date) -> dict:
    """Today's arrivals, split by VIP tier."""
    arriving = Reservation.objects.filter(
        check_in=day, status__in=Reservation.ACTIVE_STATUSES
    )

    vip_tiers = GuestProfile.objects.exclude(vip_tier=GuestProfile.VipTier.NONE).values_list(
        "user_id", flat=True
    )

    return {
        "total": arriving.count(),
        "vip": arriving.filter(guest_id__in=vip_tiers).count(),
        "pending": arriving.filter(status=Reservation.Status.PENDING).count(),
    }


def reservation_counts() -> dict:
    """One pass over reservations, bucketed by status.

    A single query with conditional counts rather than five `.count()` calls —
    the console renders all of these together on every poll.
    """
    return Reservation.objects.aggregate(
        active=Count("id", filter=Q(status__in=Reservation.ACTIVE_STATUSES)),
        pending=Count("id", filter=Q(status=Reservation.Status.PENDING)),
        confirmed=Count("id", filter=Q(status=Reservation.Status.CONFIRMED)),
        checked_in=Count("id", filter=Q(status=Reservation.Status.CHECKED_IN)),
        cancelled=Count("id", filter=Q(status=Reservation.Status.CANCELLED)),
    )


def housekeeping_breakdown() -> dict:
    """Unit counts by housekeeping state, for the inventory panel."""
    rows = (
        RoomUnit.objects.filter(is_sellable=True)
        .values("housekeeping")
        .annotate(count=Count("id"))
    )
    return {row["housekeeping"]: row["count"] for row in rows}


def concierge_load() -> dict:
    """Open request counts by priority."""
    return ConciergeRequest.objects.filter(status__in=ConciergeRequest.OPEN_STATUSES).aggregate(
        open=Count("id"),
        urgent=Count("id", filter=Q(priority=ConciergeRequest.Priority.URGENT)),
        unassigned=Count("id", filter=Q(assigned_to__isnull=True)),
    )


def room_nights_between(start: dt.date, end: dt.date) -> int:
    """Room-nights sold in [start, end), clipping stays to the window.

    Deliberately not `Sum(F("end_date") - F("start_date"))` in SQL. That was
    wrong twice: date subtraction yields a DurationField on PostgreSQL and an
    integer on SQLite (so the aggregate needs an explicit output_field to work
    at all), and more importantly it counts the *whole* stay even when only part
    of it falls inside the window — a fortnight's booking would contribute 14
    nights to a single day's figure.

    The clip has to happen per row, so the arithmetic is done in Python over the
    overlapping assignments. That set is bounded by occupancy over the window,
    which for a hotel this size is hundreds of rows at most.
    """
    rows = RoomAssignment.objects.filter(
        start_date__lt=end,
        end_date__gt=start,
        reservation__status__in=RoomAssignment.BLOCKING_STATUSES,
    ).values_list("start_date", "end_date")

    return sum((min(row_end, end) - max(row_start, start)).days for row_start, row_end in rows)


def average_daily_rate(start: dt.date, end: dt.date) -> Decimal:
    """ADR: captured revenue divided by room-nights sold."""
    nights = room_nights_between(start, end)
    if not nights:
        return _ZERO

    revenue = revenue_between(start, end)["total"]
    return (revenue / nights).quantize(_ZERO)


def executive_overview(day: dt.date) -> dict:
    """Everything the four stat cards need, in one payload."""
    month_start = day.replace(day=1)
    tomorrow = day + dt.timedelta(days=1)

    return {
        "as_of": day,
        "occupancy": occupancy_for(day),
        "revenue_mtd": revenue_between(month_start, tomorrow),
        "revenue_series": revenue_series(month_start, tomorrow),
        "reservations": reservation_counts(),
        "arrivals": arrivals_for(day),
        "housekeeping": housekeeping_breakdown(),
        "concierge": concierge_load(),
        "adr_mtd": average_daily_rate(month_start, tomorrow),
    }
