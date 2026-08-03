"""Review submission and moderation.

The rule under test throughout: nothing a stranger types reaches the public
site until a staff member has approved it.
"""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.reviews.models import Review
from apps.rooms.models import Room

pytestmark = pytest.mark.django_db

User = get_user_model()
STRONG = "Str0ng-Passw0rd!"

VALID = {
    "author_name": "Claire Fontaine",
    "rating": 5,
    "title": "Superbe séjour",
    "content": "Un accueil impeccable et une chambre parfaitement tenue.",
}


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def room():
    return Room.objects.create(slug="suite-royale")


@pytest.fixture
def approved(room):
    return Review.objects.create(
        room=room,
        author_name="Amine",
        rating=5,
        content="Excellent séjour, personnel attentionné.",
        status=Review.Status.APPROVED,
    )


@pytest.fixture
def pending():
    return Review.objects.create(
        author_name="Anonyme",
        rating=1,
        content="Contenu non modéré qui ne doit jamais être public.",
        status=Review.Status.PENDING,
    )


def staff_client(role=User.Role.STAFF):
    user = User.objects.create_user(
        username=f"u-{role}", email=f"{role}@example.dz", password=STRONG, role=role
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client


class TestModerationGate:
    def test_list_shows_only_approved(self, client, approved, pending):
        response = client.get(reverse("v1:reviews:reviews-list"))
        assert response.status_code == 200
        assert response.data["count"] == 1
        assert response.data["results"][0]["author_name"] == "Amine"

    def test_pending_review_is_not_reachable_by_id(self, client, pending):
        """Hiding it from the list is not enough if the detail route serves it."""
        response = client.get(reverse("v1:reviews:reviews-detail", args=[pending.pk]))
        assert response.status_code == 404

    def test_rejected_review_is_not_public(self, client, room):
        rejected = Review.objects.create(
            author_name="X", rating=1, content="Rejected content here.",
            status=Review.Status.REJECTED,
        )
        assert (
            client.get(reverse("v1:reviews:reviews-detail", args=[rejected.pk])).status_code == 404
        )

    def test_email_is_never_published(self, client, room):
        Review.objects.create(
            room=room, author_name="Amine", email="private@example.dz", rating=5,
            content="Un très bon séjour dans cette suite.", status=Review.Status.APPROVED,
        )
        response = client.get(reverse("v1:reviews:reviews-list"))
        assert "email" not in response.data["results"][0]


class TestSubmission:
    def test_anyone_may_submit(self, client):
        response = client.post(reverse("v1:reviews:reviews-list"), VALID, format="json")
        assert response.status_code == 201

    def test_submission_lands_in_moderation(self, client):
        client.post(reverse("v1:reviews:reviews-list"), VALID, format="json")
        assert Review.objects.get().status == Review.Status.PENDING

    def test_a_caller_cannot_self_approve(self, client):
        """The escalation attempt: post your own review pre-approved."""
        client.post(
            reverse("v1:reviews:reviews-list"),
            {**VALID, "status": "approved", "published_at": "2020-01-01T00:00:00Z"},
            format="json",
        )
        review = Review.objects.get()
        assert review.status == Review.Status.PENDING
        assert review.published_at is None

    def test_submission_is_not_echoed_back(self, client):
        response = client.post(reverse("v1:reviews:reviews-list"), VALID, format="json")
        # Returning the row would imply it is live.
        assert "content" not in response.data
        assert "detail" in response.data

    @pytest.mark.parametrize("rating", [0, 6, -1])
    def test_rating_must_be_one_to_five(self, client, rating):
        response = client.post(
            reverse("v1:reviews:reviews-list"), {**VALID, "rating": rating}, format="json"
        )
        assert response.status_code == 400

    def test_content_must_be_substantial(self, client):
        response = client.post(
            reverse("v1:reviews:reviews-list"), {**VALID, "content": "ok"}, format="json"
        )
        assert response.status_code == 400
        assert "content" in response.data


class TestModerationEndpoints:
    def test_queue_is_staff_only(self, client, pending):
        assert client.get(reverse("v1:reviews:reviews-pending")).status_code in (401, 403)

    def test_staff_read_the_queue(self, pending):
        response = staff_client().get(reverse("v1:reviews:reviews-pending"))
        assert response.status_code == 200
        assert response.data["count"] == 1

    def test_approving_publishes_and_stamps_the_date(self, pending):
        response = staff_client().patch(
            reverse("v1:reviews:reviews-moderate", args=[pending.pk]),
            {"status": "approved"},
            format="json",
        )
        assert response.status_code == 200

        pending.refresh_from_db()
        assert pending.status == Review.Status.APPROVED
        assert pending.published_at is not None

    def test_approved_review_then_appears_publicly(self, client, pending):
        staff_client().patch(
            reverse("v1:reviews:reviews-moderate", args=[pending.pk]),
            {"status": "approved"},
            format="json",
        )
        assert client.get(reverse("v1:reviews:reviews-list")).data["count"] == 1

    def test_guests_cannot_moderate(self, pending):
        guest = User.objects.create_user(
            username="guest", email="g@example.dz", password=STRONG, role=User.Role.GUEST
        )
        client = APIClient()
        client.force_authenticate(user=guest)

        response = client.patch(
            reverse("v1:reviews:reviews-moderate", args=[pending.pk]),
            {"status": "approved"},
            format="json",
        )
        assert response.status_code == 403


class TestSummary:
    def test_average_counts_approved_only(self, client, room, pending):
        for rating in (4, 5):
            Review.objects.create(
                room=room, author_name="G", rating=rating,
                content="Un séjour agréable et bien organisé.",
                status=Review.Status.APPROVED,
            )

        response = client.get(reverse("v1:reviews:reviews-summary"))
        assert response.data == {"average": 4.5, "count": 2}

    def test_summary_is_empty_when_nothing_is_approved(self, client, pending):
        response = client.get(reverse("v1:reviews:reviews-summary"))
        assert response.data == {"average": None, "count": 0}
