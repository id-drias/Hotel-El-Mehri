"""Query filters for Reservation requests."""

from __future__ import annotations

import django_filters as filters

from apps.reservations.models import Reservation


class ReservationFilter(filters.FilterSet):
    """Console filters for the bookings table."""

    status = filters.ChoiceFilter(choices=Reservation.Status.choices)
    arriving_on = filters.DateFilter(field_name="check_in")
    arriving_from = filters.DateFilter(field_name="check_in", lookup_expr="gte")
    arriving_until = filters.DateFilter(field_name="check_in", lookup_expr="lte")
    board = filters.ChoiceFilter(choices=Reservation.Board.choices)
    source = filters.ChoiceFilter(choices=Reservation.Source.choices)
    vip = filters.BooleanFilter(method="filter_vip")

    class Meta:
        model = Reservation
        fields = ("status", "arriving_on", "arriving_from", "arriving_until", "board", "source")

    def filter_vip(self, queryset, name, value):
        if value is None:
            return queryset
        # An unowned booking (taken by phone) has no profile and so no tier —
        # it is not VIP, and `exclude` alone would wrongly keep it.
        vip = queryset.filter(guest__isnull=False).exclude(guest__guest_profile__vip_tier="none")
        return vip if value else queryset.exclude(pk__in=vip.values("pk"))
