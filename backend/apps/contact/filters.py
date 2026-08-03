"""Query filters for contact messages."""

from __future__ import annotations

import django_filters as filters

from apps.contact.models import ContactMessage


class ContactMessageFilter(filters.FilterSet):
    handled = filters.BooleanFilter(field_name="is_handled")
    since = filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    language = filters.CharFilter()

    class Meta:
        model = ContactMessage
        fields = ("handled", "since", "language")
