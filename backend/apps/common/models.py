"""Abstract models shared by every app."""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class TimeStampedModel(models.Model):
    """Adds created_at / updated_at to any model."""

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class TranslationModel(models.Model):
    """Base for the per-language child rows (fr / ar / en).

    The live site stores one row per language per field group; we keep that
    shape because it lets editors translate content independently.
    """

    language = models.CharField(max_length=5, choices=settings.LANGUAGES, db_index=True)

    class Meta:
        abstract = True


class PublishableQuerySet(models.QuerySet):
    def published(self) -> "PublishableQuerySet":
        return self.filter(is_published=True)


class PublishableModel(models.Model):
    is_published = models.BooleanField(_("published"), default=True, db_index=True)
    position = models.PositiveSmallIntegerField(_("display order"), default=0)

    objects = PublishableQuerySet.as_manager()

    class Meta:
        abstract = True
        ordering = ("position", "id")
