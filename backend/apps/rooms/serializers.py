"""DRF serializers for Rooms & suites.

Field names are snake_case, matching the rest of the API. The frontend maps to
its own camelCase view types in `lib/api/*` exactly as the console does in
`lib/admin/mappers.ts` — one convention per API beats two.
"""

from __future__ import annotations

from rest_framework import serializers

from apps.common.mixins import TranslatedSerializerMixin
from apps.common.utils import absolute_media_url, pick_translation
from apps.rooms.models import Room, RoomImage, RoomSpecification


class RoomImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = RoomImage
        fields = ("id", "url", "alt_text", "is_cover")

    def get_url(self, obj) -> str | None:
        return absolute_media_url(self.context.get("request"), obj.image)


class RoomSpecificationSerializer(serializers.ModelSerializer):
    """Specs are themselves per-language rows, so they are filtered, not lifted."""

    class Meta:
        model = RoomSpecification
        fields = ("label", "icon")


class RoomListSerializer(TranslatedSerializerMixin, serializers.ModelSerializer):
    """Card-sized payload for the rooms index."""

    translated_fields = ("name", "description")

    cover_url = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = (
            "slug",
            "surface_m2",
            "max_adults",
            "max_children",
            "base_price",
            "is_bookable",
            "cover_url",
        )

    def get_cover_url(self, obj) -> str | None:
        # Iterates the prefetched images rather than querying for the cover:
        # `.filter(is_cover=True).first()` would be one query per card.
        images = list(obj.images.all())
        cover = next((image for image in images if image.is_cover), None) or (
            images[0] if images else None
        )
        return absolute_media_url(self.context.get("request"), cover.image) if cover else None


class RoomDetailSerializer(TranslatedSerializerMixin, serializers.ModelSerializer):
    """Full payload for a single room page."""

    translated_fields = ("name", "description")

    images = RoomImageSerializer(many=True, read_only=True)
    specifications = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = (
            "slug",
            "surface_m2",
            "max_adults",
            "max_children",
            "base_price",
            "is_bookable",
            "video_url",
            "images",
            "specifications",
        )

    def get_specifications(self, obj) -> list[dict]:
        """Only the specs written in the visitor's language.

        `RoomSpecification` is a translation row in its own right — one per
        language per line — so returning them all would show every amenity
        twice on a bilingual room.
        """
        language = pick_translation(obj)
        wanted = language.language if language is not None else None

        rows = [spec for spec in obj.specifications.all() if spec.language == wanted]
        if not rows:
            # No specs in this language: fall back to whatever exists rather
            # than rendering an empty amenity list.
            rows = list(obj.specifications.all())

        return RoomSpecificationSerializer(rows, many=True).data


class RoomAvailabilitySerializer(serializers.Serializer):
    """One row of the public availability response."""

    room_slug = serializers.CharField()
    units_available = serializers.IntegerField()
    nights = serializers.IntegerField()
    total_price = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    base_price = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
