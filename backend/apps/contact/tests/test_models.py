"""ContactMessage model and service layer."""

from __future__ import annotations

import pytest
from django.core import mail

from apps.contact.models import ContactMessage
from apps.contact.selectors import inbox, unhandled_count
from apps.contact.services import mark_handled, notify_staff

pytestmark = pytest.mark.django_db


def make(**overrides) -> ContactMessage:
    return ContactMessage.objects.create(
        **{
            "full_name": "Sofia Haddad",
            "email": "sofia@example.dz",
            "subject": "Séminaire",
            "content": "Bonjour, je souhaite organiser un séminaire.",
            **overrides,
        }
    )


class TestModel:
    def test_defaults(self):
        message = make()
        assert message.is_handled is False
        assert message.language == "fr"

    def test_newest_first(self):
        make(subject="first")
        make(subject="second")
        assert [m.subject for m in ContactMessage.objects.all()] == ["second", "first"]

    def test_str_is_useful_in_the_admin_list(self):
        assert str(make()) == "Séminaire - Sofia Haddad"


class TestSelectors:
    def test_inbox_can_filter_by_handled(self):
        make(subject="open")
        make(subject="done", is_handled=True)

        assert inbox(handled=False).count() == 1
        assert inbox(handled=True).count() == 1
        assert inbox().count() == 2

    def test_unhandled_count(self):
        make()
        make(is_handled=True)
        assert unhandled_count() == 1


class TestServices:
    def test_mark_handled_is_idempotent(self):
        message = make()
        mark_handled(message=message)
        mark_handled(message=message)

        message.refresh_from_db()
        assert message.is_handled is True

    def test_notify_staff_sends_one_email(self, settings):
        settings.STAFF_NOTIFICATION_EMAIL = "commercial@example.dz"
        notify_staff(message=make())

        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == ["commercial@example.dz"]

    def test_notify_staff_is_a_no_op_without_a_recipient(self, settings):
        settings.STAFF_NOTIFICATION_EMAIL = ""
        notify_staff(message=make())
        assert mail.outbox == []

    def test_notify_staff_swallows_mailer_failures(self, settings, monkeypatch):
        """A broken SMTP server must never surface as a 500 on the form."""
        settings.STAFF_NOTIFICATION_EMAIL = "commercial@example.dz"

        def explode(*args, **kwargs):
            raise OSError("smtp unreachable")

        monkeypatch.setattr("apps.contact.services.send_mail", explode)
        notify_staff(message=make())  # must not raise
