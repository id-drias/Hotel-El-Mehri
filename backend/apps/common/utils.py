"""Small helpers shared across apps.

The translation lookup here is the load-bearing one: every public read endpoint
returns content in the visitor's language, and the site stores one row per
language per model.
"""

from __future__ import annotations

from typing import Any

from django.conf import settings
from django.utils.translation import get_language


def supported_languages() -> tuple[str, ...]:
    return tuple(code for code, _label in settings.LANGUAGES)


def active_language() -> str:
    """The request's language, narrowed to one this site actually stores.

    `LocaleMiddleware` sets the active language from Accept-Language, which the
    Next.js frontend forwards from the current route. A browser sending `fr-CA`
    or `ar-DZ` must still match the `fr` / `ar` rows in the database, so the
    region subtag is dropped before matching.
    """
    code = get_language() or settings.LANGUAGE_CODE
    supported = supported_languages()

    if code in supported:
        return code

    base = code.split("-")[0]
    if base in supported:
        return base

    return settings.LANGUAGE_CODE


def pick_translation(
    instance: Any, *, related_name: str = "translations", language: str | None = None
):
    """Best available translation row for `instance`.

    Order: the active language, then the site default, then whatever exists.
    Returns None only when the object has no translations at all — a
    content-entry mistake, not a crash, so callers render empty strings instead
    of raising.

    **Iterates rather than filters.** `instance.translations.filter(...)` reads
    more tidily and costs one query per object, which turns a twelve-item list
    into thirteen queries. The viewsets prefetch `translations`, and iterating
    that prefetched list keeps the whole page at two.
    """
    rows = list(getattr(instance, related_name).all())
    if not rows:
        return None

    wanted = language or active_language()
    by_language = {row.language: row for row in rows}

    return by_language.get(wanted) or by_language.get(settings.LANGUAGE_CODE) or rows[0]


def absolute_media_url(request, file_field) -> str | None:
    """Absolute URL for an ImageField, or None when it is empty.

    Absolute because the frontend runs on a different origin: a relative
    `/media/rooms/x.jpg` would resolve against localhost:3000 and 404.
    """
    if not file_field:
        return None

    url = file_field.url
    return request.build_absolute_uri(url) if request is not None else url


def client_ip(request) -> str | None:
    """Best-effort client IP for throttling and abuse records.

    `X-Forwarded-For` is only trustworthy behind a proxy that overwrites it; a
    direct client can send anything. Read first because this app is deployed
    behind one, with the socket address as the fallback.
    """
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")
