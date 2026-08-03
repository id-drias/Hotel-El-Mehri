"""DRF serializers for the gallery."""

from __future__ import annotations

from rest_framework import serializers

from apps.common.mixins import TranslatedSerializerMixin
from apps.common.utils import absolute_media_url
from apps.gallery.models import MediaAsset, MediaCategory


class MediaCategorySerializer(TranslatedSerializerMixin, serializers.ModelSerializer):
    translated_fields = ("name",)

    class Meta:
        model = MediaCategory
        fields = ("slug", "tag")


class MediaAssetSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    category = serializers.SlugRelatedField(slug_field="slug", read_only=True)

    class Meta:
        model = MediaAsset
        fields = ("id", "url", "alt_text", "credit", "category")

    def get_url(self, obj) -> str | None:
        return absolute_media_url(self.context.get("request"), obj.image)
