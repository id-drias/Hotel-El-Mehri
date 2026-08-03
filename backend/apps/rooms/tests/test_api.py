"""Public room endpoints."""

from __future__ import annotations

from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.rooms.models import Room, RoomSpecification, RoomTranslation, RoomUnit

pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def room():
    room = Room.objects.create(
        slug="suite-royale",
        base_price=Decimal("46000"),
        surface_m2=80,
        max_adults=2,
        max_children=2,
    )
    RoomTranslation.objects.create(
        room=room, language="fr", name="Suite Royale", description="La plus vaste."
    )
    RoomTranslation.objects.create(
        room=room, language="ar", name="الجناح الملكي", description="الأوسع."
    )
    RoomSpecification.objects.create(room=room, language="fr", label="Wifi", position=0)
    RoomSpecification.objects.create(room=room, language="ar", label="واي فاي", position=0)
    RoomUnit.objects.create(room=room, number="601")
    return room


class TestAccess:
    def test_list_is_public(self, client, room):
        assert client.get(reverse("v1:rooms:rooms-list")).status_code == 200

    def test_detail_is_public(self, client, room):
        response = client.get(reverse("v1:rooms:rooms-detail", args=[room.slug]))
        assert response.status_code == 200
        assert response.data["slug"] == "suite-royale"

    def test_unpublished_rooms_are_hidden(self, client, room):
        Room.objects.create(slug="draft", is_published=False)
        slugs = [item["slug"] for item in client.get(reverse("v1:rooms:rooms-list")).data]
        assert "draft" not in slugs

    def test_writes_are_rejected(self, client, room):
        assert client.post(reverse("v1:rooms:rooms-list"), {}).status_code == 405


class TestTranslation:
    def test_french_by_default(self, client, room):
        response = client.get(reverse("v1:rooms:rooms-list"))
        assert response.data[0]["name"] == "Suite Royale"

    def test_arabic_via_accept_language(self, client, room):
        response = client.get(reverse("v1:rooms:rooms-list"), HTTP_ACCEPT_LANGUAGE="ar")
        assert response.data[0]["name"] == "الجناح الملكي"

    def test_region_subtag_still_matches(self, client, room):
        response = client.get(reverse("v1:rooms:rooms-list"), HTTP_ACCEPT_LANGUAGE="ar-DZ")
        assert response.data[0]["name"] == "الجناح الملكي"

    def test_specifications_are_not_duplicated_across_languages(self, client, room):
        """The bug this guards: two languages of specs on one room would render
        every amenity twice."""
        response = client.get(reverse("v1:rooms:rooms-detail", args=[room.slug]))
        labels = [spec["label"] for spec in response.data["specifications"]]
        assert labels == ["Wifi"]

    def test_arabic_specifications(self, client, room):
        response = client.get(
            reverse("v1:rooms:rooms-detail", args=[room.slug]), HTTP_ACCEPT_LANGUAGE="ar"
        )
        assert [spec["label"] for spec in response.data["specifications"]] == ["واي فاي"]

    def test_missing_translation_yields_empty_string_not_an_error(self, client):
        Room.objects.create(slug="untranslated")
        response = client.get(reverse("v1:rooms:rooms-list"))
        assert response.status_code == 200
        assert any(item["name"] == "" for item in response.data)


class TestFilters:
    def test_capacity_filter(self, client, room):
        Room.objects.create(slug="single", max_adults=1)
        response = client.get(reverse("v1:rooms:rooms-list"), {"min_adults": 2})
        assert [item["slug"] for item in response.data] == ["suite-royale"]

    def test_max_price_filter(self, client, room):
        Room.objects.create(slug="cheap", base_price=Decimal("10000"))
        response = client.get(reverse("v1:rooms:rooms-list"), {"max_price": 20000})
        assert [item["slug"] for item in response.data] == ["cheap"]


class TestQueryCount:
    def test_list_does_not_scale_queries_with_rooms(
        self, client, room, django_assert_max_num_queries
    ):
        """N+1 guard. Four rooms must not cost four times the queries."""
        for index in range(3):
            extra = Room.objects.create(slug=f"room-{index}")
            RoomTranslation.objects.create(room=extra, language="fr", name=f"Room {index}")

        with django_assert_max_num_queries(4):
            client.get(reverse("v1:rooms:rooms-list"))
