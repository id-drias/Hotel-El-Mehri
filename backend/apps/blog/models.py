"""News and events articles (the 'Evenements' section)."""

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import PublishableModel, TimeStampedModel, TranslationModel


class Article(PublishableModel, TimeStampedModel):
    slug = models.SlugField(max_length=120, unique=True)
    cover_image = models.ImageField(upload_to="blog/", blank=True)
    cover_alt = models.CharField(max_length=200, blank=True)
    published_at = models.DateField(_("published on"), db_index=True)

    class Meta:
        ordering = ("-published_at",)
        verbose_name = _("article")
        verbose_name_plural = _("articles")

    def __str__(self) -> str:
        return self.slug


class ArticleTranslation(TranslationModel):
    article = models.ForeignKey(Article, related_name="translations", on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    excerpt = models.CharField(max_length=300, blank=True)
    body = models.TextField(blank=True)

    class Meta:
        unique_together = ("article", "language")
