"""Shared pytest configuration.

Lives at the repository root so every app's tests pick it up.
"""

import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def _reset_throttles():
    """Clear DRF's throttle history between tests.

    `ScopedRateThrottle` keeps its counters in the Django cache, which is
    process-wide and survives the per-test database rollback. Without this, the
    fourth test to POST a review gets a 429 and fails for a reason that has
    nothing to do with what it is testing — and the failure moves around as
    tests are reordered, which is the worst kind to debug.

    Tests that mean to exercise a throttle simply make the requests themselves;
    they start from a clean count either way.
    """
    cache.clear()
    yield
    cache.clear()
