"""Read-side queries for contact messages.

Staff-only: the public endpoint is write-only, so nothing here is reachable
without a console role.
"""

from __future__ import annotations

from django.db.models import QuerySet

from apps.contact.models import ContactMessage


def inbox(*, handled: bool | None = None) -> QuerySet[ContactMessage]:
    queryset = ContactMessage.objects.all()
    if handled is not None:
        queryset = queryset.filter(is_handled=handled)
    return queryset


def unhandled_count() -> int:
    return ContactMessage.objects.filter(is_handled=False).count()
