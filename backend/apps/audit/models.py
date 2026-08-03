"""Append-only record of who changed what.

Not optional for a system where staff can alter prices and cancel paid
bookings: a refund with no attribution is indistinguishable from theft.

Two deliberate choices:

* **Written from the service layer, not from signals.** A `post_save` signal
  knows the row changed but not who changed it or why — it would have to reach
  for a thread-local to find the actor, which is exactly the kind of hidden
  coupling that makes an audit trail untrustworthy. Services already receive
  `actor`, so they record explicitly.
* **Append-only by convention and by API.** There is no update or delete
  endpoint, and `save()` refuses to overwrite an existing row. Anyone
  determined can still edit the table directly — the point is that no ordinary
  application path can.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class AuditLog(models.Model):
    """One recorded action."""

    class Action(models.TextChoices):
        # Reservations
        RESERVATION_CREATE = "reservation.create", _("Reservation created")
        RESERVATION_CONFIRM = "reservation.confirm", _("Reservation confirmed")
        RESERVATION_CANCEL = "reservation.cancel", _("Reservation cancelled")
        RESERVATION_CHECK_IN = "reservation.check_in", _("Guest checked in")
        RESERVATION_CHECK_OUT = "reservation.check_out", _("Guest checked out")
        # Money
        PAYMENT_RECORD = "payment.record", _("Payment recorded")
        # Inventory and pricing
        RATE_OVERRIDE = "rate.override", _("Nightly rate overridden")
        RATE_CLEAR = "rate.clear", _("Rate override cleared")
        ROOM_STATUS = "room.status", _("Housekeeping status changed")
        ROOM_CLOSURE = "room.closure", _("Room closed for sale")
        ROOM_BOOKABLE = "room.bookable", _("Room opened or closed for sale")
        # Concierge
        CONCIERGE_STATUS = "concierge.status", _("Concierge request advanced")
        # Auth — the security-relevant ones, where the IP is worth keeping.
        AUTH_LOGIN_FAILED = "auth.login_failed", _("Failed sign-in")

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_entries",
        help_text=_("Null for anonymous or system actions; the entry survives the account."),
    )
    action = models.CharField(max_length=60, choices=Action.choices, db_index=True)

    # A loose reference rather than a GenericForeignKey: the log must outlive
    # the row it describes, and a real FK would either block the delete or take
    # the audit entry down with it.
    target_type = models.CharField(_("target model"), max_length=60)
    target_id = models.CharField(_("target id"), max_length=60)
    target_label = models.CharField(
        _("target label"),
        max_length=200,
        blank=True,
        help_text=_("Human-readable at the time of writing, e.g. the reservation reference."),
    )

    changes = models.JSONField(
        _("changes"),
        default=dict,
        blank=True,
        help_text=_('Shape: {"field": [before, after]}. Never store secrets or card data.'),
    )
    note = models.CharField(_("note"), max_length=300, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = _("audit entry")
        verbose_name_plural = _("audit trail")
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["target_type", "target_id"]),
            models.Index(fields=["actor", "-created_at"]),
        ]

    def __str__(self) -> str:
        who = self.actor.username if self.actor_id else "system"
        return f"{self.created_at:%Y-%m-%d %H:%M} {who} {self.action} {self.target_label}"

    def save(self, *args, **kwargs):
        if self.pk is not None:
            # Not a hard security boundary — a direct UPDATE still works — but it
            # means no ordinary code path can quietly rewrite history.
            raise ValueError("Audit entries are append-only and cannot be modified.")
        super().save(*args, **kwargs)


def record(
    *,
    action: str,
    target,
    actor=None,
    changes: dict | None = None,
    note: str = "",
    ip_address: str | None = None,
) -> AuditLog:
    """Write one entry.

    `target` is any model instance; its class name and pk are captured as
    strings so the entry stays readable after the row is gone.
    """
    return AuditLog.objects.create(
        actor=actor,
        action=action,
        target_type=target.__class__.__name__,
        target_id=str(target.pk),
        target_label=str(target)[:200],
        changes=changes or {},
        note=note[:300],
        ip_address=ip_address,
    )


def client_ip(request) -> str | None:
    """Best-effort client IP.

    `X-Forwarded-For` is only trustworthy behind a proxy that overwrites it —
    a direct client can send whatever it likes. It is read first because this
    app is deployed behind one, and falls back to the socket address.
    """
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")
