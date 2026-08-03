"""Public reservation endpoints: availability search and the booking funnel.

Ownership and console behaviour are covered in `apps/dashboard/tests`; this file
is the guest-facing surface.
"""

from __future__ import annotations

import datetime as dt
from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.reservations.models import Reservation
from apps.rooms.models import RateOverride, Room, RoomTranslation, RoomUnit

pytestmark = pytest.mark.django_db

DAY = dt.timedelta(days=1)


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def tomorrow():
    return timezone.localdate() + DAY


@pytest.fixture
def room():
    room = Room.objects.create(
        slug="suite-royale",
        base_price=Decimal("40000"),
        max_adults=2,
        max_children=2,
        total_units=2,
    )
    RoomTranslation.objects.create(room=room, language="fr", name="Suite Royale")
    RoomUnit.objects.create(room=room, number="601")
    RoomUnit.objects.create(room=room, number="602")
    return room


def payload(room, check_in, check_out, **overrides):
    return {
        "room_slug": room.slug,
        "check_in": check_in.isoformat(),
        "check_out": check_out.isoformat(),
        "first_name": "Sofia",
        "last_name": "Haddad",
        "email": "s@example.dz",
        "phone_number": "0661903477",
        "adults": 2,
        **overrides,
    }


class TestAvailability:
    def test_is_public(self, client, room, tomorrow):
        response = client.get(
            reverse("v1:reservations:availability"),
            {"check_in": tomorrow.isoformat(), "check_out": (tomorrow + 2 * DAY).isoformat()},
        )
        assert response.status_code == 200
        assert response.data["results"][0]["units_available"] == 2

    def test_reflects_existing_bookings(self, client, room, tomorrow):
        client.post(
            reverse("v1:reservations:reservations-list"),
            payload(room, tomorrow, tomorrow + 2 * DAY),
            format="json",
        )

        response = client.get(
            reverse("v1:reservations:availability"),
            {"check_in": tomorrow.isoformat(), "check_out": (tomorrow + 2 * DAY).isoformat()},
        )
        assert response.data["results"][0]["units_available"] == 1

    def test_prices_the_whole_stay_with_overrides(self, client, room, tomorrow):
        RateOverride.objects.create(room=room, date=tomorrow, price=Decimal("55000"))

        response = client.get(
            reverse("v1:reservations:availability"),
            {"check_in": tomorrow.isoformat(), "check_out": (tomorrow + 2 * DAY).isoformat()},
        )
        # 55 000 + 40 000, not 2 x either.
        assert Decimal(response.data["results"][0]["total_price"]) == Decimal("95000")

    def test_rejects_a_reversed_range(self, client, room, tomorrow):
        response = client.get(
            reverse("v1:reservations:availability"),
            {"check_in": (tomorrow + 3 * DAY).isoformat(), "check_out": tomorrow.isoformat()},
        )
        assert response.status_code == 400

    def test_stop_sold_rooms_are_excluded(self, client, room, tomorrow):
        room.is_bookable = False
        room.save(update_fields=["is_bookable"])

        response = client.get(
            reverse("v1:reservations:availability"),
            {"check_in": tomorrow.isoformat(), "check_out": (tomorrow + DAY).isoformat()},
        )
        assert response.data["results"] == []


class TestBooking:
    def test_anonymous_may_book(self, client, room, tomorrow):
        response = client.post(
            reverse("v1:reservations:reservations-list"),
            payload(room, tomorrow, tomorrow + 2 * DAY),
            format="json",
        )
        assert response.status_code == 201
        assert Reservation.objects.count() == 1

    def test_booking_holds_a_physical_unit(self, client, room, tomorrow):
        client.post(
            reverse("v1:reservations:reservations-list"),
            payload(room, tomorrow, tomorrow + 2 * DAY),
            format="json",
        )
        assert Reservation.objects.get().assignments.count() == 1

    def test_new_bookings_start_pending(self, client, room, tomorrow):
        client.post(
            reverse("v1:reservations:reservations-list"),
            payload(room, tomorrow, tomorrow + 2 * DAY),
            format="json",
        )
        assert Reservation.objects.get().status == Reservation.Status.PENDING

    def test_over_capacity_is_rejected(self, client, room, tomorrow):
        response = client.post(
            reverse("v1:reservations:reservations-list"),
            payload(room, tomorrow, tomorrow + 2 * DAY, adults=6),
            format="json",
        )
        assert response.status_code == 400
        assert "adults" in response.data

    def test_stay_length_is_capped(self, client, room, tomorrow):
        response = client.post(
            reverse("v1:reservations:reservations-list"),
            payload(room, tomorrow, tomorrow + 60 * DAY),
            format="json",
        )
        assert response.status_code == 400

    def test_unusable_phone_number_is_rejected(self, client, room, tomorrow):
        response = client.post(
            reverse("v1:reservations:reservations-list"),
            payload(room, tomorrow, tomorrow + 2 * DAY, phone_number="n/a"),
            format="json",
        )
        assert response.status_code == 400
        assert "phone_number" in response.data

    def test_status_cannot_be_set_by_the_caller(self, client, room, tomorrow):
        client.post(
            reverse("v1:reservations:reservations-list"),
            payload(room, tomorrow, tomorrow + 2 * DAY, status="confirmed"),
            format="json",
        )
        # A guest confirming their own booking would skip payment entirely.
        assert Reservation.objects.get().status == Reservation.Status.PENDING


class TestThrottle:
    def test_bookings_are_rate_limited(self, client, room, tomorrow):
        url = reverse("v1:reservations:reservations-list")
        statuses = [
            client.post(url, payload(room, tomorrow, tomorrow + DAY), format="json").status_code
            for _ in range(12)
        ]
        # 10/hour in settings; the room also sells out after two.
        assert 429 in statuses
