"""Photo gallery: categories (the filter tabs) and the images themselves."""

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import PublishableModel, TimeStampedModel, TranslationModel


class MediaCategory(PublishableModel):
    """A gallery filter tab: Rooms, Restaurant, Wellness, Events, Other."""

    class Tag(models.TextChoices):
        ROOM = "room", _("Rooms")
        SERVICE = "service", _("Services")
        EVENT = "event", _("Events")
        OTHER = "other", _("Other")

    slug = models.SlugField(max_length=80, unique=True)
    tag = models.CharField(max_length=20, choices=Tag.choices, default=Tag.OTHER)

    class Meta(PublishableModel.Meta):
        verbose_name = _("media category")
        verbose_name_plural = _("media categories")

    def __str__(self) -> str:
        return self.slug


class MediaCategoryTranslation(TranslationModel):
    category = models.ForeignKey(
        MediaCategory, related_name="translations", on_delete=models.CASCADE
    )
    name = models.CharField(max_length=120)

    class Meta:
        unique_together = ("category", "language")


class MediaAsset(PublishableModel, TimeStampedModel):
    category = models.ForeignKey(
        MediaCategory, related_name="assets", on_delete=models.SET_NULL, null=True, blank=True
    )
    image = models.ImageField(upload_to="gallery/")
    alt_text = models.CharField(max_length=200, blank=True)
    credit = models.CharField(max_length=120, blank=True)

    class Meta(PublishableModel.Meta):
        verbose_name = _("media asset")
        verbose_name_plural = _("media assets")
