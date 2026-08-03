"""Gallery models, selectors and reorder service."""

from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.gallery.models import MediaAsset, MediaCategory, MediaCategoryTranslation
from apps.gallery.selectors import assets, categories
from apps.gallery.services import reorder_assets, retire_asset

pytestmark = pytest.mark.django_db


def pixel(name="pixel.gif") -> SimpleUploadedFile:
    return SimpleUploadedFile(
        name,
        b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!"
        b"\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;",
        content_type="image/gif",
    )


@pytest.fixture
def category():
    category = MediaCategory.objects.create(slug="rooms", tag=MediaCategory.Tag.ROOM)
    MediaCategoryTranslation.objects.create(category=category, language="fr", name="Chambres")
    return category


class TestModels:
    def test_one_translation_per_language(self, category):
        from django.db.utils import IntegrityError

        with pytest.raises(IntegrityError):
            MediaCategoryTranslation.objects.create(
                category=category, language="fr", name="Doublon"
            )

    def test_asset_survives_its_category_being_deleted(self, category):
        asset = MediaAsset.objects.create(category=category, image=pixel())
        category.delete()

        asset.refresh_from_db()
        # SET_NULL, not CASCADE: deleting a filter tab must not delete the
        # photographs filed under it.
        assert asset.category is None


class TestSelectors:
    def test_categories_are_published_only(self, category):
        MediaCategory.objects.create(slug="hidden", is_published=False)
        assert [c.slug for c in categories()] == ["rooms"]

    def test_assets_can_be_scoped_by_category(self, category):
        other = MediaCategory.objects.create(slug="dining")
        MediaAsset.objects.create(category=category, image=pixel())
        MediaAsset.objects.create(category=other, image=pixel())

        assert assets(category_slug="rooms").count() == 1

    def test_assets_can_be_scoped_by_tag(self, category):
        other = MediaCategory.objects.create(slug="dining", tag=MediaCategory.Tag.SERVICE)
        MediaAsset.objects.create(category=category, image=pixel())
        MediaAsset.objects.create(category=other, image=pixel())

        assert assets(tag="service").count() == 1


class TestServices:
    def test_reorder_applies_the_given_sequence(self, category):
        first = MediaAsset.objects.create(category=category, image=pixel(), position=0)
        second = MediaAsset.objects.create(category=category, image=pixel(), position=1)
        third = MediaAsset.objects.create(category=category, image=pixel(), position=2)

        reorder_assets(category=category, ordered_ids=[third.id, first.id, second.id])

        order = list(
            MediaAsset.objects.filter(category=category)
            .order_by("position")
            .values_list("id", flat=True)
        )
        assert order == [third.id, first.id, second.id]

    def test_reorder_ignores_ids_from_another_category(self, category):
        other = MediaCategory.objects.create(slug="dining")
        mine = MediaAsset.objects.create(category=category, image=pixel(), position=0)
        theirs = MediaAsset.objects.create(category=other, image=pixel(), position=0)

        changed = reorder_assets(category=category, ordered_ids=[theirs.id, mine.id])

        theirs.refresh_from_db()
        assert theirs.position == 0  # untouched
        assert changed == 1

    def test_retire_unpublishes_without_deleting(self, category):
        asset = MediaAsset.objects.create(category=category, image=pixel())
        retire_asset(asset=asset)

        asset.refresh_from_db()
        assert asset.is_published is False
        # The file stays: a cached page or a sent email may still reference it.
        assert MediaAsset.objects.filter(pk=asset.pk).exists()
