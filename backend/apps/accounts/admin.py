from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.utils.translation import gettext_lazy as _

from apps.accounts.models import GuestProfile, User


class GuestProfileInline(admin.StackedInline):
    model = GuestProfile
    can_delete = False
    extra = 0


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    inlines = [GuestProfileInline]
    list_display = ("username", "email", "first_name", "last_name", "role", "is_active")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("username", "email", "first_name", "last_name", "phone_number")
    ordering = ("username",)

    fieldsets = (
        *DjangoUserAdmin.fieldsets,
        (
            _("Hotel"),
            {
                "fields": ("role", "phone_number", "preferred_language"),
                "description": _(
                    "`role` drives API authorisation. Django's `is_staff` only opens this "
                    "admin site — set both deliberately."
                ),
            },
        ),
    )
    add_fieldsets = (
        *DjangoUserAdmin.add_fieldsets,
        (_("Hotel"), {"fields": ("email", "role", "phone_number")}),
    )


@admin.register(GuestProfile)
class GuestProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "vip_tier", "nationality", "marketing_opt_in")
    list_filter = ("vip_tier", "marketing_opt_in")
    search_fields = ("user__username", "user__email", "user__last_name")
    autocomplete_fields = ("user",)
