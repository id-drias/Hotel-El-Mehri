"""Write-side business logic for Rooms & suites.

Room content is edited through the Django admin, so there is no public write
path. What lives here is the inventory bookkeeping the console triggers, kept
out of the views for the same reason as everywhere else: testable without HTTP,
and one place to hang the audit trail.
"""

from __future__ import annotations

from django.db import transaction

from apps.audit.models import AuditLog, record
from apps.rooms.models import Room, RoomUnit


@transaction.atomic
def set_unit_housekeeping(*, unit: RoomUnit, status: str, actor=None, note: str = "") -> RoomUnit:
    """Change one unit's housekeeping state."""
    previous = unit.housekeeping
    if previous == status:
        return unit

    unit.housekeeping = status
    if note:
        unit.notes = note
    unit.save(update_fields=["housekeeping", "notes", "updated_at"])

    record(
        action=AuditLog.Action.ROOM_STATUS,
        target=unit,
        actor=actor,
        changes={"housekeeping": [previous, status]},
    )
    return unit


@transaction.atomic
def set_room_bookable(*, room: Room, is_bookable: bool, actor=None) -> Room:
    """Open or close a room type for sale.

    Distinct from `is_published`: a stopped room still appears on the public
    site with its photography and copy, it simply cannot be booked. Unpublishing
    would remove it from the catalogue entirely and break inbound links.
    """
    if room.is_bookable == is_bookable:
        return room

    room.is_bookable = is_bookable
    room.save(update_fields=["is_bookable"])

    record(
        action=AuditLog.Action.ROOM_BOOKABLE,
        target=room,
        actor=actor,
        changes={"is_bookable": [not is_bookable, is_bookable]},
    )
    return room


def sync_total_units(*, room: Room) -> Room:
    """Realign the legacy `total_units` counter with the real unit rows.

    `total_units` predates `RoomUnit` and is display-only now, but it is still
    rendered, so it must not drift from the truth.
    """
    count = room.units.filter(is_sellable=True).count()
    if room.total_units != count:
        room.total_units = count
        room.save(update_fields=["total_units"])
    return room
