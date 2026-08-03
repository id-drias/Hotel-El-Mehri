"""Query filters for reviews."""

from __future__ import annotations

import django_filters as filters

from apps.reviews.models import Review


class ReviewFilter(filters.FilterSet):
    room = filters.CharFilter(field_name="room__slug")
    min_rating = filters.NumberFilter(field_name="rating", lookup_expr="gte")
    # Deliberately no `status` filter: the queryset already restricts the public
    # to approved rows, and exposing the field would invite someone to try
    # `?status=pending` and wonder why it silently does nothing.

    class Meta:
        model = Review
        fields = ("room", "min_rating")
