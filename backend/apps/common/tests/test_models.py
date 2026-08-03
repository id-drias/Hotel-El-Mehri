"""The shared foundation: publish filtering and translation resolution.

The translation lookup is exercised here rather than once per app, because
every public read endpoint funnels through it and a bug would show up as
"the Arabic site is in French" rather than as an exception.
"""

from __future__ import annotations

from decimal import Decimal

import pytest
from django.utils import translation

from apps.common.utils import active_language, pick_translation
from apps.rooms.models import Room, RoomTranslation

pytestmark = pytest.mark.django_db


@pytest.fixture
def room():
    room = Room.objects.create(slug="suite-royale", base_price=Decimal("40000"))
    RoomTranslation.objects.create(room=room, language="fr", name="Suite Royale")
    RoomTranslation.objects.create(room=room, language="ar", name="الجناح الملكي")
    return room


class TestActiveLanguage:
    @pytest.mark.parametrize(
        ("requested", "expected"),
        [
            ("fr", "fr"),
            ("ar", "ar"),
            ("en", "en"),
            # Region subtags must still match the stored rows: a browser asking
            # for fr-CA wants the French content, not the default.
            ("fr-CA", "fr"),
            ("ar-DZ", "ar"),
            ("en-GB", "en"),
        ],
    )
    def test_narrows_to_a_stored_language(self, requested, expected):
        with translation.override(requested):
            assert active_language() == expected

    def test_unknown_language_falls_back_to_the_default(self):
        with translation.override("de"):
            assert active_language() == "fr"


class TestPickTranslation:
    def test_returns_the_active_language(self, room):
        with translation.override("ar"):
            assert pick_translation(room).name == "الجناح الملكي"

    def test_falls_back_to_the_default_when_missing(self, room):
        # No English row exists; the visitor gets French rather than nothing.
        with translation.override("en"):
            assert pick_translation(room).name == "Suite Royale"

    def test_falls_back_to_any_row_when_the_default_is_missing(self):
        room = Room.objects.create(slug="orphan")
        RoomTranslation.objects.create(room=room, language="ar", name="فقط بالعربية")

        with translation.override("en"):
            assert pick_translation(room).name == "فقط بالعربية"

    def test_returns_none_when_there_are_no_translations(self):
        room = Room.objects.create(slug="untranslated")
        assert pick_translation(room) is None

    def test_explicit_language_wins_over_the_active_one(self, room):
        with translation.override("fr"):
            assert pick_translation(room, language="ar").name == "الجناح الملكي"

    def test_reads_prefetched_rows_without_extra_queries(self, room, django_assert_num_queries):
        """The reason `pick_translation` iterates instead of filtering.

        With the prefetch in place, resolving a translation must cost zero
        further queries — otherwise a twelve-item list page issues twelve.
        """
        loaded = Room.objects.prefetch_related("translations").get(pk=room.pk)

        with django_assert_num_queries(0):
            pick_translation(loaded)


class TestPublishableQuerySet:
    def test_published_excludes_drafts(self):
        Room.objects.create(slug="live", is_published=True)
        Room.objects.create(slug="draft", is_published=False)

        slugs = set(Room.objects.published().values_list("slug", flat=True))
        assert slugs == {"live"}

    def test_default_ordering_is_by_position(self):
        Room.objects.create(slug="third", position=3)
        Room.objects.create(slug="first", position=1)
        Room.objects.create(slug="second", position=2)

        assert list(Room.objects.values_list("slug", flat=True)) == ["first", "second", "third"]
