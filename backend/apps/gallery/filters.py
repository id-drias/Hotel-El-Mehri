"""Query filters for the gallery."""

from __future__ import annotations

import django_filters as filters

from apps.gallery.models import MediaAsset, MediaCategory


class MediaAssetFilter(filters.FilterSet):
    category = filters.CharFilter(field_name="category__slug")
    tag = filters.ChoiceFilter(field_name="category__tag", choices=MediaCategory.Tag.choices)

    class Meta:
        model = MediaAsset
        fields = ("category", "tag")
