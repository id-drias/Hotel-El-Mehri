"""Messages sent from the contact form."""

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import TimeStampedModel


class ContactMessage(TimeStampedModel):
    full_name = models.CharField(_("full name"), max_length=150)
    email = models.EmailField(_("email"))
    phone_number = models.CharField(_("phone"), max_length=32, blank=True)
    subject = models.CharField(_("subject"), max_length=200)
    content = models.TextField(_("message"))

    language = models.CharField(max_length=5, default="fr")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    is_handled = models.BooleanField(_("handled"), default=False, db_index=True)

    class Meta:
        ordering = ("-created_at",)
        verbose_name = _("contact message")
        verbose_name_plural = _("contact messages")

    def __str__(self) -> str:
        return f"{self.subject} - {self.full_name}"
