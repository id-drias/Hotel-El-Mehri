"""Back-office registration for the blog."""

from django.contrib import admin

from apps.blog.models import Article, ArticleTranslation


class ArticleTranslationInline(admin.StackedInline):
    model = ArticleTranslation
    extra = 1


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    inlines = [ArticleTranslationInline]
    list_display = ("slug", "published_at", "is_published", "position")
    list_filter = ("is_published", "published_at")
    list_editable = ("is_published",)
    search_fields = ("slug", "translations__title")
    date_hierarchy = "published_at"
    ordering = ("-published_at",)
