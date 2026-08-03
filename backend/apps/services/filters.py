"""Query filters for services."""

from __future__ import annotations

import django_filters as filters

from apps.services.models import Service


class ServiceFilter(filters.FilterSet):
    category = filters.ChoiceFilter(choices=Service.Category.choices)

    class Meta:
        model = Service
        fields = ("category",)
