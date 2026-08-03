"""API viewsets for contact messages.

Write-only in public, read-only for staff. Deliberately asymmetric: the form
must accept anonymous submissions, and the resulting inbox is full of names,
addresses and phone numbers that must never be listable without a login.
"""

from __future__ import annotations

from rest_framework import mixins, status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.common.permissions import IsStaffUserRole
from apps.contact import selectors, services
from apps.contact.filters import ContactMessageFilter
from apps.contact.serializers import ContactMessageCreateSerializer, ContactMessageSerializer


class ContactMessageViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    filterset_class = ContactMessageFilter
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_throttles(self):
        """Throttle submissions only — the inbox is staff-only and read freely."""
        if self.action == "create":
            self.throttle_scope = "contact"
            return super().get_throttles()
        return []

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsStaffUserRole()]

    def get_queryset(self):
        return selectors.inbox()

    def get_serializer_class(self):
        if self.action == "create":
            return ContactMessageCreateSerializer
        return ContactMessageSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        services.create_message(data=serializer.validated_data, request=request)

        # 201 with a confirmation, not the stored row: echoing the message back
        # would hand an attacker a way to read what they just wrote into an
        # otherwise staff-only resource.
        return Response(
            {"detail": "Thank you — we will reply shortly."}, status=status.HTTP_201_CREATED
        )
