"""Role-based access control, end to end over HTTP.

The booking engine tests prove the rules are right. These prove the rules
cannot be walked around — which is a separate question, and the one that
actually leaks guest data when it is wrong.
"""

from __future__ import annotations

import datetime as dt
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import GuestProfile
from apps.concierge.models import ConciergeRequest
from apps.reservations import services
from apps.reservations.models import Reservation
from apps.rooms.models import Room, RoomUnit

pytestmark = pytest.mark.django_db

User = get_user_model()
DAY = dt.timedelta(days=1)


def make_user(role, username=None):
    user = User.objects.create_user(
        username=username or role,
        email=f"{username or role}@example.dz",
        password="Str0ng-Passw0rd!",
        role=role,
    )
    if role == User.Role.GUEST:
        GuestProfile.objects.create(user=user)
    return user


def auth(client, user):
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def room():
    room = Room.objects.create(
        slug="suite-royale",
        max_adults=2,
        max_children=2,
        base_price=Decimal("40000"),
        total_units=2,
    )
    RoomUnit.objects.create(room=room, number="601")
    RoomUnit.objects.create(room=room, number="602")
    return room


@pytest.fixture
def tomorrow():
    from django.utils import timezone

    return timezone.localdate() + DAY


@pytest.fixture
def guest():
    return make_user(User.Role.GUEST, "guest1")


@pytest.fixture
def reservation(room, tomorrow, guest):
    return services.create_reservation(
        room=room,
        check_in=tomorrow,
        check_out=tomorrow + 2 * DAY,
        first_name="Amine",
        last_name="Belkacem",
        email="a@example.dz",
        phone_number="0770112233",
        guest=guest,
    )


class TestPublicBooking:
    def test_anonymous_can_create_a_reservation(self, client, room, tomorrow):
        response = client.post(
            reverse("v1:reservations:reservations-list"),
            {
                "room_slug": room.slug,
                "check_in": tomorrow.isoformat(),
                "check_out": (tomorrow + 2 * DAY).isoformat(),
                "first_name": "Sofia",
                "last_name": "Haddad",
                "email": "s@example.dz",
                "phone_number": "0661903477",
                "adults": 2,
            },
            format="json",
        )
        assert response.status_code == 201
        assert response.data["reference"].startswith("LYN-")

    def test_check_out_before_check_in_is_a_400_on_the_right_field(self, client, room, tomorrow):
        response = client.post(
            reverse("v1:reservations:reservations-list"),
            {
                "room_slug": room.slug,
                "check_in": (tomorrow + 3 * DAY).isoformat(),
                "check_out": tomorrow.isoformat(),
                "first_name": "Sofia",
                "last_name": "Haddad",
                "email": "s@example.dz",
                "phone_number": "0661903477",
            },
            format="json",
        )
        assert response.status_code == 400
        assert "check_out" in response.data

    def test_past_check_in_is_rejected(self, client, room):
        from django.utils import timezone

        response = client.post(
            reverse("v1:reservations:reservations-list"),
            {
                "room_slug": room.slug,
                "check_in": (timezone.localdate() - 5 * DAY).isoformat(),
                "check_out": (timezone.localdate() + DAY).isoformat(),
                "first_name": "Sofia",
                "last_name": "Haddad",
                "email": "s@example.dz",
                "phone_number": "0661903477",
            },
            format="json",
        )
        assert response.status_code == 400
        assert "check_in" in response.data

    def test_sold_out_returns_409_not_400(self, client, room, tomorrow):
        payload = {
            "room_slug": room.slug,
            "check_in": tomorrow.isoformat(),
            "check_out": (tomorrow + DAY).isoformat(),
            "first_name": "Sofia",
            "last_name": "Haddad",
            "email": "s@example.dz",
            "phone_number": "0661903477",
        }
        url = reverse("v1:reservations:reservations-list")
        assert client.post(url, payload, format="json").status_code == 201
        assert client.post(url, payload, format="json").status_code == 201

        # Third booking: the request is valid, the world is full.
        assert client.post(url, payload, format="json").status_code == 409


class TestOwnership:
    def test_anonymous_list_is_empty_not_everything(self, client, reservation):
        response = client.get(reverse("v1:reservations:reservations-list"))
        # Unauthenticated: DRF rejects before the queryset is consulted.
        assert response.status_code in (401, 403)

    def test_guest_sees_only_their_own(self, client, reservation, guest):
        other = make_user(User.Role.GUEST, "guest2")
        response = auth(client, other).get(reverse("v1:reservations:reservations-list"))

        assert response.status_code == 200
        assert response.data["count"] == 0

    def test_guest_cannot_read_another_guests_reservation(self, client, reservation):
        other = make_user(User.Role.GUEST, "guest2")
        response = auth(client, other).get(
            reverse("v1:reservations:reservations-detail", args=[reservation.reference])
        )
        assert response.status_code == 404  # scoped queryset, so not even a 403

    def test_guest_can_cancel_their_own(self, client, reservation, guest):
        response = auth(client, guest).post(
            reverse("v1:reservations:reservations-cancel", args=[reservation.reference]),
            {"reason": "plans changed"},
            format="json",
        )
        assert response.status_code == 200
        reservation.refresh_from_db()
        assert reservation.status == Reservation.Status.CANCELLED

    def test_staff_see_every_reservation(self, client, reservation):
        staff = make_user(User.Role.STAFF)
        response = auth(client, staff).get(reverse("v1:reservations:reservations-list"))
        assert response.status_code == 200
        assert response.data["count"] == 1


class TestConsoleAccess:
    def test_guest_role_is_locked_out_of_the_console(self, client, guest):
        response = auth(client, guest).get(reverse("v1:dashboard:stats"))
        assert response.status_code == 403

    def test_anonymous_is_locked_out_of_the_console(self, client):
        response = client.get(reverse("v1:dashboard:stats"))
        assert response.status_code in (401, 403)

    def test_staff_can_read_the_overview(self, client):
        staff = make_user(User.Role.STAFF)
        response = auth(client, staff).get(reverse("v1:dashboard:stats"))

        assert response.status_code == 200
        assert "occupancy" in response.data
        assert "arrivals" in response.data

    def test_revenue_is_withheld_from_non_managers(self, client):
        staff = make_user(User.Role.STAFF)
        response = auth(client, staff).get(reverse("v1:dashboard:stats"))
        assert "revenue_mtd" not in response.data

    def test_manager_sees_revenue(self, client):
        manager = make_user(User.Role.MANAGER)
        response = auth(client, manager).get(reverse("v1:dashboard:stats"))
        assert response.status_code == 200
        assert "revenue_mtd" in response.data

    def test_staff_cannot_cancel_a_booking(self, client, reservation):
        staff = make_user(User.Role.STAFF)
        response = auth(client, staff).post(
            reverse("v1:dashboard:admin-reservations-cancel", args=[reservation.reference]),
            {"reason": "no"},
            format="json",
        )
        assert response.status_code == 403

    def test_manager_can_cancel_a_booking(self, client, reservation):
        manager = make_user(User.Role.MANAGER)
        response = auth(client, manager).post(
            reverse("v1:dashboard:admin-reservations-cancel", args=[reservation.reference]),
            {"reason": "duplicate"},
            format="json",
        )
        assert response.status_code == 200

    def test_staff_can_approve_a_pending_booking(self, client, reservation):
        staff = make_user(User.Role.STAFF)
        response = auth(client, staff).post(
            reverse("v1:dashboard:admin-reservations-confirm", args=[reservation.reference])
        )
        assert response.status_code == 200
        reservation.refresh_from_db()
        assert reservation.status == Reservation.Status.CONFIRMED


class TestInventoryToggles:
    def test_staff_can_change_housekeeping_status(self, client, room):
        staff = make_user(User.Role.STAFF)
        unit = room.units.first()

        response = auth(client, staff).patch(
            reverse("v1:dashboard:admin-units-update-room-status", args=[unit.id]),
            {"housekeeping": RoomUnit.Housekeeping.MAINTENANCE},
            format="json",
        )

        assert response.status_code == 200
        unit.refresh_from_db()
        assert unit.housekeeping == RoomUnit.Housekeeping.MAINTENANCE

    def test_invalid_housekeeping_value_is_rejected(self, client, room):
        staff = make_user(User.Role.STAFF)
        unit = room.units.first()

        response = auth(client, staff).patch(
            reverse("v1:dashboard:admin-units-update-room-status", args=[unit.id]),
            {"housekeeping": "on_fire"},
            format="json",
        )
        assert response.status_code == 400

    def test_only_managers_set_rate_overrides(self, client, room, tomorrow):
        staff = make_user(User.Role.STAFF)
        url = reverse(
            "v1:dashboard:admin-rooms-set-rate", args=[room.slug, tomorrow.isoformat()]
        )
        assert auth(client, staff).put(url, {"price": "50000"}, format="json").status_code == 403

        manager = make_user(User.Role.MANAGER)
        response = auth(APIClient(), manager).put(url, {"price": "50000"}, format="json")
        assert response.status_code == 200


class TestConciergeTransitions:
    def test_illegal_jump_is_rejected(self, client):
        staff = make_user(User.Role.STAFF)
        request_obj = ConciergeRequest.objects.create(
            kind=ConciergeRequest.Kind.SPA, summary="Massage at 17:00"
        )

        response = auth(client, staff).patch(
            reverse("v1:dashboard:admin-concierge-update-status", args=[request_obj.id]),
            {"status": ConciergeRequest.Status.RESOLVED},
            format="json",
        )
        # new -> resolved skips the work; the model's state machine forbids it.
        assert response.status_code == 400

    def test_legal_advance_stamps_the_assignee(self, client):
        staff = make_user(User.Role.STAFF)
        request_obj = ConciergeRequest.objects.create(
            kind=ConciergeRequest.Kind.TRANSPORT, summary="Airport transfer"
        )

        response = auth(client, staff).patch(
            reverse("v1:dashboard:admin-concierge-update-status", args=[request_obj.id]),
            {"status": ConciergeRequest.Status.IN_PROGRESS},
            format="json",
        )

        assert response.status_code == 200
        request_obj.refresh_from_db()
        assert request_obj.status == ConciergeRequest.Status.IN_PROGRESS
        assert request_obj.assigned_to == staff
