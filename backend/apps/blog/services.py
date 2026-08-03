"""Write-side business logic for the blog.

Articles are authored in the Django admin. This holds the publish transition,
which has a side effect worth keeping out of the admin form.
"""

from __future__ import annotations

import datetime as dt

from django.db import transaction

from apps.blog.models import Article


@transaction.atomic
def publish(*, article: Article, on: dt.date | None = None) -> Article:
    """Make an article live.

    `published_at` is only touched when a date is passed explicitly. That is
    deliberate: the index orders by it, so re-publishing a piece that was
    temporarily hidden must keep its original date rather than resurfacing a
    month-old post at the top as though it were news.

    The field is required by the model, so there is no "no date yet" case to
    default — a draft already carries the date it is intended to run.
    """
    article.is_published = True

    fields = ["is_published"]
    if on is not None:
        article.published_at = on
        fields.append("published_at")

    article.save(update_fields=fields)
    return article


@transaction.atomic
def unpublish(*, article: Article) -> Article:
    """Hide an article without losing its date."""
    article.is_published = False
    article.save(update_fields=["is_published"])
    return article
