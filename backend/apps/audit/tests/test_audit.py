"""The audit trail: that it records, that it cannot be rewritten, and that
only administrators can read it."""

from __future__ import annotations

import datetime as dt
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.audit.models import AuditLog
from apps.reservations import services
from apps.rooms.models import Room, RoomUnit

pytestmark = pytest.mark.django_db

User = get_user_model()
DAY = dt.timedelta(days=1)
STRONG = "Str0ng-Passw0rd!"


@pytest.fixture
def room():
    room = Room.objects.create(
        slug="suite-royale", max_adults=2, base_price=Decimal("40000"), total_units=1
    )
    RoomUnit.objects.create(room=room, number="601")
    return room


@pytest.fixture
def manager():
    return User.objects.create_user(
        username="manager", email="m@example.dz", password=STRONG, role=User.Role.MANAGER
    )


@pytest.fixture
def today():
    from django.utils import timezone

    return timezone.localdate() + DAY


def book(room, check_in, check_out, **kwargs):
    return services.create_reservation(
        room=room,
        check_in=check_in,
        check_out=check_out,
        first_name="Amine",
        last_name="Belkacem",
        email="a@example.dz",
        phone_number="0770112233",
        **kwargs,
    )


class TestRecording:
    def test_creating_a_reservation_is_logged(self, room, today):
        reservation = book(room, today, today + 2 * DAY)

        entry = AuditLog.objects.get(action=AuditLog.Action.RESERVATION_CREATE)
        assert entry.target_type == "Reservation"
        assert entry.target_id == str(reservation.pk)
        assert entry.target_label == reservation.reference
        assert entry.changes["room"] == room.slug

    def test_confirmation_records_the_actor_and_the_transition(self, room, today, manager):
        reservation = book(room, today, today + 2 * DAY)
        services.confirm_reservation(reservation=reservation, actor=manager)

        entry = AuditLog.objects.get(action=AuditLog.Action.RESERVATION_CONFIRM)
        assert entry.actor == manager
        assert entry.changes["status"] == ["pending", "confirmed"]

    def test_cancellation_records_the_released_units(self, room, today, manager):
        reservation = book(room, today, today + 2 * DAY)
        services.cancel_reservation(reservation=reservation, actor=manager, reason="duplicate")

        entry = AuditLog.objects.get(action=AuditLog.Action.RESERVATION_CANCEL)
        assert entry.changes["units_released"] == ["601"]
        assert entry.note == "duplicate"

    def test_payment_is_logged_without_card_data(self, room, today, manager):
        reservation = book(room, today, today + 2 * DAY)
        services.record_payment(
            reservation=reservation,
            amount=Decimal("50000"),
            method="cib",
            provider_reference="tok_abc123",
            actor=manager,
        )

        entry = AuditLog.objects.get(action=AuditLog.Action.PAYMENT_RECORD)
        assert entry.changes["amount"] == "50000"
        # Only the amount, status and method are recorded — nothing that could
        # be a card number even by accident.
        assert set(entry.changes) == {"amount", "status", "method"}

    def test_entry_survives_the_actor_being_deleted(self, room, today, manager):
        reservation = book(room, today, today + 2 * DAY)
        services.confirm_reservation(reservation=reservation, actor=manager)
        manager.delete()

        entry = AuditLog.objects.get(action=AuditLog.Action.RESERVATION_CONFIRM)
        assert entry.actor is None
        assert entry.changes["status"] == ["pending", "confirmed"]


class TestAppendOnly:
    def test_an_entry_cannot_be_modified(self, room, today):
        book(room, today, today + 2 * DAY)
        entry = AuditLog.objects.first()

        entry.note = "tampered"
        with pytest.raises(ValueError):
            entry.save()

    def test_the_api_exposes_no_write_verbs(self, room, today):
        admin = User.objects.create_user(
            username="root", email="r@example.dz", password=STRONG, role=User.Role.ADMIN
        )
        client = APIClient()
        client.force_authenticate(user=admin)

        assert client.post(reverse("v1:dashboard:admin-audit-list"), {}).status_code == 405


class TestAccess:
    @pytest.fixture(autouse=True)
    def _some_history(self, room, today):
        book(room, today, today + 2 * DAY)

    @pytest.mark.parametrize(
        ("role", "allowed"),
        [
            (User.Role.GUEST, False),
            (User.Role.STAFF, False),
            (User.Role.MANAGER, False),
            (User.Role.ADMIN, True),
        ],
    )
    def test_only_administrators_read_the_trail(self, role, allowed):
        user = User.objects.create_user(
            username=f"u-{role}", email=f"{role}@example.dz", password=STRONG, role=role
        )
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get(reverse("v1:dashboard:admin-audit-list"))
        assert (response.status_code == 200) is allowed

    def test_anonymous_is_refused(self):
        response = APIClient().get(reverse("v1:dashboard:admin-audit-list"))
        assert response.status_code in (401, 403)

    def test_can_filter_by_target(self, room, today):
        admin = User.objects.create_user(
            username="root", email="r@example.dz", password=STRONG, role=User.Role.ADMIN
        )
        client = APIClient()
        client.force_authenticate(user=admin)

        response = client.get(
            reverse("v1:dashboard:admin-audit-list"), {"target_type": "Reservation"}
        )
        assert response.status_code == 200
        assert response.data["count"] >= 1


class TestConsoleMutationsAreLogged:
    def test_housekeeping_change_is_attributed(self, room):
        staff = User.objects.create_user(
            username="hk", email="hk@example.dz", password=STRONG, role=User.Role.STAFF
        )
        client = APIClient()
        client.force_authenticate(user=staff)

        unit = room.units.first()
        client.patch(
            reverse("v1:dashboard:admin-units-update-room-status", args=[unit.id]),
            {"housekeeping": RoomUnit.Housekeeping.MAINTENANCE},
            format="json",
        )

        entry = AuditLog.objects.get(action=AuditLog.Action.ROOM_STATUS)
        assert entry.actor == staff
        assert entry.changes["housekeeping"] == ["clean", "maintenance"]

    def test_rate_override_records_the_previous_price(self, room, today):
        manager = User.objects.create_user(
            username="mgr", email="mgr@example.dz", password=STRONG, role=User.Role.MANAGER
        )
        client = APIClient()
        client.force_authenticate(user=manager)

        url = reverse("v1:dashboard:admin-rooms-set-rate", args=[room.slug, today.isoformat()])
        client.put(url, {"price": "50000"}, format="json")
        client.put(url, {"price": "55000"}, format="json")

        latest = AuditLog.objects.filter(action=AuditLog.Action.RATE_OVERRIDE).first()
        assert latest.changes["price"] == ["50000.00", "55000.00"]


class TestFailedLogin:
    def test_failed_sign_in_is_recorded_with_the_ip(self):
        User.objects.create_user(
            username="sofia", email="s@example.dz", password=STRONG, role=User.Role.STAFF
        )
        client = APIClient()

        response = client.post(
            reverse("v1:accounts:login"),
            {"username": "sofia", "password": "wrong"},
            format="json",
            REMOTE_ADDR="203.0.113.9",
        )

        assert response.status_code == 401
        entry = AuditLog.objects.get(action=AuditLog.Action.AUTH_LOGIN_FAILED)
        assert entry.changes["username"] == "sofia"
        assert entry.ip_address == "203.0.113.9"
        # The attempted password must never appear anywhere in the entry.
        assert "wrong" not in str(entry.changes)

    def test_unknown_username_is_still_recorded(self):
        APIClient().post(
            reverse("v1:accounts:login"),
            {"username": "nobody", "password": "guess"},
            format="json",
        )
        assert AuditLog.objects.filter(action=AuditLog.Action.AUTH_LOGIN_FAILED).count() == 1
