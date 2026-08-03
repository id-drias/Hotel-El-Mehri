from django.contrib import admin

from apps.audit.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Read-only in the Django admin too — the trail is evidence, not data."""

    list_display = ("created_at", "actor", "action", "target_type", "target_label")
    list_filter = ("action", "target_type", "created_at")
    search_fields = ("target_label", "target_id", "actor__username", "note")
    date_hierarchy = "created_at"

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False
