"""Reservation model: references, derived values and constraints.

The pricing arithmetic lives in `test_booking_engine.py`; this file covers the
model's own behaviour.
"""

from __future__ import annotations

import datetime as dt
from decimal import Decimal

import pytest
from django.db.utils import IntegrityError

from apps.reservations.models import Payment, Reservation, generate_reference
from apps.reservations.selectors import arrivals_on, departures_on, in_house
from apps.rooms.models import Room, RoomUnit

pytestmark = pytest.mark.django_db

DAY = dt.timedelta(days=1)
BASE = dt.date(2026, 9, 1)


@pytest.fixture
def room():
    room = Room.objects.create(slug="suite-royale", base_price=Decimal("40000"))
    RoomUnit.objects.create(room=room, number="601")
    return room


def make(check_in=BASE, check_out=BASE + 3 * DAY, **overrides) -> Reservation:
    return Reservation.objects.create(
        first_name="Amine",
        last_name="Belkacem",
        email="a@example.dz",
        phone_number="0770112233",
        check_in=check_in,
        check_out=check_out,
        **overrides,
    )


class TestReference:
    def test_generated_on_save(self):
        assert make().reference.startswith("LYN-")

    def test_unique_across_reservations(self):
        assert make().reference != make().reference

    def test_alphabet_excludes_lookalike_characters(self):
        """References get read down a phone; O/0 and I/1 cause callbacks."""
        for _ in range(50):
            body = generate_reference().removeprefix("LYN-")
            assert not set(body) & set("O0I1")


class TestDerivedValues:
    def test_nights(self):
        assert make(BASE, BASE + 4 * DAY).nights == 4

    def test_guest_count(self):
        assert make(adults=2, children=3).guest_count == 5

    def test_full_name(self):
        assert make().full_name == "Amine Belkacem"

    def test_is_vip_is_false_without_a_guest_account(self):
        # A phone booking has no profile and therefore no tier.
        assert make().is_vip is False


class TestConstraints:
    def test_check_out_must_be_after_check_in(self):
        with pytest.raises(IntegrityError):
            make(BASE, BASE)

    def test_check_out_cannot_precede_check_in(self):
        with pytest.raises(IntegrityError):
            make(BASE, BASE - DAY)


class TestPayments:
    def test_amount_paid_counts_captured_only(self, room):
        reservation = make()
        Payment.objects.create(
            reservation=reservation, amount=Decimal("10000"), status=Payment.Status.CAPTURED
        )
        Payment.objects.create(
            reservation=reservation, amount=Decimal("50000"), status=Payment.Status.PENDING
        )

        # A pending authorisation is not money the hotel has.
        assert reservation.amount_paid() == Decimal("10000")

    def test_balance_due_uses_the_frozen_total(self, room):
        reservation = make(total_price=Decimal("100000"))
        Payment.objects.create(
            reservation=reservation, amount=Decimal("30000"), status=Payment.Status.CAPTURED
        )

        assert reservation.balance_due() == Decimal("70000")


class TestTransitions:
    @pytest.mark.parametrize(
        ("status", "cancellable"),
        [
            (Reservation.Status.PENDING, True),
            (Reservation.Status.CONFIRMED, True),
            (Reservation.Status.CHECKED_IN, False),
            (Reservation.Status.CHECKED_OUT, False),
            (Reservation.Status.CANCELLED, False),
        ],
    )
    def test_can_cancel(self, status, cancellable):
        assert make(status=status).can_cancel() is cancellable

    def test_mark_confirmed_stamps_and_prices(self, room):
        reservation = make()
        reservation.mark_confirmed()

        assert reservation.status == Reservation.Status.CONFIRMED
        assert reservation.confirmed_at is not None
        assert reservation.total_price is not None


class TestSelectors:
    def test_arrivals_on(self):
        make(BASE, BASE + 2 * DAY, status=Reservation.Status.CONFIRMED)
        make(BASE + DAY, BASE + 3 * DAY, status=Reservation.Status.CONFIRMED)

        assert arrivals_on(BASE).count() == 1

    def test_arrivals_exclude_cancelled(self):
        make(BASE, BASE + 2 * DAY, status=Reservation.Status.CANCELLED)
        assert arrivals_on(BASE).count() == 0

    def test_departures_on(self):
        make(BASE - 2 * DAY, BASE, status=Reservation.Status.CHECKED_IN)
        assert departures_on(BASE).count() == 1

    def test_in_house_is_half_open(self):
        """A guest checking out on the 5th is not in house on the 5th."""
        make(BASE, BASE + 2 * DAY, status=Reservation.Status.CHECKED_IN)

        assert in_house(BASE).count() == 1
        assert in_house(BASE + DAY).count() == 1
        assert in_house(BASE + 2 * DAY).count() == 0
