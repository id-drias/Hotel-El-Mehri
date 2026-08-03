"""Back-office registration for Rooms & suites."""

from django.contrib import admin

from apps.rooms.models import (
    RateOverride,
    Room,
    RoomClosure,
    RoomImage,
    RoomSpecification,
    RoomTranslation,
    RoomUnit,
)


class RoomTranslationInline(admin.TabularInline):
    model = RoomTranslation
    extra = 1
    # Two rows by default would be one per language, which is what an editor
    # almost always wants; `extra=1` plus the existing rows gets there without
    # a wall of empty forms on an already-translated room.


class RoomSpecificationInline(admin.TabularInline):
    model = RoomSpecification
    extra = 0
    ordering = ("language", "position")


class RoomImageInline(admin.TabularInline):
    model = RoomImage
    extra = 0
    ordering = ("position",)


class RoomUnitInline(admin.TabularInline):
    model = RoomUnit
    extra = 0
    fields = ("number", "floor", "housekeeping", "is_sellable")
    ordering = ("number",)


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    inlines = [RoomTranslationInline, RoomSpecificationInline, RoomImageInline, RoomUnitInline]
    list_display = ("slug", "base_price", "unit_count", "is_bookable", "is_published", "position")
    list_filter = ("is_published", "is_bookable")
    list_editable = ("is_bookable", "is_published", "position")
    search_fields = ("slug", "translations__name")
    prepopulated_fields = {"slug": ()}

    @admin.display(description="Units")
    def unit_count(self, obj) -> int:
        return obj.units.count()


@admin.register(RoomUnit)
class RoomUnitAdmin(admin.ModelAdmin):
    list_display = ("number", "room", "floor", "housekeeping", "is_sellable")
    list_filter = ("housekeeping", "is_sellable", "room")
    list_editable = ("housekeeping", "is_sellable")
    search_fields = ("number", "room__slug")
    autocomplete_fields = ("room",)


@admin.register(RateOverride)
class RateOverrideAdmin(admin.ModelAdmin):
    list_display = ("room", "date", "price", "reason", "created_by")
    list_filter = ("room", "date")
    date_hierarchy = "date"
    autocomplete_fields = ("room",)


@admin.register(RoomClosure)
class RoomClosureAdmin(admin.ModelAdmin):
    list_display = ("room", "start_date", "end_date", "reason")
    list_filter = ("room",)
    autocomplete_fields = ("room",)
