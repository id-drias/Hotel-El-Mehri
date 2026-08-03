"""Service and event-hall endpoints."""

from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.services.models import (
    EventHall,
    EventHallTranslation,
    Service,
    ServiceTranslation,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def spa():
    service = Service.objects.create(slug="spa", category=Service.Category.WELLNESS)
    ServiceTranslation.objects.create(
        service=service,
        language="fr",
        name="Centre de Spa",
        kicker="Loisirs et bien-être",
        description="Hammam, piscine couverte et cabines de massage.",
    )
    ServiceTranslation.objects.create(
        service=service, language="ar", name="مركز السبا", kicker="الترفيه والاستجمام"
    )
    return service


@pytest.fixture
def events():
    service = Service.objects.create(slug="evenementiel", category=Service.Category.EVENTS)
    ServiceTranslation.objects.create(service=service, language="fr", name="Événementiel")
    hall = EventHall.objects.create(service=service, slug="salle-lyna", seating_capacity=230)
    EventHallTranslation.objects.create(hall=hall, language="fr", name="Salle LYNA")
    return service


class TestAccess:
    def test_list_is_public(self, client, spa):
        response = client.get(reverse("v1:services:services-list"))
        assert response.status_code == 200
        assert response.data[0]["slug"] == "spa"

    def test_detail_is_public(self, client, spa):
        response = client.get(reverse("v1:services:services-detail", args=["spa"]))
        assert response.status_code == 200

    def test_unpublished_services_are_hidden(self, client, spa):
        Service.objects.create(
            slug="draft", category=Service.Category.RESTAURANT, is_published=False
        )
        slugs = [item["slug"] for item in client.get(reverse("v1:services:services-list")).data]
        assert "draft" not in slugs

    def test_halls_endpoint_is_public(self, client, events):
        response = client.get(reverse("v1:services:services-halls"))
        assert response.status_code == 200
        assert response.data[0]["seating_capacity"] == 230


class TestTranslation:
    def test_name_and_kicker_follow_the_language(self, client, spa):
        french = client.get(reverse("v1:services:services-list"))
        arabic = client.get(reverse("v1:services:services-list"), HTTP_ACCEPT_LANGUAGE="ar")

        assert french.data[0]["name"] == "Centre de Spa"
        assert arabic.data[0]["kicker"] == "الترفيه والاستجمام"

    def test_missing_arabic_description_falls_back_to_empty(self, client, spa):
        """The Arabic row has no description; the field must be blank, not French."""
        response = client.get(reverse("v1:services:services-list"), HTTP_ACCEPT_LANGUAGE="ar")
        assert response.data[0]["description"] == ""


class TestFilters:
    def test_filter_by_category(self, client, spa, events):
        response = client.get(reverse("v1:services:services-list"), {"category": "wellness"})
        assert [item["slug"] for item in response.data] == ["spa"]


class TestPublishCascade:
    def test_retiring_a_service_hides_its_halls(self, client, events):
        from apps.services.services import set_published

        set_published(service=events, is_published=False)

        # A hall left live would link back to a service page that is gone.
        assert client.get(reverse("v1:services:services-halls")).data == []
