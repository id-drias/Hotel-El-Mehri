"""Query filters for Rooms & suites."""

from __future__ import annotations

import django_filters as filters

from apps.rooms.models import Room


class RoomFilter(filters.FilterSet):
    """Capacity and price filters for the rooms index."""

    min_adults = filters.NumberFilter(field_name="max_adults", lookup_expr="gte")
    min_children = filters.NumberFilter(field_name="max_children", lookup_expr="gte")
    max_price = filters.NumberFilter(field_name="base_price", lookup_expr="lte")
    bookable = filters.BooleanFilter(field_name="is_bookable")

    class Meta:
        model = Room
        fields = ("min_adults", "min_children", "max_price", "bookable")
