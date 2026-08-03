"""Typed access to the property-wide config at the repository root.

``hotel.config.json`` is the single source of truth for both stacks: this module
is the Django half, ``frontend/src/config/index.ts`` is the Next.js half, and
both read the same file. Nothing under ``backend/`` should hardcode the hotel's
name, address, email or database identifiers — read them from here.

Settings, email subjects and the OpenAPI schema title all resolve through this
module, so rebranding the deployment is a single JSON edit.
"""

from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

# backend/config/hotel_config.py -> backend/config -> backend -> repository root
_DEFAULT_PATH = Path(__file__).resolve().parents[2] / "hotel.config.json"

#: Override when the JSON is deployed somewhere other than the repo root — for
#: example when only ``backend/`` is shipped to the Python host.
CONFIG_PATH = Path(os.environ.get("HOTEL_CONFIG_PATH", _DEFAULT_PATH))


@lru_cache(maxsize=1)
def load() -> dict[str, Any]:
    """Read and cache ``hotel.config.json``.

    Cached because Django settings import this at module scope and the file
    never changes within a process. Call ``load.cache_clear()`` in tests that
    need to point at a different file.
    """
    with CONFIG_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def get(path: str, default: Any = None) -> Any:
    """Fetch a dotted path, e.g. ``get("contact.email")``.

    Returns ``default`` when any segment is missing, so a partially filled
    config degrades instead of raising at import time.
    """
    node: Any = load()
    for segment in path.split("."):
        if not isinstance(node, dict) or segment not in node:
            return default
        node = node[segment]
    return node


# --------------------------------------------------------------- shorthands --
# The handful of values settings.py and the mailers reach for constantly.

HOTEL_NAME: str = get("brand.name", "Hotel")
HOTEL_SHORT_NAME: str = get("brand.shortName", HOTEL_NAME)
HOTEL_CITY: str = get("address.city", "")
EMAIL_SUBJECT_PREFIX: str = get("infrastructure.emailSubjectPrefix", HOTEL_SHORT_NAME)
