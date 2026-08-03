"""Test settings: fast, isolated, no external services."""

import tempfile

from .base import *  # noqa: F403

DEBUG = False
DATABASES["default"] = {  # noqa: F405
    "ENGINE": "django.db.backends.sqlite3",
    "NAME": ":memory:",
}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Uploads go to a scratch directory, never the repository. The gallery tests
# post a real image file, and pointing MEDIA_ROOT at the working tree left 61
# stray `pixel_*.gif` files behind — invisible until they turned up in a commit.
MEDIA_ROOT = tempfile.mkdtemp(prefix="elmehri-test-media-")
