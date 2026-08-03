"""DRF serializers for the blog."""

from __future__ import annotations

from rest_framework import serializers

from apps.blog.models import Article
from apps.common.mixins import TranslatedSerializerMixin
from apps.common.utils import absolute_media_url


class ArticleListSerializer(TranslatedSerializerMixin, serializers.ModelSerializer):
    """Index card. Carries the excerpt, not the body — a twelve-item page would
    otherwise ship twelve full articles to render twelve summaries."""

    translated_fields = ("title", "excerpt")

    cover_url = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = ("slug", "cover_url", "cover_alt", "published_at")

    def get_cover_url(self, obj) -> str | None:
        return absolute_media_url(self.context.get("request"), obj.cover_image)


class ArticleDetailSerializer(ArticleListSerializer):
    translated_fields = ("title", "excerpt", "body")
