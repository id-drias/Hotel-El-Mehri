"""API viewsets for the blog."""

from __future__ import annotations

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.blog import selectors
from apps.blog.filters import ArticleFilter
from apps.blog.serializers import ArticleDetailSerializer, ArticleListSerializer


class ArticleViewSet(viewsets.ReadOnlyModelViewSet):
    """News and events."""

    permission_classes = [AllowAny]
    lookup_field = "slug"
    filterset_class = ArticleFilter

    def get_queryset(self):
        return selectors.published_articles()

    def get_serializer_class(self):
        return ArticleDetailSerializer if self.action == "retrieve" else ArticleListSerializer

    @action(detail=True, methods=["get"])
    def related(self, request, slug=None):
        """Three other recent posts, for the foot of an article."""
        serializer = ArticleListSerializer(
            selectors.related_articles(article=self.get_object()),
            many=True,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data)
