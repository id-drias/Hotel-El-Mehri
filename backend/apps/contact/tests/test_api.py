"""Contact form: public write, staff-only read."""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.urls import reverse
from rest_framework.test import APIClient

from apps.contact.models import ContactMessage

pytestmark = pytest.mark.django_db

User = get_user_model()
STRONG = "Str0ng-Passw0rd!"

VALID = {
    "full_name": "Sofia Haddad",
    "email": "Sofia@Example.DZ",
    "phone_number": "0661903477",
    "subject": "Séminaire en septembre",
    "content": "Bonjour, je souhaite organiser un séminaire pour 80 personnes.",
}


@pytest.fixture
def client():
    return APIClient()


def staff_client(role=User.Role.STAFF):
    user = User.objects.create_user(
        username=f"u-{role}", email=f"{role}@example.dz", password=STRONG, role=role
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client


class TestSubmission:
    def test_anyone_may_submit(self, client):
        response = client.post(reverse("v1:contact:contact-list"), VALID, format="json")
        assert response.status_code == 201
        assert ContactMessage.objects.count() == 1

    def test_email_is_normalised(self, client):
        client.post(reverse("v1:contact:contact-list"), VALID, format="json")
        assert ContactMessage.objects.get().email == "sofia@example.dz"

    def test_language_is_taken_from_the_request_not_the_body(self, client):
        client.post(
            reverse("v1:contact:contact-list"),
            {**VALID, "language": "en"},
            format="json",
            HTTP_ACCEPT_LANGUAGE="ar",
        )
        assert ContactMessage.objects.get().language == "ar"

    def test_handled_flag_cannot_be_set_by_the_caller(self, client):
        client.post(
            reverse("v1:contact:contact-list"), {**VALID, "is_handled": True}, format="json"
        )
        assert ContactMessage.objects.get().is_handled is False

    def test_the_message_is_not_echoed_back(self, client):
        """The inbox is staff-only; echoing the row would be a read channel."""
        response = client.post(reverse("v1:contact:contact-list"), VALID, format="json")
        assert "content" not in response.data
        assert "detail" in response.data

    def test_staff_are_notified(self, client, django_capture_on_commit_callbacks):
        """The notification is deliberately deferred to `transaction.on_commit`.

        That means it does not fire inside a test's rollback-only transaction —
        which is the design working, not a bug: a mail server timing out must
        never roll back a stored enquiry. `django_capture_on_commit_callbacks`
        runs the queued callbacks so the behaviour can still be asserted.
        """
        with django_capture_on_commit_callbacks(execute=True):
            client.post(reverse("v1:contact:contact-list"), VALID, format="json")

        assert len(mail.outbox) == 1
        assert "Séminaire en septembre" in mail.outbox[0].subject

    def test_a_broken_mailer_does_not_lose_the_enquiry(
        self, client, django_capture_on_commit_callbacks, monkeypatch
    ):
        def explode(*args, **kwargs):
            raise OSError("smtp unreachable")

        monkeypatch.setattr("apps.contact.services.send_mail", explode)

        with django_capture_on_commit_callbacks(execute=True):
            response = client.post(reverse("v1:contact:contact-list"), VALID, format="json")

        # The guest sees success and the hotel still has the message.
        assert response.status_code == 201
        assert ContactMessage.objects.count() == 1

    def test_short_message_is_rejected(self, client):
        response = client.post(
            reverse("v1:contact:contact-list"), {**VALID, "content": "hi"}, format="json"
        )
        assert response.status_code == 400
        assert "content" in response.data

    def test_link_spam_is_rejected(self, client):
        response = client.post(
            reverse("v1:contact:contact-list"),
            {**VALID, "content": "buy " + "http://spam.example " * 5},
            format="json",
        )
        assert response.status_code == 400

    def test_reads_are_never_throttled_by_the_write_limit(self, client):
        """Regression: a class-level throttle_scope also limited GETs."""
        staff = staff_client()
        for _ in range(8):
            assert staff.get(reverse("v1:contact:contact-list")).status_code == 200


class TestInboxAccess:
    @pytest.fixture(autouse=True)
    def _a_message(self, client):
        client.post(reverse("v1:contact:contact-list"), VALID, format="json")

    def test_anonymous_cannot_list(self, client):
        assert client.get(reverse("v1:contact:contact-list")).status_code in (401, 403)

    def test_guest_cannot_list(self):
        response = staff_client(User.Role.GUEST).get(reverse("v1:contact:contact-list"))
        assert response.status_code == 403

    def test_staff_can_list(self):
        response = staff_client().get(reverse("v1:contact:contact-list"))
        assert response.status_code == 200
        assert response.data["count"] == 1

    def test_staff_can_mark_handled(self):
        message = ContactMessage.objects.get()
        response = staff_client().patch(
            reverse("v1:contact:contact-detail", args=[message.pk]),
            {"is_handled": True},
            format="json",
        )
        assert response.status_code == 200

        message.refresh_from_db()
        assert message.is_handled is True

    def test_staff_cannot_rewrite_the_message(self):
        message = ContactMessage.objects.get()
        staff_client().patch(
            reverse("v1:contact:contact-detail", args=[message.pk]),
            {"content": "edited"},
            format="json",
        )

        message.refresh_from_db()
        # The enquiry is a record of what was actually sent.
        assert message.content != "edited"


class TestThrottle:
    def test_submissions_are_limited(self, client):
        url = reverse("v1:contact:contact-list")
        statuses = [
            client.post(url, {**VALID, "subject": f"Enquiry {i}"}, format="json").status_code
            for i in range(7)
        ]
        # 5/hour configured in settings.
        assert statuses.count(201) == 5
        assert 429 in statuses
