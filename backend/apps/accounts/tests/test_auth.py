"""Registration, login, refresh and the privilege-escalation guards."""

from __future__ import annotations

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db

User = get_user_model()

STRONG = "Str0ng-Passw0rd!"


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def payload():
    return {
        "username": "sofia",
        "email": "Sofia@Example.DZ",
        "password": STRONG,
        "password_confirm": STRONG,
        "first_name": "Sofia",
        "last_name": "Haddad",
        "phone_number": "0661903477",
    }


class TestRegistration:
    def test_creates_a_guest_with_a_profile(self, client, payload):
        response = client.post(reverse("v1:accounts:register"), payload, format="json")

        assert response.status_code == 201
        user = User.objects.get(username="sofia")
        assert user.role == User.Role.GUEST
        assert hasattr(user, "guest_profile")

    def test_email_is_normalised_to_lowercase(self, client, payload):
        client.post(reverse("v1:accounts:register"), payload, format="json")
        assert User.objects.get(username="sofia").email == "sofia@example.dz"

    def test_password_is_hashed_not_stored(self, client, payload):
        client.post(reverse("v1:accounts:register"), payload, format="json")
        user = User.objects.get(username="sofia")
        assert user.password != STRONG
        assert user.check_password(STRONG)

    def test_role_in_the_body_cannot_escalate(self, client, payload):
        """The oldest trick: POST your way to admin during signup."""
        response = client.post(
            reverse("v1:accounts:register"), {**payload, "role": "admin"}, format="json"
        )
        assert response.status_code == 201
        assert User.objects.get(username="sofia").role == User.Role.GUEST

    def test_mismatched_confirmation_is_rejected(self, client, payload):
        response = client.post(
            reverse("v1:accounts:register"),
            {**payload, "password_confirm": "something-else"},
            format="json",
        )
        assert response.status_code == 400
        assert "password_confirm" in response.data

    def test_weak_password_is_rejected(self, client, payload):
        response = client.post(
            reverse("v1:accounts:register"),
            {**payload, "password": "12345678", "password_confirm": "12345678"},
            format="json",
        )
        assert response.status_code == 400
        assert "password" in response.data

    def test_duplicate_email_is_rejected(self, client, payload):
        client.post(reverse("v1:accounts:register"), payload, format="json")
        response = client.post(
            reverse("v1:accounts:register"), {**payload, "username": "other"}, format="json"
        )
        assert response.status_code == 400
        assert "email" in response.data

    def test_refresh_token_is_httponly_and_not_in_the_body(self, client, payload):
        response = client.post(reverse("v1:accounts:register"), payload, format="json")

        assert "refresh" not in response.data  # never readable by JavaScript
        cookie = response.cookies[settings.REFRESH_COOKIE_NAME]
        assert cookie["httponly"]


class TestLogin:
    @pytest.fixture(autouse=True)
    def _account(self, client, payload):
        client.post(reverse("v1:accounts:register"), payload, format="json")

    def test_returns_access_and_role(self, client):
        response = client.post(
            reverse("v1:accounts:login"),
            {"username": "sofia", "password": STRONG},
            format="json",
        )
        assert response.status_code == 200
        assert "access" in response.data
        assert response.data["role"] == User.Role.GUEST

    def test_wrong_password_is_401(self, client):
        response = client.post(
            reverse("v1:accounts:login"),
            {"username": "sofia", "password": "wrong"},
            format="json",
        )
        assert response.status_code == 401

    def test_refresh_works_from_the_cookie_alone(self, client):
        client.post(
            reverse("v1:accounts:login"),
            {"username": "sofia", "password": STRONG},
            format="json",
        )
        # No body: the cookie set by login is the only credential.
        response = client.post(reverse("v1:accounts:refresh"), {}, format="json")

        assert response.status_code == 200
        assert "access" in response.data

    def test_refresh_without_a_cookie_is_401(self, client):
        response = APIClient().post(reverse("v1:accounts:refresh"), {}, format="json")
        assert response.status_code == 401


class TestMe:
    def test_requires_authentication(self, client):
        assert client.get(reverse("v1:accounts:me")).status_code in (401, 403)

    def test_returns_the_caller(self, client):
        user = User.objects.create_user(
            username="karim", email="k@example.dz", password=STRONG, role=User.Role.GUEST
        )
        client.force_authenticate(user=user)

        response = client.get(reverse("v1:accounts:me"))
        assert response.status_code == 200
        assert response.data["username"] == "karim"

    def test_role_cannot_be_patched_upward(self, client):
        user = User.objects.create_user(
            username="karim", email="k@example.dz", password=STRONG, role=User.Role.GUEST
        )
        client.force_authenticate(user=user)

        client.patch(reverse("v1:accounts:me"), {"role": "admin"}, format="json")

        user.refresh_from_db()
        assert user.role == User.Role.GUEST


class TestRolePredicates:
    @pytest.mark.parametrize(
        ("role", "staff", "manager", "admin"),
        [
            (User.Role.GUEST, False, False, False),
            (User.Role.STAFF, True, False, False),
            (User.Role.MANAGER, True, True, False),
            (User.Role.ADMIN, True, True, True),
        ],
    )
    def test_predicates_match_the_hierarchy(self, role, staff, manager, admin):
        user = User(role=role)
        assert user.is_staff_member is staff
        assert user.is_manager is manager
        assert user.is_admin_role is admin
