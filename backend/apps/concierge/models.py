"""Concierge: in-stay guest requests, and bookable experiences.

Distinct from `contact.ContactMessage`, which is the public website enquiry
form. These are requests from guests who are already staying, and they have an
operational lifecycle (queued → someone working on it → done) rather than an
inbox.
"""

from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.common.models import TimeStampedModel
from apps.reservations.models import Reservation
from apps.rooms.models import RoomUnit
from apps.services.models import Service


class ConciergeRequest(TimeStampedModel):
    """One guest request in the operational queue."""

    class Kind(models.TextChoices):
        TRANSPORT = "transport", _("Transport")
        DINING = "dining", _("Dining")
        SPA = "spa", _("Spa and wellness")
        HOUSEKEEPING = "housekeeping", _("Housekeeping")
        TECHNICAL = "technical", _("Technical")
        OTHER = "other", _("Other")

    class Priority(models.TextChoices):
        URGENT = "urgent", _("Urgent")
        HIGH = "high", _("High")
        NORMAL = "normal", _("Normal")

    class Status(models.TextChoices):
        NEW = "new", _("New")
        IN_PROGRESS = "in_progress", _("In progress")
        RESOLVED = "resolved", _("Resolved")
        CANCELLED = "cancelled", _("Cancelled")

    #: Legal forward transitions. Enforced in the serializer so the console
    #: cannot jump a request straight from new to resolved by accident.
    TRANSITIONS: dict[str, tuple[str, ...]] = {
        Status.NEW: (Status.IN_PROGRESS, Status.CANCELLED),
        Status.IN_PROGRESS: (Status.RESOLVED, Status.CANCELLED),
        Status.RESOLVED: (),
        Status.CANCELLED: (),
    }

    OPEN_STATUSES = (Status.NEW, Status.IN_PROGRESS)

    reservation = models.ForeignKey(
        Reservation,
        related_name="concierge_requests",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    unit = models.ForeignKey(
        RoomUnit,
        related_name="concierge_requests",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )

    kind = models.CharField(_("kind"), max_length=20, choices=Kind.choices, db_index=True)
    priority = models.CharField(
        _("priority"),
        max_length=20,
        choices=Priority.choices,
        default=Priority.NORMAL,
        db_index=True,
    )
    status = models.CharField(
        _("status"), max_length=20, choices=Status.choices, default=Status.NEW, db_index=True
    )

    summary = models.CharField(_("summary"), max_length=300)
    detail = models.TextField(_("detail"), blank=True)
    requested_for = models.DateTimeField(_("requested for"), null=True, blank=True)

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="assigned_requests",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = _("concierge request")
        verbose_name_plural = _("concierge requests")
        # Urgent first, then oldest first inside a band. A newest-first queue
        # buries the request that has been waiting longest — which is precisely
        # the one about to become a complaint.
        ordering = ("priority", "created_at")
        indexes = [models.Index(fields=["status", "priority", "created_at"])]

    def __str__(self) -> str:
        return f"[{self.get_priority_display()}] {self.summary[:50]}"

    @property
    def is_open(self) -> bool:
        return self.status in self.OPEN_STATUSES

    def can_transition_to(self, new_status: str) -> bool:
        return new_status in self.TRANSITIONS.get(self.status, ())

    def advance_to(self, new_status: str, *, actor=None) -> None:
        """Move the request forward, stamping the side effects."""
        self.status = new_status
        if new_status == self.Status.IN_PROGRESS and actor is not None:
            self.assigned_to = actor
        if new_status in (self.Status.RESOLVED, self.Status.CANCELLED):
            self.resolved_at = timezone.now()


class ExperienceBooking(TimeStampedModel):
    """A spa treatment, restaurant cover or transfer booked against a Service.

    Priced independently of the room: `Reservation.extras_total()` sums these
    into the stay total.
    """

    class Status(models.TextChoices):
        REQUESTED = "requested", _("Requested")
        CONFIRMED = "confirmed", _("Confirmed")
        COMPLETED = "completed", _("Completed")
        CANCELLED = "cancelled", _("Cancelled")

    service = models.ForeignKey(Service, related_name="bookings", on_delete=models.PROTECT)
    reservation = models.ForeignKey(
        Reservation,
        related_name="experience_bookings",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )

    guest_name = models.CharField(_("guest"), max_length=150)
    guest_email = models.EmailField(_("email"), blank=True)
    starts_at = models.DateTimeField(_("starts at"), db_index=True)
    duration_minutes = models.PositiveSmallIntegerField(_("duration (min)"), default=60)
    party_size = models.PositiveSmallIntegerField(_("party size"), default=1)
    price = models.DecimalField(
        _("price"),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        default=Decimal("0.00"),
        help_text=_("In DZD. Rolls into the reservation total."),
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.REQUESTED, db_index=True
    )
    notes = models.TextField(_("notes"), blank=True)

    class Meta:
        verbose_name = _("experience booking")
        verbose_name_plural = _("experience bookings")
        ordering = ("starts_at",)
        indexes = [models.Index(fields=["status", "starts_at"])]

    def __str__(self) -> str:
        return f"{self.service.slug} · {self.guest_name} · {self.starts_at:%Y-%m-%d %H:%M}"
