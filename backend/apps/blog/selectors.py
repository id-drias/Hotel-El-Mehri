"""Read-side queries for the blog."""

from __future__ import annotations

from django.db.models import QuerySet
from django.utils import timezone

from apps.blog.models import Article


def published_articles() -> QuerySet[Article]:
    """Published articles whose publication date has arrived.

    `is_published` alone is not enough: an editor scheduling a piece for next
    Monday sets the flag today, and the flag without the date check would put it
    live immediately.
    """
    return (
        Article.objects.filter(is_published=True, published_at__lte=timezone.localdate())
        .prefetch_related("translations")
        .order_by("-published_at")
    )


def related_articles(*, article: Article, limit: int = 3) -> QuerySet[Article]:
    """Other recent articles, for the foot of a post."""
    return published_articles().exclude(pk=article.pk)[:limit]
