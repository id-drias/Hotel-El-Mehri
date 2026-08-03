"""Reservations: the booking record, its room lines, unit assignments, payments.

`Reservation` is the guest-facing agreement. `RoomAssignment` binds it to
physical units and is what the availability query actually reads — without it,
"is room 601 free next Tuesday" is unanswerable.
"""

from __future__ import annotations

import secrets
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.common.models import TimeStampedModel
from apps.rooms.models import Room, RoomUnit

#: Alphabet without look-alikes (0/O, 1/I) — references get read down a phone.
_REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_reference() -> str:
    return "LYN-" + "".join(secrets.choice(_REFERENCE_ALPHABET) for _ in range(6))


class Reservation(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        CONFIRMED = "confirmed", _("Confirmed")
        CHECKED_IN = "checked_in", _("Checked in")
        CHECKED_OUT = "checked_out", _("Checked out")
        CANCELLED = "cancelled", _("Cancelled")
        NO_SHOW = "no_show", _("No show")

    class Board(models.TextChoices):
        ROOM_ONLY = "room_only", _("Room only")
        BB = "bb", _("Bed and breakfast")
        HB = "hb", _("Half board")
        FB = "fb", _("Full board")

    class Source(models.TextChoices):
        WEB = "web", _("Website")
        PHONE = "phone", _("Phone")
        WALK_IN = "walk_in", _("Walk-in")
        OTA = "ota", _("Online travel agent")

    #: Per-person, per-night supplements in DZD, added on top of the room rate.
    BOARD_SUPPLEMENTS: dict[str, Decimal] = {
        Board.ROOM_ONLY: Decimal("0"),
        Board.BB: Decimal("1200"),
        Board.HB: Decimal("2800"),
        Board.FB: Decimal("4500"),
    }

    #: Statuses that still hold inventory.
    ACTIVE_STATUSES = (Status.PENDING, Status.CONFIRMED, Status.CHECKED_IN)
    #: Statuses a guest is allowed to cancel from.
    CANCELLABLE_STATUSES = (Status.PENDING, Status.CONFIRMED)

    reference = models.CharField(max_length=12, unique=True, editable=False)

    # Nullable on purpose: the hotel takes bookings by phone from people who
    # will never have an account. An unowned reservation belongs to staff.
    guest = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        related_name="reservations",
        on_delete=models.SET_NULL,
    )

    first_name = models.CharField(_("first name"), max_length=80)
    last_name = models.CharField(_("last name"), max_length=80)
    email = models.EmailField(_("email"))
    phone_number = models.CharField(_("phone"), max_length=32)

    check_in = models.DateField(_("check-in"))
    check_out = models.DateField(_("check-out"))
    adults = models.PositiveSmallIntegerField(
        _("adults"), default=1, validators=[MinValueValidator(1)]
    )
    children = models.PositiveSmallIntegerField(_("children"), default=0)
    board = models.CharField(max_length=20, choices=Board.choices, default=Board.BB)
    message = models.TextField(_("special request"), blank=True)

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.WEB)
    language = models.CharField(_("locale of the request"), max_length=5, default="fr")

    # Frozen at confirmation time. A stay must not silently reprice because a
    # manager edited the rate calendar afterwards.
    total_price = models.DecimalField(
        _("total"), max_digits=12, decimal_places=2, null=True, blank=True
    )

    confirmed_at = models.DateTimeField(null=True, blank=True)
    checked_in_at = models.DateTimeField(null=True, blank=True)
    checked_out_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(_("cancellation reason"), blank=True)

    class Meta:
        ordering = ("-created_at",)
        verbose_name = _("reservation request")
        verbose_name_plural = _("reservation requests")
        constraints = [
            models.CheckConstraint(
                condition=models.Q(check_out__gt=models.F("check_in")),
                name="reservation_check_out_after_check_in",
            )
        ]
        indexes = [
            models.Index(fields=["status", "check_in"]),
            models.Index(fields=["check_in", "check_out"]),
        ]

    def __str__(self) -> str:
        return self.reference

    def save(self, *args, **kwargs):
        if not self.reference:
            # Collisions are vanishingly unlikely (32^6) but not impossible, and
            # `reference` is unique — retry rather than 500 on the guest.
            for _attempt in range(5):
                candidate = generate_reference()
                if not Reservation.objects.filter(reference=candidate).exists():
                    self.reference = candidate
                    break
            else:  # pragma: no cover - would need 5 collisions in a row
                raise RuntimeError("Could not allocate a unique reservation reference.")
        super().save(*args, **kwargs)

    # -- derived values ----------------------------------------------------

    @property
    def nights(self) -> int:
        return max((self.check_out - self.check_in).days, 0)

    @property
    def guest_count(self) -> int:
        return self.adults + self.children

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def is_vip(self) -> bool:
        profile = getattr(self.guest, "guest_profile", None) if self.guest_id else None
        return bool(profile and profile.is_vip)

    # -- cost calculation --------------------------------------------------

    def accommodation_total(self) -> Decimal:
        """Room lines only: each line's captured rate × quantity × nights.

        Uses `unit_price` frozen on the line at booking time, falling back to
        the room's current base rate for lines created before pricing existed.
        """
        total = Decimal("0.00")
        for line in self.rooms.select_related("room"):
            rate = line.unit_price if line.unit_price is not None else line.room.base_price
            if rate is None:
                continue
            total += rate * line.quantity * self.nights
        return total

    def board_total(self) -> Decimal:
        """Board supplement: per person, per night.

        Children are charged the same supplement here. If the hotel introduces a
        child rate, this is the single method to change.
        """
        supplement = self.BOARD_SUPPLEMENTS.get(self.board, Decimal("0"))
        return supplement * self.guest_count * self.nights

    def extras_total(self) -> Decimal:
        """Spa treatments, transfers, covers — anything booked alongside the stay."""
        confirmed = self.experience_bookings.exclude(status="cancelled")
        return sum((booking.price for booking in confirmed if booking.price), Decimal("0.00"))

    def calculate_total(self) -> Decimal:
        """Accommodation + board + extras. The figure quoted to the guest.

        Deliberately a method, not a stored field that drifts: `total_price` is
        written from this once, at confirmation, and thereafter the stored value
        is authoritative for what the guest actually agreed to.
        """
        return self.accommodation_total() + self.board_total() + self.extras_total()

    def amount_paid(self) -> Decimal:
        captured = self.payments.filter(status=Payment.Status.CAPTURED)
        return captured.aggregate(total=models.Sum("amount"))["total"] or Decimal("0.00")

    def balance_due(self) -> Decimal:
        return (self.total_price or self.calculate_total()) - self.amount_paid()

    # -- state transitions -------------------------------------------------

    def can_cancel(self) -> bool:
        return self.status in self.CANCELLABLE_STATUSES

    def mark_confirmed(self) -> None:
        self.status = self.Status.CONFIRMED
        self.confirmed_at = timezone.now()
        if self.total_price is None:
            self.total_price = self.calculate_total()


class ReservationRoom(models.Model):
    """A room *type* and quantity inside one reservation."""

    reservation = models.ForeignKey(Reservation, related_name="rooms", on_delete=models.CASCADE)
    room = models.ForeignKey(Room, related_name="reservation_rooms", on_delete=models.PROTECT)
    quantity = models.PositiveSmallIntegerField(default=1)
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Rate captured at request time, in DZD."),
    )

    class Meta:
        unique_together = ("reservation", "room")

    def __str__(self) -> str:
        return f"{self.reservation.reference} × {self.room.slug}"


class RoomAssignment(TimeStampedModel):
    """Binds a reservation to a physical unit for a date range.

    This is the table `available_units()` reads. The date range is duplicated
    from the reservation rather than joined because a stay can be split across
    units (a guest moved mid-stay), and because the overlap query stays a single
    index scan.
    """

    #: Reservation statuses whose assignments still block inventory. A cancelled
    #: booking must free its room immediately, or the hotel sells nothing.
    BLOCKING_STATUSES = (
        Reservation.Status.PENDING,
        Reservation.Status.CONFIRMED,
        Reservation.Status.CHECKED_IN,
    )

    reservation = models.ForeignKey(
        Reservation, related_name="assignments", on_delete=models.CASCADE
    )
    unit = models.ForeignKey(RoomUnit, related_name="assignments", on_delete=models.PROTECT)
    start_date = models.DateField()
    end_date = models.DateField()

    class Meta:
        verbose_name = _("room assignment")
        verbose_name_plural = _("room assignments")
        ordering = ("start_date",)
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_date__gt=models.F("start_date")),
                name="assignment_end_after_start",
            ),
        ]
        indexes = [models.Index(fields=["unit", "start_date", "end_date"])]

    def __str__(self) -> str:
        return f"{self.unit} · {self.start_date} → {self.end_date}"


class Payment(TimeStampedModel):
    """Money against a reservation.

    No card data, ever — only the provider's opaque reference. PCI scope is
    something to stay outside of, not something to manage.
    """

    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        AUTHORISED = "authorised", _("Authorised")
        CAPTURED = "captured", _("Captured")
        REFUNDED = "refunded", _("Refunded")
        FAILED = "failed", _("Failed")

    class Method(models.TextChoices):
        CIB = "cib", _("CIB card")
        EDAHABIA = "edahabia", _("Edahabia")
        CASH = "cash", _("Cash")
        TRANSFER = "transfer", _("Bank transfer")

    reservation = models.ForeignKey(Reservation, related_name="payments", on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="DZD")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    method = models.CharField(max_length=30, choices=Method.choices, blank=True)
    provider_reference = models.CharField(max_length=120, blank=True)
    captured_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)
        verbose_name = _("payment")
        verbose_name_plural = _("payments")

    def __str__(self) -> str:
        return f"{self.reservation.reference} {self.amount} {self.currency} ({self.status})"
