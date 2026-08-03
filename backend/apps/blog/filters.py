"""Query filters for the blog."""

from __future__ import annotations

import django_filters as filters

from apps.blog.models import Article


class ArticleFilter(filters.FilterSet):
    published_after = filters.DateFilter(field_name="published_at", lookup_expr="gte")
    published_before = filters.DateFilter(field_name="published_at", lookup_expr="lte")
    year = filters.NumberFilter(field_name="published_at", lookup_expr="year")

    class Meta:
        model = Article
        fields = ("published_after", "published_before", "year")
