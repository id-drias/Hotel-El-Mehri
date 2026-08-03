"""API viewsets for reviews."""

from __future__ import annotations

from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.common.permissions import IsStaffUserRole
from apps.reviews import selectors, services
from apps.reviews.filters import ReviewFilter
from apps.reviews.serializers import (
    RatingSummarySerializer,
    ReviewCreateSerializer,
    ReviewModerationSerializer,
    ReviewSerializer,
)


class ReviewViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Approved reviews in public; submission open; moderation staff-only."""

    filterset_class = ReviewFilter

    def get_throttles(self):
        """Throttle submissions only.

        A class-level `throttle_scope` would apply the 3/hour limit to reads as
        well, so the fourth visitor to open the reviews page in an hour would be
        told to come back later. The limit exists to stop review spam, and only
        `create` can spam.
        """
        if self.action == "create":
            self.throttle_scope = "review"
            return super().get_throttles()
        return []

    def get_permissions(self):
        if self.action in {"list", "retrieve", "create", "summary"}:
            return [AllowAny()]
        return [IsStaffUserRole()]

    def get_queryset(self):
        if self.action in {"pending", "moderate"}:
            return selectors.moderation_queue()
        # Everything public reads through `approved()`, so an unmoderated
        # review can never be reached by guessing an id either.
        return selectors.approved()

    def get_serializer_class(self):
        return ReviewCreateSerializer if self.action == "create" else ReviewSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        services.submit_review(data=serializer.validated_data)

        # No body echo: the review is not public yet, and returning it would
        # imply it is.
        return Response(
            {"detail": "Thank you — your review will appear once it has been checked."},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Average rating and count, for the star display."""
        data = selectors.rating_summary(room_slug=request.query_params.get("room"))
        return Response(RatingSummarySerializer(data).data)

    @action(detail=False, methods=["get"], permission_classes=[IsStaffUserRole])
    def pending(self, request):
        """The moderation queue."""
        page = self.paginate_queryset(selectors.moderation_queue())
        serializer = ReviewSerializer(page, many=True, context=self.get_serializer_context())
        return self.get_paginated_response(serializer.data)

    @action(detail=True, methods=["patch"], permission_classes=[IsStaffUserRole])
    def moderate(self, request, pk=None):
        """Approve or reject."""
        review = self.get_object()

        serializer = ReviewModerationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        services.moderate(
            review=review, status=serializer.validated_data["status"], actor=request.user
        )
        return Response(ReviewSerializer(review).data)
