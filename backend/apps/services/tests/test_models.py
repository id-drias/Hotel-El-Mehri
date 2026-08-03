"""Service and event-hall models."""

from __future__ import annotations

import pytest
from django.db.utils import IntegrityError

from apps.services.models import (
    EventHall,
    EventHallTranslation,
    Service,
    ServiceTranslation,
)
from apps.services.selectors import halls, services
from apps.services.services import set_published

pytestmark = pytest.mark.django_db


@pytest.fixture
def restaurant():
    service = Service.objects.create(slug="el-mayda", category=Service.Category.RESTAURANT)
    ServiceTranslation.objects.create(service=service, language="fr", name="El Mayda")
    return service


class TestModels:
    def test_one_translation_per_language(self, restaurant):
        with pytest.raises(IntegrityError):
            ServiceTranslation.objects.create(
                service=restaurant, language="fr", name="Doublon"
            )

    def test_deleting_a_service_takes_its_halls(self, restaurant):
        hall = EventHall.objects.create(
            service=restaurant, slug="salle-lyna", seating_capacity=230
        )
        restaurant.delete()

        # CASCADE here, unlike gallery: a hall has no meaning without its
        # parent service.
        assert not EventHall.objects.filter(pk=hall.pk).exists()

    def test_ordering_is_by_position(self):
        Service.objects.create(slug="third", category=Service.Category.WELLNESS, position=3)
        Service.objects.create(slug="first", category=Service.Category.WELLNESS, position=1)

        assert [s.slug for s in Service.objects.all()][:2] == ["first", "third"]


class TestSelectors:
    def test_services_are_published_only(self, restaurant):
        Service.objects.create(
            slug="draft", category=Service.Category.RESTAURANT, is_published=False
        )
        assert [s.slug for s in services()] == ["el-mayda"]

    def test_services_filter_by_category(self, restaurant):
        Service.objects.create(slug="spa", category=Service.Category.WELLNESS)
        assert [s.slug for s in services(category="wellness")] == ["spa"]

    def test_halls_are_published_only(self, restaurant):
        visible = EventHall.objects.create(
            service=restaurant, slug="salle-lyna", seating_capacity=230
        )
        EventHall.objects.create(
            service=restaurant, slug="hidden", seating_capacity=50, is_published=False
        )
        EventHallTranslation.objects.create(hall=visible, language="fr", name="Salle LYNA")

        assert [h.slug for h in halls()] == ["salle-lyna"]


class TestPublishCascade:
    def test_retiring_a_service_retires_its_halls(self, restaurant):
        hall = EventHall.objects.create(
            service=restaurant, slug="salle-lyna", seating_capacity=230
        )

        set_published(service=restaurant, is_published=False)

        hall.refresh_from_db()
        assert hall.is_published is False

    def test_republishing_restores_them(self, restaurant):
        hall = EventHall.objects.create(
            service=restaurant, slug="salle-lyna", seating_capacity=230
        )
        set_published(service=restaurant, is_published=False)
        set_published(service=restaurant, is_published=True)

        hall.refresh_from_db()
        assert hall.is_published is True

    def test_no_change_is_a_no_op(self, restaurant):
        hall = EventHall.objects.create(
            service=restaurant, slug="salle-lyna", seating_capacity=230, is_published=False
        )
        # Service already published; the call must not sweep the hall back on.
        set_published(service=restaurant, is_published=True)

        hall.refresh_from_db()
        assert hall.is_published is False
