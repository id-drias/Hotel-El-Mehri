"""API viewsets for services and event halls."""

from __future__ import annotations

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.services import selectors
from apps.services.filters import ServiceFilter
from apps.services.serializers import EventHallSerializer, ServiceSerializer


class ServiceViewSet(viewsets.ReadOnlyModelViewSet):
    """Restaurants, the tea lounge, the spa and the event spaces."""

    permission_classes = [AllowAny]
    serializer_class = ServiceSerializer
    lookup_field = "slug"
    filterset_class = ServiceFilter
    pagination_class = None  # five services

    def get_queryset(self):
        return selectors.services()

    @action(detail=False, methods=["get"])
    def halls(self, request):
        """Event halls. A sub-resource of services rather than its own app,
        because a hall only exists inside the events service."""
        serializer = EventHallSerializer(
            selectors.halls(), many=True, context=self.get_serializer_context()
        )
        return Response(serializer.data)
