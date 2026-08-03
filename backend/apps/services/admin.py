"""Back-office registration for services and event halls."""

from django.contrib import admin

from apps.services.models import (
    EventHall,
    EventHallTranslation,
    Service,
    ServiceTranslation,
)


class ServiceTranslationInline(admin.TabularInline):
    model = ServiceTranslation
    extra = 1


class EventHallTranslationInline(admin.TabularInline):
    model = EventHallTranslation
    extra = 1


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    inlines = [ServiceTranslationInline]
    list_display = ("slug", "category", "is_published", "position")
    list_filter = ("category", "is_published")
    list_editable = ("is_published", "position")
    search_fields = ("slug", "translations__name")


@admin.register(EventHall)
class EventHallAdmin(admin.ModelAdmin):
    inlines = [EventHallTranslationInline]
    list_display = ("slug", "service", "seating_capacity", "is_published", "position")
    list_filter = ("is_published",)
    list_editable = ("is_published", "position")
    search_fields = ("slug", "translations__name")
    autocomplete_fields = ("service",)
