"""API viewsets for the gallery."""

from __future__ import annotations

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.gallery import selectors
from apps.gallery.filters import MediaAssetFilter
from apps.gallery.serializers import MediaAssetSerializer, MediaCategorySerializer


class GalleryViewSet(viewsets.ReadOnlyModelViewSet):
    """Images, plus the category tabs the frontend filters by."""

    permission_classes = [AllowAny]
    serializer_class = MediaAssetSerializer
    filterset_class = MediaAssetFilter

    def get_queryset(self):
        return selectors.assets()

    @action(detail=False, methods=["get"])
    def categories(self, request):
        """The filter tabs. Unpaginated — there are five of them."""
        serializer = MediaCategorySerializer(
            selectors.categories(), many=True, context=self.get_serializer_context()
        )
        return Response(serializer.data)
