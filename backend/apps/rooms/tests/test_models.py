"""Room, RoomUnit and rate-calendar behaviour."""

from __future__ import annotations

import datetime as dt
from decimal import Decimal

import pytest
from django.db import IntegrityError

from apps.rooms.models import RateOverride, Room, RoomClosure, RoomUnit
from apps.rooms.services import set_room_bookable, set_unit_housekeeping, sync_total_units

pytestmark = pytest.mark.django_db

DAY = dt.timedelta(days=1)


@pytest.fixture
def room():
    return Room.objects.create(slug="suite-royale", base_price=Decimal("46000"))


class TestRoom:
    def test_rate_for_returns_the_base_price_without_an_override(self, room):
        assert room.rate_for(dt.date(2026, 9, 1)) == Decimal("46000")

    def test_rate_for_prefers_an_override(self, room):
        day = dt.date(2026, 9, 1)
        RateOverride.objects.create(room=room, date=day, price=Decimal("55000"))
        assert room.rate_for(day) == Decimal("55000")

    def test_override_applies_only_to_its_own_night(self, room):
        day = dt.date(2026, 9, 1)
        RateOverride.objects.create(room=room, date=day, price=Decimal("55000"))
        assert room.rate_for(day + DAY) == Decimal("46000")

    def test_on_request_room_has_no_rate(self):
        room = Room.objects.create(slug="on-request", base_price=None)
        assert room.rate_for(dt.date(2026, 9, 1)) is None

    def test_only_one_override_per_room_per_night(self, room):
        day = dt.date(2026, 9, 1)
        RateOverride.objects.create(room=room, date=day, price=Decimal("50000"))
        with pytest.raises(IntegrityError):
            RateOverride.objects.create(room=room, date=day, price=Decimal("60000"))


class TestRoomUnit:
    def test_unit_numbers_are_unique_within_a_room(self, room):
        RoomUnit.objects.create(room=room, number="601")
        with pytest.raises(IntegrityError):
            RoomUnit.objects.create(room=room, number="601")

    def test_the_same_number_may_exist_in_another_room(self, room):
        other = Room.objects.create(slug="suite-junior")
        RoomUnit.objects.create(room=room, number="601")
        # Not a realistic hotel layout, but the constraint must be per room —
        # scoping it globally would be wrong for a property with wings.
        RoomUnit.objects.create(room=other, number="601")

    @pytest.mark.parametrize(
        ("status", "available"),
        [
            (RoomUnit.Housekeeping.CLEAN, True),
            (RoomUnit.Housekeeping.OCCUPIED, False),
            (RoomUnit.Housekeeping.DIRTY, False),
            (RoomUnit.Housekeeping.MAINTENANCE, False),
        ],
    )
    def test_is_available_now(self, room, status, available):
        unit = RoomUnit.objects.create(room=room, number="601", housekeeping=status)
        assert unit.is_available_now is available

    def test_retired_unit_is_never_available(self, room):
        unit = RoomUnit.objects.create(room=room, number="601", is_sellable=False)
        assert unit.is_available_now is False


class TestClosures:
    def test_end_must_be_after_start(self, room):
        with pytest.raises(IntegrityError):
            RoomClosure.objects.create(
                room=room, start_date=dt.date(2026, 9, 5), end_date=dt.date(2026, 9, 5)
            )


class TestServices:
    def test_set_unit_housekeeping_records_the_change(self, room):
        unit = RoomUnit.objects.create(room=room, number="601")
        set_unit_housekeeping(unit=unit, status=RoomUnit.Housekeeping.MAINTENANCE)

        unit.refresh_from_db()
        assert unit.housekeeping == RoomUnit.Housekeeping.MAINTENANCE

    def test_setting_the_same_status_is_a_no_op(self, room):
        from apps.audit.models import AuditLog

        unit = RoomUnit.objects.create(room=room, number="601")
        set_unit_housekeeping(unit=unit, status=RoomUnit.Housekeeping.CLEAN)

        # No change means no audit entry — a trail full of non-events is a
        # trail nobody reads.
        assert AuditLog.objects.filter(action=AuditLog.Action.ROOM_STATUS).count() == 0

    def test_stop_sell_does_not_unpublish(self, room):
        set_room_bookable(room=room, is_bookable=False)

        room.refresh_from_db()
        assert room.is_bookable is False
        # Still on the public site, just not sellable.
        assert room.is_published is True

    def test_sync_total_units_counts_sellable_only(self, room):
        RoomUnit.objects.create(room=room, number="601")
        RoomUnit.objects.create(room=room, number="602")
        RoomUnit.objects.create(room=room, number="603", is_sellable=False)

        sync_total_units(room=room)

        room.refresh_from_db()
        assert room.total_units == 2
