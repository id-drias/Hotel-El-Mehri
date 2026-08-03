"""Blog endpoints."""

from __future__ import annotations

import datetime as dt

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.blog.models import Article, ArticleTranslation

pytestmark = pytest.mark.django_db

DAY = dt.timedelta(days=1)


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def today():
    return timezone.localdate()


def make(slug, published_at, *, is_published=True, title="Titre", body="Corps de l'article."):
    article = Article.objects.create(
        slug=slug, published_at=published_at, is_published=is_published
    )
    ArticleTranslation.objects.create(
        article=article, language="fr", title=title, excerpt="Résumé.", body=body
    )
    return article


class TestAccess:
    def test_list_is_public(self, client, today):
        make("inauguration", today)
        response = client.get(reverse("v1:blog:blog-list"))
        assert response.status_code == 200
        assert response.data["count"] == 1

    def test_detail_is_public(self, client, today):
        make("inauguration", today)
        response = client.get(reverse("v1:blog:blog-detail", args=["inauguration"]))
        assert response.status_code == 200


class TestScheduling:
    def test_unpublished_articles_are_hidden(self, client, today):
        make("draft", today, is_published=False)
        assert client.get(reverse("v1:blog:blog-list")).data["count"] == 0

    def test_future_dated_articles_are_hidden(self, client, today):
        """The flag alone is not enough.

        An editor scheduling Monday's piece sets `is_published` today; without
        the date check it would go live immediately.
        """
        make("next-week", today + 7 * DAY)
        assert client.get(reverse("v1:blog:blog-list")).data["count"] == 0

    def test_an_article_dated_today_is_live(self, client, today):
        make("today", today)
        assert client.get(reverse("v1:blog:blog-list")).data["count"] == 1

    def test_future_article_is_not_reachable_by_slug(self, client, today):
        make("next-week", today + 7 * DAY)
        assert client.get(reverse("v1:blog:blog-detail", args=["next-week"])).status_code == 404


class TestPayloads:
    def test_list_omits_the_body(self, client, today):
        """Twelve summaries must not ship twelve full articles."""
        make("inauguration", today)
        assert "body" not in client.get(reverse("v1:blog:blog-list")).data["results"][0]

    def test_detail_includes_the_body(self, client, today):
        make("inauguration", today, body="Le corps complet.")
        response = client.get(reverse("v1:blog:blog-detail", args=["inauguration"]))
        assert response.data["body"] == "Le corps complet."

    def test_newest_first(self, client, today):
        make("older", today - 5 * DAY)
        make("newer", today - 1 * DAY)

        slugs = [item["slug"] for item in client.get(reverse("v1:blog:blog-list")).data["results"]]
        assert slugs == ["newer", "older"]


class TestRelated:
    def test_related_excludes_the_article_itself(self, client, today):
        make("first", today)
        make("second", today - DAY)

        response = client.get(reverse("v1:blog:blog-related", args=["first"]))
        assert [item["slug"] for item in response.data] == ["second"]

    def test_related_is_capped(self, client, today):
        make("main", today)
        for index in range(5):
            make(f"other-{index}", today - (index + 1) * DAY)

        assert len(client.get(reverse("v1:blog:blog-related", args=["main"])).data) == 3


class TestFilters:
    def test_filter_by_year(self, client):
        make("old", dt.date(2024, 5, 1))
        make("recent", dt.date(2026, 5, 1))

        response = client.get(reverse("v1:blog:blog-list"), {"year": 2024})
        assert [item["slug"] for item in response.data["results"]] == ["old"]
