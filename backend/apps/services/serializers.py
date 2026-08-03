"""DRF serializers for services and event halls."""

from __future__ import annotations

from rest_framework import serializers

from apps.common.mixins import TranslatedSerializerMixin
from apps.common.utils import absolute_media_url
from apps.services.models import EventHall, Service


class ServiceSerializer(TranslatedSerializerMixin, serializers.ModelSerializer):
    translated_fields = ("name", "kicker", "description")

    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = ("slug", "category", "image_url", "video_url")

    def get_image_url(self, obj) -> str | None:
        return absolute_media_url(self.context.get("request"), obj.image)


class EventHallSerializer(TranslatedSerializerMixin, serializers.ModelSerializer):
    translated_fields = ("name", "description")

    image_url = serializers.SerializerMethodField()
    service_slug = serializers.CharField(source="service.slug", read_only=True)

    class Meta:
        model = EventHall
        fields = ("slug", "seating_capacity", "service_slug", "image_url")

    def get_image_url(self, obj) -> str | None:
        return absolute_media_url(self.context.get("request"), obj.image)
