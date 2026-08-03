"""Article model, selectors and publish service."""

from __future__ import annotations

import datetime as dt

import pytest
from django.db.utils import IntegrityError
from django.utils import timezone

from apps.blog.models import Article, ArticleTranslation
from apps.blog.selectors import published_articles, related_articles
from apps.blog.services import publish, unpublish

pytestmark = pytest.mark.django_db

DAY = dt.timedelta(days=1)


@pytest.fixture
def today():
    return timezone.localdate()


def make(slug, published_at, **overrides):
    return Article.objects.create(slug=slug, published_at=published_at, **overrides)


class TestModel:
    def test_slug_is_unique(self, today):
        make("inauguration", today)
        with pytest.raises(IntegrityError):
            make("inauguration", today)

    def test_one_translation_per_language(self, today):
        article = make("inauguration", today)
        ArticleTranslation.objects.create(article=article, language="fr", title="Titre")

        with pytest.raises(IntegrityError):
            ArticleTranslation.objects.create(article=article, language="fr", title="Doublon")

    def test_default_ordering_is_newest_first(self, today):
        make("older", today - 5 * DAY)
        make("newer", today)

        assert [a.slug for a in Article.objects.all()] == ["newer", "older"]


class TestSelectors:
    def test_excludes_drafts(self, today):
        make("live", today)
        make("draft", today, is_published=False)

        assert [a.slug for a in published_articles()] == ["live"]

    def test_excludes_future_dates(self, today):
        make("live", today)
        make("scheduled", today + 3 * DAY)

        assert [a.slug for a in published_articles()] == ["live"]

    def test_includes_today(self, today):
        make("today", today)
        assert published_articles().count() == 1

    def test_related_excludes_self_and_respects_the_limit(self, today):
        main = make("main", today)
        for index in range(5):
            make(f"other-{index}", today - (index + 1) * DAY)

        results = list(related_articles(article=main))
        assert len(results) == 3
        assert main not in results


class TestPublishService:
    def test_publish_flips_the_flag_without_touching_the_date(self, today):
        article = make("draft", today, is_published=False)
        publish(article=article)

        article.refresh_from_db()
        assert article.is_published is True
        assert article.published_at == today

    def test_publish_can_reschedule_explicitly(self, today):
        article = make("draft", today, is_published=False)
        publish(article=article, on=today + 7 * DAY)

        article.refresh_from_db()
        assert article.published_at == today + 7 * DAY

    def test_republishing_keeps_the_original_date(self, today):
        original = today - 30 * DAY
        article = make("old-news", original)

        unpublish(article=article)
        publish(article=article)

        article.refresh_from_db()
        # Resurfacing a month-old post at the top of the index would misrepresent
        # it as news.
        assert article.published_at == original

    def test_unpublish_keeps_the_date(self, today):
        article = make("news", today)
        unpublish(article=article)

        article.refresh_from_db()
        assert article.is_published is False
        assert article.published_at == today
