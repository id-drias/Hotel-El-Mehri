"""Moderated guest reviews, site-wide or attached to a room."""

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import TimeStampedModel
from apps.rooms.models import Room


class Review(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", _("Awaiting moderation")
        APPROVED = "approved", _("Approved")
        REJECTED = "rejected", _("Rejected")

    room = models.ForeignKey(
        Room, related_name="reviews", on_delete=models.CASCADE, null=True, blank=True,
        help_text=_("Empty means a review of the hotel as a whole."),
    )
    author_name = models.CharField(_("author"), max_length=120)
    email = models.EmailField(_("email"), blank=True)
    rating = models.PositiveSmallIntegerField(
        _("rating"), validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    title = models.CharField(_("title"), max_length=150, blank=True)
    content = models.TextField(_("content"))
    language = models.CharField(max_length=5, default="fr")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-published_at", "-created_at")
        verbose_name = _("review")
        verbose_name_plural = _("reviews")

    def __str__(self) -> str:
        return f"{self.author_name} ({self.rating}/5)"
