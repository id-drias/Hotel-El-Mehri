"""Gallery endpoints."""

from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient

from apps.gallery.models import MediaAsset, MediaCategory, MediaCategoryTranslation

pytestmark = pytest.mark.django_db

# A one-pixel GIF: enough for an ImageField, small enough to inline.
PIXEL = SimpleUploadedFile(
    "pixel.gif",
    b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!"
    b"\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;",
    content_type="image/gif",
)


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def category():
    category = MediaCategory.objects.create(slug="rooms", tag=MediaCategory.Tag.ROOM)
    MediaCategoryTranslation.objects.create(category=category, language="fr", name="Chambres")
    MediaCategoryTranslation.objects.create(category=category, language="ar", name="الغرف")
    return category


@pytest.fixture
def asset(category):
    return MediaAsset.objects.create(category=category, image=PIXEL, alt_text="Suite Royale")


class TestAccess:
    def test_list_is_public(self, client, asset):
        response = client.get(reverse("v1:gallery:gallery-list"))
        assert response.status_code == 200
        assert response.data["count"] == 1

    def test_unpublished_assets_are_hidden(self, client, category):
        MediaAsset.objects.create(category=category, image=PIXEL, is_published=False)
        assert client.get(reverse("v1:gallery:gallery-list")).data["count"] == 0

    def test_categories_endpoint_is_public(self, client, category):
        response = client.get(reverse("v1:gallery:gallery-categories"))
        assert response.status_code == 200
        assert response.data[0]["slug"] == "rooms"


class TestTranslation:
    def test_category_name_follows_the_language(self, client, category):
        french = client.get(reverse("v1:gallery:gallery-categories"))
        arabic = client.get(reverse("v1:gallery:gallery-categories"), HTTP_ACCEPT_LANGUAGE="ar")

        assert french.data[0]["name"] == "Chambres"
        assert arabic.data[0]["name"] == "الغرف"


class TestMediaUrls:
    def test_url_is_absolute(self, client, asset):
        """Relative URLs would resolve against the frontend origin and 404."""
        url = client.get(reverse("v1:gallery:gallery-list")).data["results"][0]["url"]
        assert url.startswith("http://")


class TestFilters:
    def test_filter_by_category_slug(self, client, category, asset):
        other = MediaCategory.objects.create(slug="dining", tag=MediaCategory.Tag.SERVICE)
        MediaAsset.objects.create(category=other, image=PIXEL)

        response = client.get(reverse("v1:gallery:gallery-list"), {"category": "rooms"})
        assert response.data["count"] == 1

    def test_filter_by_tag(self, client, category, asset):
        other = MediaCategory.objects.create(slug="dining", tag=MediaCategory.Tag.SERVICE)
        MediaAsset.objects.create(category=other, image=PIXEL)

        response = client.get(reverse("v1:gallery:gallery-list"), {"tag": "service"})
        assert response.data["count"] == 1
