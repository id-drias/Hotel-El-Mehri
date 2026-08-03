"""Restaurants, tea lounge, wellness centre and event halls."""

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import PublishableModel, TranslationModel


class Service(PublishableModel):
    """One offering: El Kheyma, El Mayda, Sedrata, the spa, the halls..."""

    class Category(models.TextChoices):
        RESTAURANT = "restaurant", _("Restaurant")
        TEA_ROOM = "tea_room", _("Tea lounge")
        WELLNESS = "wellness", _("Leisure and wellness")
        EVENTS = "events", _("Events")

    slug = models.SlugField(max_length=80, unique=True)
    category = models.CharField(max_length=20, choices=Category.choices)
    image = models.ImageField(upload_to="services/", blank=True)
    video_url = models.URLField(blank=True)

    class Meta(PublishableModel.Meta):
        verbose_name = _("service")
        verbose_name_plural = _("services")

    def __str__(self) -> str:
        return self.slug


class ServiceTranslation(TranslationModel):
    service = models.ForeignKey(Service, related_name="translations", on_delete=models.CASCADE)
    name = models.CharField(max_length=150)
    kicker = models.CharField(
        _("kicker"),
        max_length=120,
        blank=True,
        help_text=_("Short eyebrow label shown above the name, e.g. 'Restaurant central'."),
    )
    description = models.TextField(blank=True)

    class Meta:
        unique_together = ("service", "language")


class EventHall(PublishableModel):
    """Salle LYNA (230 seats), Salle LELLA KRIMA (200 seats), workshops."""

    service = models.ForeignKey(
        Service, related_name="halls", on_delete=models.CASCADE, limit_choices_to={"category": "events"}
    )
    slug = models.SlugField(max_length=80, unique=True)
    seating_capacity = models.PositiveSmallIntegerField(_("seats"))
    surface_m2 = models.PositiveSmallIntegerField(null=True, blank=True)
    image = models.ImageField(upload_to="services/halls/", blank=True)

    def __str__(self) -> str:
        return self.slug


class EventHallTranslation(TranslationModel):
    hall = models.ForeignKey(EventHall, related_name="translations", on_delete=models.CASCADE)
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)

    class Meta:
        unique_together = ("hall", "language")
