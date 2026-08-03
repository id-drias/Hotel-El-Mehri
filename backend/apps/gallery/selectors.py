"""Read-side queries for the gallery (keep views thin)."""

from __future__ import annotations

from django.db.models import QuerySet

from apps.gallery.models import MediaAsset, MediaCategory


def categories() -> QuerySet[MediaCategory]:
    """Published filter tabs, with their names prefetched."""
    return MediaCategory.objects.published().prefetch_related("translations")


def assets(*, category_slug: str | None = None, tag: str | None = None) -> QuerySet[MediaAsset]:
    """Published images in the editor's order.

    `select_related` on the category and `prefetch_related` on its translations:
    without both, a 24-image page asks the database 49 times.
    """
    queryset = (
        MediaAsset.objects.published()
        .select_related("category")
        .prefetch_related("category__translations")
    )

    if category_slug:
        queryset = queryset.filter(category__slug=category_slug)
    if tag:
        queryset = queryset.filter(category__tag=tag)

    return queryset
