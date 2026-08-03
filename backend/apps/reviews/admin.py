"""Back-office registration for reviews."""

from django.contrib import admin

from apps.reviews import services
from apps.reviews.models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("author_name", "rating", "room", "status", "published_at", "created_at")
    list_filter = ("status", "rating", "language", "room")
    search_fields = ("author_name", "email", "title", "content")
    date_hierarchy = "created_at"
    autocomplete_fields = ("room",)

    # The guest's own words. Moderation decides whether they are published, not
    # what they say.
    readonly_fields = (
        "author_name",
        "email",
        "rating",
        "title",
        "content",
        "language",
        "created_at",
    )

    @admin.action(description="Approve selected reviews")
    def approve(self, request, queryset):
        # Routed through the service so `published_at` is stamped the same way
        # it is from the API — a bulk approval that skips it would leave the
        # reviews approved but unordered and therefore invisible.
        count = 0
        for review in queryset.exclude(status=Review.Status.APPROVED):
            services.moderate(review=review, status=Review.Status.APPROVED, actor=request.user)
            count += 1
        self.message_user(request, f"{count} review(s) approved.")

    @admin.action(description="Reject selected reviews")
    def reject(self, request, queryset):
        count = 0
        for review in queryset.exclude(status=Review.Status.REJECTED):
            services.moderate(review=review, status=Review.Status.REJECTED, actor=request.user)
            count += 1
        self.message_user(request, f"{count} review(s) rejected.")

    actions = ["approve", "reject"]
