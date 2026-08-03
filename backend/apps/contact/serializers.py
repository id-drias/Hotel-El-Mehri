"""DRF serializers for contact messages."""

from __future__ import annotations

from rest_framework import serializers

from apps.contact.models import ContactMessage


class ContactMessageCreateSerializer(serializers.ModelSerializer):
    """The public contact form.

    `language`, `ip_address` and `is_handled` are absent from `fields`, so a
    caller cannot set them however hard they try — the view supplies the first
    two and the third is staff-only.
    """

    class Meta:
        model = ContactMessage
        fields = ("full_name", "email", "phone_number", "subject", "content")

    def validate_full_name(self, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Please give a name we can reply to.")
        return value

    def validate_email(self, value: str) -> str:
        return value.lower().strip()

    def validate_content(self, value: str) -> str:
        value = value.strip()
        if len(value) < 10:
            raise serializers.ValidationError("Please tell us a little more.")
        return value

    def validate(self, attrs):
        # A crude but effective spam signal: a message that is a wall of links.
        if attrs.get("content", "").lower().count("http") > 4:
            raise serializers.ValidationError(
                {"content": "That looks like spam. Please write to us directly instead."}
            )
        return attrs


class ContactMessageSerializer(serializers.ModelSerializer):
    """Staff view of the inbox."""

    class Meta:
        model = ContactMessage
        fields = (
            "id",
            "full_name",
            "email",
            "phone_number",
            "subject",
            "content",
            "language",
            "is_handled",
            "created_at",
        )
        read_only_fields = tuple(f for f in fields if f != "is_handled")
