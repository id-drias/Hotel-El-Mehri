"""The booking engine's actual rules.

These are the tests worth having: the overlap predicate at its boundaries, the
cost calculation, and the availability guard. Everything else in the app is
plumbing around them.
"""

from __future__ import annotations

import datetime as dt
from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError

from apps.reservations import services
from apps.reservations.models import Reservation, RoomAssignment
from apps.rooms.models import RateOverride, Room, RoomClosure, RoomUnit
from apps.rooms.selectors import available_units, total_for_stay

pytestmark = pytest.mark.django_db

DAY = dt.timedelta(days=1)


@pytest.fixture
def today():
    return dt.date(2026, 9, 1)


@pytest.fixture
def room():
    room = Room.objects.create(
        slug="suite-royale",
        max_adults=2,
        max_children=2,
        base_price=Decimal("40000.00"),
        total_units=2,
    )
    RoomUnit.objects.create(room=room, number="601")
    RoomUnit.objects.create(room=room, number="602")
    return room


def book(room, check_in, check_out, **kwargs):
    defaults = dict(
        first_name="Amine",
        last_name="Belkacem",
        email="a@example.dz",
        phone_number="0770112233",
        adults=2,
        board=Reservation.Board.ROOM_ONLY,
    )
    return services.create_reservation(
        room=room, check_in=check_in, check_out=check_out, **{**defaults, **kwargs}
    )


class TestOverlap:
    """The half-open interval rule, at the boundaries where it matters."""

    def test_same_day_turnover_is_allowed(self, room, today):
        """A guest checking out on the 5th frees the room for the 5th.

        This is the case an inclusive comparison gets wrong, and it costs a
        night's revenue on every changeover.
        """
        book(room, today, today + 4 * DAY)  # 1 -> 5

        free = available_units(room=room, check_in=today + 4 * DAY, check_out=today + 6 * DAY)
        # Both units: 601 is released on the 5th, 602 was never touched.
        assert free.count() == 2

    def test_touching_ranges_do_not_overlap(self, room, today):
        book(room, today, today + 2 * DAY)
        book(room, today + 2 * DAY, today + 4 * DAY)

        # Two bookings, both able to take 601 in turn.
        assert RoomAssignment.objects.count() == 2

    def test_one_night_inside_an_existing_stay_conflicts(self, room, today):
        book(room, today, today + 5 * DAY)
        book(room, today, today + 5 * DAY)  # consumes the second unit

        with pytest.raises(services.NoAvailability):
            book(room, today + 2 * DAY, today + 3 * DAY)

    def test_stay_enclosing_an_existing_one_conflicts(self, room, today):
        book(room, today + 2 * DAY, today + 3 * DAY)
        book(room, today + 2 * DAY, today + 3 * DAY)

        with pytest.raises(services.NoAvailability):
            book(room, today, today + 10 * DAY)

    def test_partial_overlap_at_each_end_conflicts(self, room, today):
        book(room, today + 3 * DAY, today + 6 * DAY)
        book(room, today + 3 * DAY, today + 6 * DAY)

        with pytest.raises(services.NoAvailability):
            book(room, today + 1 * DAY, today + 4 * DAY)  # overlaps the start
        with pytest.raises(services.NoAvailability):
            book(room, today + 5 * DAY, today + 8 * DAY)  # overlaps the end


class TestAvailability:
    def test_units_are_consumed_one_at_a_time(self, room, today):
        assert available_units(room=room, check_in=today, check_out=today + DAY).count() == 2

        book(room, today, today + DAY)
        assert available_units(room=room, check_in=today, check_out=today + DAY).count() == 1

        book(room, today, today + DAY)
        assert available_units(room=room, check_in=today, check_out=today + DAY).count() == 0

    def test_third_booking_is_refused(self, room, today):
        book(room, today, today + DAY)
        book(room, today, today + DAY)

        with pytest.raises(services.NoAvailability):
            book(room, today, today + DAY)

    def test_maintenance_removes_a_unit_from_inventory(self, room, today):
        RoomUnit.objects.filter(number="601").update(
            housekeeping=RoomUnit.Housekeeping.MAINTENANCE
        )
        assert available_units(room=room, check_in=today, check_out=today + DAY).count() == 1

    def test_dirty_units_are_still_sellable_for_a_future_date(self, room, today):
        """Dirty is a housekeeping queue, not a block — it will be cleaned."""
        RoomUnit.objects.filter(number="601").update(housekeeping=RoomUnit.Housekeeping.DIRTY)
        assert available_units(room=room, check_in=today, check_out=today + DAY).count() == 2

    def test_closure_blocks_the_whole_type(self, room, today):
        RoomClosure.objects.create(room=room, start_date=today, end_date=today + 3 * DAY)
        free = available_units(room=room, check_in=today + DAY, check_out=today + 2 * DAY)
        assert free.count() == 0

    def test_cancelling_releases_the_unit(self, room, today):
        first = book(room, today, today + DAY)
        book(room, today, today + DAY)
        assert available_units(room=room, check_in=today, check_out=today + DAY).count() == 0

        services.cancel_reservation(reservation=first, reason="guest called")

        assert available_units(room=room, check_in=today, check_out=today + DAY).count() == 1
        assert first.assignments.count() == 0


class TestPricing:
    def test_total_is_the_sum_of_nightly_rates(self, room, today):
        total = total_for_stay(room=room, check_in=today, check_out=today + 3 * DAY)
        assert total == Decimal("120000.00")  # 3 x 40 000

    def test_override_applies_to_one_night_only(self, room, today):
        RateOverride.objects.create(room=room, date=today + DAY, price=Decimal("55000.00"))

        total = total_for_stay(room=room, check_in=today, check_out=today + 3 * DAY)
        # 40 000 + 55 000 + 40 000 — not 3 x either rate.
        assert total == Decimal("135000.00")

    def test_on_request_room_returns_none_not_zero(self, today):
        room = Room.objects.create(slug="on-request", base_price=None, max_adults=2)
        RoomUnit.objects.create(room=room, number="101")

        assert total_for_stay(room=room, check_in=today, check_out=today + 2 * DAY) is None

    def test_board_supplement_scales_with_guests_and_nights(self, room, today):
        reservation = book(
            room, today, today + 2 * DAY, adults=2, children=1, board=Reservation.Board.HB
        )
        # 2 800 x 3 guests x 2 nights
        assert reservation.board_total() == Decimal("16800")

    def test_calculate_total_combines_room_and_board(self, room, today):
        reservation = book(room, today, today + 2 * DAY, adults=2, board=Reservation.Board.BB)

        accommodation = Decimal("80000.00")  # 2 x 40 000
        board = Decimal("1200") * 2 * 2  # supplement x guests x nights
        assert reservation.calculate_total() == accommodation + board

    def test_zero_night_stay_is_rejected(self, room, today):
        with pytest.raises(ValidationError):
            book(room, today, today)


class TestLifecycle:
    def test_confirm_freezes_the_price(self, room, today):
        reservation = book(room, today, today + 2 * DAY)
        services.confirm_reservation(reservation=reservation)

        reservation.refresh_from_db()
        assert reservation.status == Reservation.Status.CONFIRMED
        assert reservation.confirmed_at is not None
        assert reservation.total_price is not None

    def test_check_in_marks_units_occupied(self, room, today):
        reservation = book(room, today, today + 2 * DAY)
        services.confirm_reservation(reservation=reservation)
        services.check_in(reservation=reservation)

        unit = RoomUnit.objects.get(assignments__reservation=reservation)
        assert unit.housekeeping == RoomUnit.Housekeeping.OCCUPIED

    def test_check_out_marks_units_dirty(self, room, today):
        reservation = book(room, today, today + 2 * DAY)
        services.confirm_reservation(reservation=reservation)
        services.check_in(reservation=reservation)
        services.check_out(reservation=reservation)

        unit = RoomUnit.objects.get(assignments__reservation=reservation)
        # Dirty, not clean — housekeeping decides when it can be sold again.
        assert unit.housekeeping == RoomUnit.Housekeeping.DIRTY

    def test_cannot_check_in_an_unconfirmed_reservation(self, room, today):
        reservation = book(room, today, today + 2 * DAY)
        with pytest.raises(ValidationError):
            services.check_in(reservation=reservation)

    def test_cannot_cancel_a_checked_out_stay(self, room, today):
        reservation = book(room, today, today + 2 * DAY)
        services.confirm_reservation(reservation=reservation)
        services.check_in(reservation=reservation)
        services.check_out(reservation=reservation)

        with pytest.raises(ValidationError):
            services.cancel_reservation(reservation=reservation)

    def test_reference_is_generated_and_unique(self, room, today):
        first = book(room, today, today + DAY)
        second = book(room, today, today + DAY)

        assert first.reference.startswith("LYN-")
        assert first.reference != second.reference
