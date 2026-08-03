"""API viewsets for Rooms & suites.

Public and read-only. Writes happen through the Django admin or the console.
"""

from __future__ import annotations

from django.db.models import Prefetch
from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from apps.common.mixins import PublishedQuerysetMixin
from apps.rooms.filters import RoomFilter
from apps.rooms.models import Room, RoomImage, RoomSpecification, RoomTranslation
from apps.rooms.serializers import RoomDetailSerializer, RoomListSerializer


class RoomViewSet(PublishedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    """The room catalogue.

    `AllowAny` is explicit because the project default is `IsAuthenticated` —
    a public endpoint has to opt out deliberately, which is the safer way round.
    """

    permission_classes = [AllowAny]
    lookup_field = "slug"
    filterset_class = RoomFilter
    pagination_class = None  # four room types; a pager would be noise

    def get_queryset(self):
        queryset = Room.objects.prefetch_related(
            Prefetch("translations", queryset=RoomTranslation.objects.all()),
            Prefetch("images", queryset=RoomImage.objects.order_by("-is_cover", "position")),
        )

        if self.action == "retrieve":
            queryset = queryset.prefetch_related(
                Prefetch("specifications", queryset=RoomSpecification.objects.order_by("position"))
            )

        return self.filter_published(queryset)

    def get_serializer_class(self):
        return RoomDetailSerializer if self.action == "retrieve" else RoomListSerializer
