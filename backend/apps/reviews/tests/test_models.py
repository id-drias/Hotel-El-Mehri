"""Review model and moderation service."""

from __future__ import annotations

import pytest
from django.core.exceptions import ValidationError

from apps.reviews import services
from apps.reviews.models import Review
from apps.reviews.selectors import approved, moderation_queue, rating_summary
from apps.rooms.models import Room

pytestmark = pytest.mark.django_db


@pytest.fixture
def room():
    return Room.objects.create(slug="suite-royale")


def make(status=Review.Status.PENDING, rating=5, room=None):
    return Review.objects.create(
        room=room,
        author_name="Guest",
        rating=rating,
        content="A perfectly reasonable review of the stay.",
        status=status,
    )


class TestModel:
    def test_rating_bounds_are_enforced_by_full_clean(self):
        review = Review(author_name="G", rating=6, content="Too high.")
        with pytest.raises(ValidationError):
            review.full_clean()

    def test_a_review_may_have_no_room(self):
        """A review of the hotel as a whole, not of one suite."""
        assert make().room is None

    def test_default_status_is_pending(self):
        assert make().status == Review.Status.PENDING


class TestModeration:
    def test_approving_stamps_published_at(self):
        review = make()
        services.moderate(review=review, status=Review.Status.APPROVED)

        review.refresh_from_db()
        assert review.published_at is not None

    def test_rejecting_does_not_stamp_published_at(self):
        review = make()
        services.moderate(review=review, status=Review.Status.REJECTED)

        review.refresh_from_db()
        assert review.published_at is None

    def test_re_approving_keeps_the_original_date(self):
        """A review pulled and restored must not jump to the top of the list."""
        review = make()
        services.moderate(review=review, status=Review.Status.APPROVED)
        first = Review.objects.get(pk=review.pk).published_at

        services.moderate(review=review, status=Review.Status.REJECTED)
        services.moderate(review=review, status=Review.Status.APPROVED)

        assert Review.objects.get(pk=review.pk).published_at == first

    def test_submit_always_creates_a_pending_row(self):
        review = services.submit_review(
            data={"author_name": "G", "rating": 5, "content": "Lovely stay, thank you."}
        )
        assert review.status == Review.Status.PENDING


class TestSelectors:
    def test_approved_excludes_everything_else(self, room):
        make(Review.Status.APPROVED, room=room)
        make(Review.Status.PENDING, room=room)
        make(Review.Status.REJECTED, room=room)

        assert approved().count() == 1

    def test_approved_can_be_scoped_to_a_room(self, room):
        other = Room.objects.create(slug="suite-junior")
        make(Review.Status.APPROVED, room=room)
        make(Review.Status.APPROVED, room=other)

        assert approved(room_slug="suite-royale").count() == 1

    def test_rating_summary_ignores_unapproved(self, room):
        make(Review.Status.APPROVED, rating=4, room=room)
        make(Review.Status.APPROVED, rating=5, room=room)
        make(Review.Status.PENDING, rating=1, room=room)

        # 4.5, not 3.33 — the pending 1-star must not drag the average down.
        assert rating_summary() == {"average": 4.5, "count": 2}

    def test_rating_summary_with_no_reviews(self):
        assert rating_summary() == {"average": None, "count": 0}

    def test_moderation_queue_is_pending_only(self, room):
        make(Review.Status.PENDING, room=room)
        make(Review.Status.APPROVED, room=room)

        assert moderation_queue().count() == 1
