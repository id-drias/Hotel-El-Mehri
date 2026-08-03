"""Read-side queries for services and event halls."""

from __future__ import annotations

from django.db.models import QuerySet

from apps.services.models import EventHall, Service


def services(*, category: str | None = None) -> QuerySet[Service]:
    """Published services, translations prefetched."""
    queryset = Service.objects.published().prefetch_related("translations")
    if category:
        queryset = queryset.filter(category=category)
    return queryset


def halls() -> QuerySet[EventHall]:
    """Published event halls with their parent service."""
    return (
        EventHall.objects.published()
        .select_related("service")
        .prefetch_related("translations", "service__translations")
    )
