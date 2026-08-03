"""Accounts: the custom user, its roles, and the guest profile.

`AUTH_USER_MODEL` points here from the very first migration. Swapping it later
is a documented migration ordeal, and no database had been created when this
app was introduced — which made this the last cheap moment to do it.
"""

from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import UserManager as DjangoUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import TimeStampedModel


class UserManager(DjangoUserManager):
    """Adds role-aware helpers and normalises email on the way in."""

    def create_user(self, username, email=None, password=None, **extra):
        # Email is the account's real identity here — it is what a guest gets a
        # booking confirmation on — so it is normalised and required.
        email = self.normalize_email(email) if email else email
        return super().create_user(username, email, password, **extra)

    def create_superuser(self, username, email=None, password=None, **extra):
        # A Django superuser must also carry the application role, or it would
        # pass `is_superuser` checks while failing every role-based permission.
        extra.setdefault("role", User.Role.ADMIN)
        return super().create_superuser(username, email, password, **extra)

    def staff_members(self):
        return self.filter(role__in=User.STAFF_ROLES, is_active=True)


class User(AbstractUser):
    """Site user.

    Roles are application authorisation. Django's own `is_staff` governs access
    to the Django admin site and nothing else — the two are deliberately not
    wired together, so granting someone the Django admin does not silently give
    them the ability to refund a booking through the API.
    """

    class Role(models.TextChoices):
        GUEST = "guest", _("Guest")
        STAFF = "staff", _("Staff")  # front desk, housekeeping, concierge
        MANAGER = "manager", _("Manager")  # rates, inventory, cancellations
        ADMIN = "admin", _("Administrator")  # user management, audit

    #: Roles allowed into the admin console at all.
    STAFF_ROLES = (Role.STAFF, Role.MANAGER, Role.ADMIN)
    #: Roles allowed to move money or change pricing.
    MANAGER_ROLES = (Role.MANAGER, Role.ADMIN)

    # Unique because it is the account identity and the password-reset channel.
    email = models.EmailField(_("email address"), unique=True)
    role = models.CharField(
        _("role"), max_length=20, choices=Role.choices, default=Role.GUEST, db_index=True
    )
    phone_number = models.CharField(_("phone"), max_length=32, blank=True)
    preferred_language = models.CharField(
        _("preferred language"),
        max_length=5,
        default="fr",
        choices=[("fr", "FR"), ("ar", "AR"), ("en", "EN")],
    )

    objects = UserManager()

    class Meta(AbstractUser.Meta):
        verbose_name = _("user")
        verbose_name_plural = _("users")

    def __str__(self) -> str:
        return self.get_full_name() or self.username

    # -- role predicates ---------------------------------------------------
    # Properties rather than scattered `user.role == "admin"` comparisons: one
    # place to change if a role is ever added or split.

    @property
    def is_guest(self) -> bool:
        return self.role == self.Role.GUEST

    @property
    def is_staff_member(self) -> bool:
        """Any console user. Not to be confused with Django's `is_staff`."""
        return self.role in self.STAFF_ROLES

    @property
    def is_manager(self) -> bool:
        return self.role in self.MANAGER_ROLES

    @property
    def is_admin_role(self) -> bool:
        return self.role == self.Role.ADMIN


class GuestProfile(TimeStampedModel):
    """Guest-only attributes.

    Split from `User` so a housekeeping account carries no dietary notes and no
    VIP tier, and so the guest-facing serializer has a natural boundary.
    """

    class VipTier(models.TextChoices):
        NONE = "none", _("Standard")
        SILVER = "silver", _("Silver")
        GOLD = "gold", _("Gold")
        PLATINUM = "platinum", _("Platinum")

    user = models.OneToOneField(
        User, related_name="guest_profile", on_delete=models.CASCADE, primary_key=True
    )
    vip_tier = models.CharField(
        _("VIP tier"), max_length=20, choices=VipTier.choices, default=VipTier.NONE, db_index=True
    )
    nationality = models.CharField(_("nationality"), max_length=2, blank=True)  # ISO 3166-1 alpha-2
    date_of_birth = models.DateField(_("date of birth"), null=True, blank=True)
    dietary_notes = models.TextField(_("dietary notes"), blank=True)
    accessibility_notes = models.TextField(_("accessibility notes"), blank=True)
    internal_notes = models.TextField(
        _("internal notes"),
        blank=True,
        help_text=_("Staff-visible only. Never serialise this to a guest-facing endpoint."),
    )
    marketing_opt_in = models.BooleanField(_("marketing opt-in"), default=False)

    class Meta:
        verbose_name = _("guest profile")
        verbose_name_plural = _("guest profiles")

    def __str__(self) -> str:
        return f"{self.user} ({self.get_vip_tier_display()})"

    @property
    def is_vip(self) -> bool:
        return self.vip_tier != self.VipTier.NONE
