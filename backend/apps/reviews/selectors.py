"""Read-side queries for reviews."""

from __future__ import annotations

from django.db.models import Avg, Count, QuerySet

from apps.reviews.models import Review


def approved(*, room_slug: str | None = None) -> QuerySet[Review]:
    """Approved reviews only.

    The single most important filter in this app: a pending review is unvetted
    text from an anonymous stranger, and publishing it by default would put
    whatever someone typed onto the hotel's own website.
    """
    queryset = Review.objects.filter(status=Review.Status.APPROVED).select_related("room")
    if room_slug:
        queryset = queryset.filter(room__slug=room_slug)
    return queryset


def rating_summary(*, room_slug: str | None = None) -> dict:
    """Average and count over approved reviews."""
    aggregate = approved(room_slug=room_slug).aggregate(
        average=Avg("rating"), count=Count("id")
    )
    average = aggregate["average"]
    return {
        "average": round(average, 2) if average is not None else None,
        "count": aggregate["count"],
    }


def moderation_queue() -> QuerySet[Review]:
    """Everything awaiting a decision. Staff-only."""
    return Review.objects.filter(status=Review.Status.PENDING).select_related("room")
