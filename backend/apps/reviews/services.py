"""Write-side business logic for reviews."""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.common.utils import active_language
from apps.reviews.models import Review


@transaction.atomic
def submit_review(*, data: dict) -> Review:
    """Store a submission in the moderation queue.

    `status` is not taken from the caller and is not in the create serializer's
    fields, so there is no path by which a submission arrives pre-approved.
    """
    return Review.objects.create(
        **data,
        status=Review.Status.PENDING,
        language=active_language(),
    )


@transaction.atomic
def moderate(*, review: Review, status: str, actor=None) -> Review:
    """Approve or reject a pending review.

    `published_at` is stamped on approval and is what the public ordering uses,
    so an old review approved today appears as reviewed today rather than
    silently backdated into the middle of the list.
    """
    review.status = status

    if status == Review.Status.APPROVED and review.published_at is None:
        review.published_at = timezone.now()

    review.save(update_fields=["status", "published_at"])
    return review
