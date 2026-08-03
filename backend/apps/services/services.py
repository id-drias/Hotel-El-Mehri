"""Write-side business logic for services.

Service copy is edited in the Django admin; nothing here is reachable from a
public endpoint. The module exists so the app matches the layout of every other
one — an empty `services.py` is easier to find than an absent one.
"""

from __future__ import annotations

from django.db import transaction

from apps.services.models import EventHall, Service


@transaction.atomic
def set_published(*, service: Service, is_published: bool) -> Service:
    """Publish or retire a service and everything hanging off it.

    Halls follow their parent: an events service pulled from the site with its
    halls still live would leave three orphaned pages linking back to a 404.
    """
    if service.is_published == is_published:
        return service

    service.is_published = is_published
    service.save(update_fields=["is_published"])

    EventHall.objects.filter(service=service).update(is_published=is_published)
    return service
