"""Reusable serializer and view mixins.

`TranslatedSerializerMixin` is the one that matters: it turns the
one-row-per-language storage shape into flat fields, so the frontend receives
`{"name": "Suite Royale"}` rather than a list of translation objects it would
have to search itself.
"""

from __future__ import annotations

from apps.common.utils import pick_translation


class TranslatedSerializerMixin:
    """Flattens a related translation row onto the parent serializer.

    Declare the fields to lift, and the related name if it differs::

        class RoomSerializer(TranslatedSerializerMixin, serializers.ModelSerializer):
            translated_fields = ("name", "description")

    A missing translation yields an empty string rather than raising: a content
    gap is an editorial problem, and the page should still render.
    """

    #: Field names present on the translation model.
    translated_fields: tuple[str, ...] = ()
    #: Reverse accessor from the parent to its translations.
    translation_related_name: str = "translations"

    def to_representation(self, instance):
        data = super().to_representation(instance)

        if not self.translated_fields:
            return data

        # One lookup per object, not one per field.
        row = pick_translation(instance, related_name=self.translation_related_name)

        for field in self.translated_fields:
            data[field] = getattr(row, field, "") if row is not None else ""

        return data


class PublishedQuerysetMixin:
    """Restricts a viewset to published rows for everyone but staff.

    An editor previewing an unpublished article needs to see it; the public must
    not. `is_authenticated` is checked first so an `AnonymousUser` never reaches
    the role attribute.
    """

    def filter_published(self, queryset):
        user = getattr(self.request, "user", None)
        if user is not None and user.is_authenticated and getattr(user, "is_staff_member", False):
            return queryset
        return queryset.filter(is_published=True)
