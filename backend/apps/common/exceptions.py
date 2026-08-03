"""Custom API exceptions and the DRF exception handler."""

from __future__ import annotations

import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


class Conflict(Exception):
    """The request was valid but the world moved — 409, not 400.

    Raised when inventory is taken between the availability check and the
    write. A 400 would tell the client its payload was wrong, which it was not,
    and a retry with the same body might well succeed.
    """

    def __init__(self, detail: str = "That resource is no longer available."):
        self.detail = detail
        super().__init__(detail)


def api_exception_handler(exc, context):
    """DRF handler extended for the two exception types services raise.

    Django's `ValidationError` and `IntegrityError` reach the view layer from
    `services.py` and would otherwise become 500s, which is both wrong and
    noisy — a guest booking a sold-out room is not a server fault.
    """
    if isinstance(exc, Conflict):
        return Response({"detail": exc.detail}, status=status.HTTP_409_CONFLICT)

    if isinstance(exc, DjangoValidationError):
        detail = exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages}
        return Response(detail, status=status.HTTP_400_BAD_REQUEST)

    if isinstance(exc, IntegrityError):
        # A constraint fired — most likely the double-booking exclusion. The
        # message itself is a database internal, so it is logged rather than
        # returned.
        logger.warning("IntegrityError surfaced to the API: %s", exc)
        return Response(
            {"detail": "That changed while your request was being processed."},
            status=status.HTTP_409_CONFLICT,
        )

    return drf_exception_handler(exc, context)
