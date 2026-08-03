"""Write-side business logic for reservations.

Everything that changes a booking goes through here rather than through a
serializer or a view. Two reasons: the rules stay testable without HTTP, and
there is one place to hang the audit trail when it lands.

Arguments are keyword-only by design — ``cancel(reservation, user)`` reads
identically whichever way round the arguments actually go, and that is exactly
the kind of slip that cancels the wrong booking.
"""

from __future__ import annotations

import datetime as dt
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.audit.models import AuditLog, record
from apps.reservations.models import Payment, Reservation, ReservationRoom, RoomAssignment
from apps.rooms.models import Room, RoomUnit
from apps.rooms.selectors import available_units, total_for_stay


class NoAvailability(ValidationError):
    """Raised when the requested room type has no free unit for the range.

    A ValidationError subclass so DRF renders it as a 400 with a usable message
    rather than a 500.
    """


@transaction.atomic
def create_reservation(
    *,
    room: Room,
    check_in: dt.date,
    check_out: dt.date,
    first_name: str,
    last_name: str,
    email: str,
    phone_number: str,
    adults: int = 1,
    children: int = 0,
    board: str = Reservation.Board.BB,
    message: str = "",
    language: str = "fr",
    guest=None,
    source: str = Reservation.Source.WEB,
    quantity: int = 1,
) -> Reservation:
    """Create a reservation and hold physical units for it.

    The whole function is one transaction, and the ordering inside it matters:

    1. lock the candidate units (``select_for_update``)
    2. re-check availability *inside* the lock
    3. write the reservation, the room line and the assignments

    Steps 1 and 2 are what close the last-room race. Without the lock, two
    requests can both pass an availability check and both write, and the hotel
    finds out at check-in. With it, the second request blocks until the first
    commits and then correctly sees nothing free.

    On PostgreSQL the exclusion constraint added in migration 0003 is the
    backstop if this path is ever bypassed. On SQLite ``select_for_update`` is a
    no-op — acceptable only because SQLite is dev/test here.
    """
    if check_out <= check_in:
        raise ValidationError({"check_out": "Check-out must be after check-in."})

    # 1 + 2: lock, then re-read under the lock.
    free_units = list(
        available_units(room=room, check_in=check_in, check_out=check_out, for_update=True)[
            :quantity
        ]
    )

    if len(free_units) < quantity:
        raise NoAvailability(
            {
                "room": (
                    f"Only {len(free_units)} unit(s) of {room.slug} are free for "
                    f"{check_in} to {check_out}; {quantity} requested."
                )
            }
        )

    stay_total = total_for_stay(room=room, check_in=check_in, check_out=check_out)
    nights = (check_out - check_in).days
    # The line stores a *per-night* rate; the reservation recomputes the stay
    # total from it. `nights` cannot be zero — the guard above rejects that.
    unit_price = (stay_total / nights) if stay_total is not None else None

    reservation = Reservation.objects.create(
        guest=guest,
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone_number=phone_number,
        check_in=check_in,
        check_out=check_out,
        adults=adults,
        children=children,
        board=board,
        message=message,
        language=language,
        source=source,
        status=Reservation.Status.PENDING,
    )

    ReservationRoom.objects.create(
        reservation=reservation, room=room, quantity=quantity, unit_price=unit_price
    )

    RoomAssignment.objects.bulk_create(
        [
            RoomAssignment(
                reservation=reservation, unit=unit, start_date=check_in, end_date=check_out
            )
            for unit in free_units
        ]
    )

    # Priced now so the guest sees a figure immediately; frozen at confirmation.
    reservation.total_price = reservation.calculate_total()
    reservation.save(update_fields=["total_price"])

    record(
        action=AuditLog.Action.RESERVATION_CREATE,
        target=reservation,
        actor=guest,
        changes={
            "room": room.slug,
            "dates": [check_in.isoformat(), check_out.isoformat()],
            "units": [unit.number for unit in free_units],
            "total": str(reservation.total_price),
        },
        note=f"via {source}",
    )

    return reservation


@transaction.atomic
def confirm_reservation(*, reservation: Reservation, actor=None) -> Reservation:
    """Move a pending reservation to confirmed and freeze its price."""
    if reservation.status != Reservation.Status.PENDING:
        raise ValidationError(
            {
                "status": (
                    "Only pending reservations can be confirmed "
                    f"(this one is {reservation.get_status_display().lower()})."
                )
            }
        )

    reservation.mark_confirmed()
    reservation.save(update_fields=["status", "confirmed_at", "total_price"])

    record(
        action=AuditLog.Action.RESERVATION_CONFIRM,
        target=reservation,
        actor=actor,
        changes={"status": [Reservation.Status.PENDING, reservation.status]},
    )
    return reservation


@transaction.atomic
def cancel_reservation(*, reservation: Reservation, actor=None, reason: str = "") -> Reservation:
    """Cancel and release the held units.

    Deleting the assignments is what actually frees inventory. Flipping the
    status while leaving the rows behind would keep the rooms unsellable against
    the database constraint, which does not know about reservation status.
    """
    if not reservation.can_cancel():
        raise ValidationError(
            {
                "status": (
                    f"A {reservation.get_status_display().lower()} reservation "
                    "cannot be cancelled."
                )
            }
        )

    previous = reservation.status
    released = [
        assignment.unit.number
        for assignment in reservation.assignments.select_related("unit")
    ]

    reservation.status = Reservation.Status.CANCELLED
    reservation.cancelled_at = timezone.now()
    reservation.cancellation_reason = reason
    reservation.save(update_fields=["status", "cancelled_at", "cancellation_reason"])

    reservation.assignments.all().delete()

    record(
        action=AuditLog.Action.RESERVATION_CANCEL,
        target=reservation,
        actor=actor,
        changes={"status": [previous, reservation.status], "units_released": released},
        note=reason,
    )
    return reservation


@transaction.atomic
def check_in(*, reservation: Reservation, actor=None) -> Reservation:
    """Admit the guest and mark their units occupied."""
    if reservation.status != Reservation.Status.CONFIRMED:
        raise ValidationError({"status": "Only a confirmed reservation can be checked in."})

    reservation.status = Reservation.Status.CHECKED_IN
    reservation.checked_in_at = timezone.now()
    reservation.save(update_fields=["status", "checked_in_at"])

    RoomUnit.objects.filter(assignments__reservation=reservation).update(
        housekeeping=RoomUnit.Housekeeping.OCCUPIED
    )

    record(
        action=AuditLog.Action.RESERVATION_CHECK_IN,
        target=reservation,
        actor=actor,
        changes={"status": [Reservation.Status.CONFIRMED, reservation.status]},
    )
    return reservation


@transaction.atomic
def check_out(*, reservation: Reservation, actor=None) -> Reservation:
    """Release the guest and queue their units for housekeeping."""
    if reservation.status != Reservation.Status.CHECKED_IN:
        raise ValidationError({"status": "Only a checked-in reservation can be checked out."})

    reservation.status = Reservation.Status.CHECKED_OUT
    reservation.checked_out_at = timezone.now()
    reservation.save(update_fields=["status", "checked_out_at"])

    # Dirty, not clean: housekeeping decides when a room is sellable again.
    RoomUnit.objects.filter(assignments__reservation=reservation).update(
        housekeeping=RoomUnit.Housekeeping.DIRTY
    )

    record(
        action=AuditLog.Action.RESERVATION_CHECK_OUT,
        target=reservation,
        actor=actor,
        changes={"status": [Reservation.Status.CHECKED_IN, reservation.status]},
    )
    return reservation


@transaction.atomic
def record_payment(
    *,
    reservation: Reservation,
    amount: Decimal,
    method: str = "",
    status: str = Payment.Status.CAPTURED,
    provider_reference: str = "",
    actor=None,
) -> Payment:
    """Attach a payment. Revenue reporting only counts CAPTURED rows."""
    payment = Payment.objects.create(
        reservation=reservation,
        amount=amount,
        method=method,
        status=status,
        provider_reference=provider_reference,
        captured_at=timezone.now() if status == Payment.Status.CAPTURED else None,
    )

    record(
        action=AuditLog.Action.PAYMENT_RECORD,
        target=payment,
        actor=actor,
        # The provider reference is an opaque token, safe to log. Card data
        # never reaches this system, so there is nothing else to redact.
        changes={"amount": str(amount), "status": status, "method": method},
        note=reservation.reference,
    )
    return payment
