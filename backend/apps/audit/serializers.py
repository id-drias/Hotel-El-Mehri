"""Read-only serializer for the audit trail."""

from rest_framework import serializers

from apps.audit.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True, default=None)
    action_display = serializers.CharField(source="get_action_display", read_only=True)

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "actor",
            "actor_username",
            "action",
            "action_display",
            "target_type",
            "target_id",
            "target_label",
            "changes",
            "note",
            "ip_address",
            "created_at",
        )
        # Every field. The trail is readable and nothing else.
        read_only_fields = fields
