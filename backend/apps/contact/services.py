"""Write-side business logic for contact messages."""

from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction

from apps.common.utils import active_language, client_ip
from apps.contact.models import ContactMessage
from config import hotel_config

logger = logging.getLogger(__name__)


@transaction.atomic
def create_message(*, data: dict, request=None) -> ContactMessage:
    """Store an enquiry and notify the commercial team."""
    message = ContactMessage.objects.create(
        **data,
        language=active_language(),
        ip_address=client_ip(request) if request is not None else None,
    )

    # After the row is safely written, never before. A mail server timing out
    # must not lose the enquiry — the hotel can read it in the admin either way.
    transaction.on_commit(lambda: notify_staff(message=message))

    return message


def notify_staff(*, message: ContactMessage) -> None:
    """Email the commercial address. Failures are logged, never raised."""
    recipient = getattr(settings, "STAFF_NOTIFICATION_EMAIL", "")
    if not recipient:
        return

    try:
        send_mail(
            subject=f"[{hotel_config.EMAIL_SUBJECT_PREFIX}] {message.subject}",
            message=(
                f"From: {message.full_name} <{message.email}>\n"
                f"Phone: {message.phone_number or '—'}\n"
                f"Language: {message.language}\n\n"
                f"{message.content}"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            fail_silently=False,
        )
    except Exception:  # noqa: BLE001 - a broken mailer must not break the form
        logger.exception("Could not send contact notification for message %s", message.pk)


@transaction.atomic
def mark_handled(*, message: ContactMessage, handled: bool = True) -> ContactMessage:
    if message.is_handled != handled:
        message.is_handled = handled
        message.save(update_fields=["is_handled"])
    return message
