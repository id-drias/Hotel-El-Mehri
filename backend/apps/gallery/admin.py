"""Back-office registration for the gallery."""

from django.contrib import admin
from django.utils.html import format_html

from apps.gallery.models import MediaAsset, MediaCategory, MediaCategoryTranslation


class MediaCategoryTranslationInline(admin.TabularInline):
    model = MediaCategoryTranslation
    extra = 1


@admin.register(MediaCategory)
class MediaCategoryAdmin(admin.ModelAdmin):
    inlines = [MediaCategoryTranslationInline]
    list_display = ("slug", "tag", "asset_count", "is_published", "position")
    list_filter = ("tag", "is_published")
    list_editable = ("is_published", "position")
    search_fields = ("slug", "translations__name")

    @admin.display(description="Images")
    def asset_count(self, obj) -> int:
        return obj.assets.count()


@admin.register(MediaAsset)
class MediaAssetAdmin(admin.ModelAdmin):
    list_display = ("thumbnail", "alt_text", "category", "credit", "is_published", "position")
    list_display_links = ("thumbnail", "alt_text")
    list_filter = ("category", "is_published")
    list_editable = ("is_published", "position")
    search_fields = ("alt_text", "credit")
    autocomplete_fields = ("category",)

    @admin.display(description="Preview")
    def thumbnail(self, obj):
        # A gallery admin without previews is a list of filenames, which is
        # unusable for the person choosing which photo to unpublish.
        if not obj.image:
            return "—"
        return format_html(
            '<img src="{}" style="height:48px;width:72px;object-fit:cover;border-radius:3px" />',
            obj.image.url,
        )
