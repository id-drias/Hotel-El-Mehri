"""Back-office registration for contact messages."""

from django.contrib import admin

from apps.contact.models import ContactMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("subject", "full_name", "email", "language", "is_handled", "created_at")
    list_filter = ("is_handled", "language", "created_at")
    list_editable = ("is_handled",)
    search_fields = ("subject", "full_name", "email", "content")
    date_hierarchy = "created_at"

    # An enquiry is a record of what someone actually sent. Editing the text
    # would destroy that, so everything except the handled flag is read-only.
    readonly_fields = (
        "full_name",
        "email",
        "phone_number",
        "subject",
        "content",
        "language",
        "ip_address",
        "created_at",
    )

    def has_add_permission(self, request) -> bool:
        # Messages arrive through the form, never by hand.
        return False

    @admin.action(description="Mark selected as handled")
    def mark_handled(self, request, queryset):
        updated = queryset.update(is_handled=True)
        self.message_user(request, f"{updated} message(s) marked handled.")

    actions = ["mark_handled"]
