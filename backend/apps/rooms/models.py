"""Room catalogue: room types, their physical units, translations, specs, images.

Two levels, and the distinction matters throughout the codebase:

* `Room` is a *type* — "Suite Royale". It carries the copy, the photography and
  the published rate.
* `RoomUnit` is a *physical room* — 601. It carries housekeeping state and is
  what a reservation is actually assigned to.

`Room.total_units` predates `RoomUnit` and is now derived rather than
authoritative; see the note on the field.
"""

from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import PublishableModel, TimeStampedModel, TranslationModel


class Room(PublishableModel, TimeStampedModel):
    """A bookable room *type* (Standard, Junior, Executive, Royal suite)."""

    slug = models.SlugField(_("slug"), max_length=80, unique=True)
    surface_m2 = models.PositiveSmallIntegerField(_("surface (m2)"), null=True, blank=True)
    max_adults = models.PositiveSmallIntegerField(_("max adults"), default=2)
    max_children = models.PositiveSmallIntegerField(_("max children"), default=0)
    base_price = models.DecimalField(
        _("nightly rate"),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("In DZD. Leave empty to display 'on request'."),
    )
    total_units = models.PositiveSmallIntegerField(
        _("units in stock"),
        default=0,
        help_text=_(
            "Legacy stock count. Availability now reads RoomUnit rows; keep this "
            "in step for display only."
        ),
    )
    is_bookable = models.BooleanField(
        _("open for sale"),
        default=True,
        db_index=True,
        help_text=_(
            "Stop-sell switch for the console. Distinct from `is_published`, "
            "which controls whether the type appears on the public site at all."
        ),
    )
    video_url = models.URLField(_("video"), blank=True)

    class Meta(PublishableModel.Meta):
        verbose_name = _("room")
        verbose_name_plural = _("rooms")

    def __str__(self) -> str:
        return self.slug

    def rate_for(self, day) -> Decimal | None:
        """The nightly rate on `day`: an override if one exists, else the base.

        Returns None when the room is priced "on request", which the public site
        renders as such rather than as zero.
        """
        override = self.rate_overrides.filter(date=day).values_list("price", flat=True).first()
        if override is not None:
            return override
        return self.base_price


class RoomUnit(TimeStampedModel):
    """A physical room. This is what `Room.total_units` should always have been.

    Housekeeping state lives here because it is a property of a door, not of a
    category: "Suite Royale is dirty" is meaningless when there are four of them.
    """

    class Housekeeping(models.TextChoices):
        CLEAN = "clean", _("Clean")
        OCCUPIED = "occupied", _("Occupied")
        DIRTY = "dirty", _("Dirty")
        MAINTENANCE = "maintenance", _("Out of order")

    #: States in which a unit can be sold to an arriving guest.
    SELLABLE_STATES = (Housekeeping.CLEAN,)
    #: States that take a unit out of inventory entirely.
    BLOCKED_STATES = (Housekeeping.MAINTENANCE,)

    room = models.ForeignKey(Room, related_name="units", on_delete=models.PROTECT)
    number = models.CharField(_("room number"), max_length=10)
    floor = models.PositiveSmallIntegerField(_("floor"), null=True, blank=True)
    housekeeping = models.CharField(
        _("housekeeping"),
        max_length=20,
        choices=Housekeeping.choices,
        default=Housekeeping.CLEAN,
        db_index=True,
    )
    is_sellable = models.BooleanField(
        _("in inventory"),
        default=True,
        db_index=True,
        help_text=_("Unset to retire a unit without deleting its booking history."),
    )
    notes = models.TextField(_("notes"), blank=True)

    class Meta:
        verbose_name = _("room unit")
        verbose_name_plural = _("room units")
        ordering = ("room", "number")
        constraints = [
            models.UniqueConstraint(fields=("room", "number"), name="unique_unit_per_room"),
        ]

    def __str__(self) -> str:
        return f"{self.room.slug} · {self.number}"

    @property
    def is_available_now(self) -> bool:
        return self.is_sellable and self.housekeeping in self.SELLABLE_STATES


class RateOverride(TimeStampedModel):
    """A dated exception to `Room.base_price`.

    Deliberately not a mutable column on Room: overwriting the base rate would
    silently reprice every future booking, including quotes already given to
    guests. An override is layered on at quote time and leaves history intact.
    """

    room = models.ForeignKey(Room, related_name="rate_overrides", on_delete=models.CASCADE)
    date = models.DateField(_("night"), db_index=True)
    price = models.DecimalField(_("rate"), max_digits=10, decimal_places=2)
    reason = models.CharField(_("reason"), max_length=120, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="rate_overrides",
    )

    class Meta:
        verbose_name = _("rate override")
        verbose_name_plural = _("rate overrides")
        ordering = ("room", "date")
        constraints = [
            models.UniqueConstraint(
                fields=("room", "date"), name="one_override_per_room_per_night"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.room.slug} {self.date}: {self.price}"


class RoomClosure(TimeStampedModel):
    """A stop-sell window for a whole room type — the console's date-range block."""

    room = models.ForeignKey(Room, related_name="closures", on_delete=models.CASCADE)
    start_date = models.DateField(_("from"))
    end_date = models.DateField(_("until"), help_text=_("Exclusive, like a check-out date."))
    reason = models.CharField(_("reason"), max_length=200, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="room_closures",
    )

    class Meta:
        verbose_name = _("room closure")
        verbose_name_plural = _("room closures")
        ordering = ("-start_date",)
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_date__gt=models.F("start_date")),
                name="closure_end_after_start",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.room.slug} closed {self.start_date} → {self.end_date}"


class RoomTranslation(TranslationModel):
    room = models.ForeignKey(Room, related_name="translations", on_delete=models.CASCADE)
    name = models.CharField(_("name"), max_length=150)
    description = models.TextField(_("description"), blank=True)

    class Meta:
        unique_together = ("room", "language")


class RoomSpecification(TranslationModel):
    """One amenity line (Wifi, minibar, 22 m2 ...) in a single language."""

    room = models.ForeignKey(Room, related_name="specifications", on_delete=models.CASCADE)
    label = models.CharField(_("label"), max_length=120)
    icon = models.CharField(_("icon key"), max_length=40, blank=True)
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ("position", "id")


class RoomImage(models.Model):
    room = models.ForeignKey(Room, related_name="images", on_delete=models.CASCADE)
    image = models.ImageField(_("image"), upload_to="rooms/")
    alt_text = models.CharField(_("alt text"), max_length=200, blank=True)
    is_cover = models.BooleanField(_("cover image"), default=False)
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ("position", "id")

    def __str__(self) -> str:
        return f"{self.room.slug} image {self.position}"
