"""Write-side business logic for the gallery.

Images are uploaded through the Django admin, so there is no public write path.
The helpers here are the bookkeeping the admin needs.
"""

from __future__ import annotations

from django.db import transaction

from apps.gallery.models import MediaAsset, MediaCategory


@transaction.atomic
def reorder_assets(*, category: MediaCategory, ordered_ids: list[int]) -> int:
    """Apply a drag-and-drop reorder.

    One UPDATE per row, in a single transaction — a partial reorder that leaves
    two images claiming position 3 is worse than none.
    """
    rows = MediaAsset.objects.filter(category=category, id__in=ordered_ids)
    assets = {asset.id: asset for asset in rows}

    to_update = []
    for position, asset_id in enumerate(ordered_ids):
        asset = assets.get(asset_id)
        if asset is not None and asset.position != position:
            asset.position = position
            to_update.append(asset)

    if to_update:
        MediaAsset.objects.bulk_update(to_update, ["position"])

    return len(to_update)


def retire_asset(*, asset: MediaAsset) -> MediaAsset:
    """Hide an image without deleting the file.

    Unpublishing rather than deleting: the file may be referenced by a cached
    page or an already-sent email, and a 404 image is worse than a stale one.
    """
    if asset.is_published:
        asset.is_published = False
        asset.save(update_fields=["is_published"])
    return asset
