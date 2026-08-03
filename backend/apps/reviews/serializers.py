"""DRF serializers for reviews."""

from __future__ import annotations

from rest_framework import serializers

from apps.reviews.models import Review
from apps.rooms.models import Room


class ReviewSerializer(serializers.ModelSerializer):
    """Public read shape.

    `email` is absent by design — it is collected so the hotel can follow up,
    not so it can be published beside the review.
    """

    room = serializers.SlugRelatedField(slug_field="slug", read_only=True)

    class Meta:
        model = Review
        fields = ("id", "author_name", "rating", "title", "content", "published_at", "room")
        read_only_fields = fields


class ReviewCreateSerializer(serializers.ModelSerializer):
    """Public submission. Always lands in moderation."""

    room = serializers.SlugRelatedField(
        slug_field="slug", queryset=Room.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Review
        fields = ("author_name", "email", "rating", "title", "content", "room")

    def validate_rating(self, value: int) -> int:
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate_content(self, value: str) -> str:
        value = value.strip()
        if len(value) < 20:
            raise serializers.ValidationError("Please write a little more about your stay.")
        return value

    def validate_author_name(self, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Please give a name.")
        return value


class ReviewModerationSerializer(serializers.Serializer):
    """Staff decision on a pending review."""

    status = serializers.ChoiceField(choices=[Review.Status.APPROVED, Review.Status.REJECTED])


class RatingSummarySerializer(serializers.Serializer):
    average = serializers.FloatField(allow_null=True)
    count = serializers.IntegerField()
