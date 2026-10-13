"""Test settings — deterministic and fast.

- MD5 password hasher: the production PBKDF2 is intentionally slow; tests
  hash hundreds of passwords, so the test settings swap in the weakest
  hasher Django offers. Never use these settings outside pytest.
- Throttling is disabled so tests that hammer auth endpoints stay
  deterministic; throttling behavior is covered by configuration, not here.
"""

from .base import *  # noqa: F401,F403
from .base import _database_from_url, env

DEBUG = True

SECRET_KEY = "django-insecure-test-secret-key-32-chars-long-deterministic"

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# Tests run in-memory by default for deterministic speed and self-contained execution
test_db_url = env("TEST_DATABASE_URL")  # noqa: F405
if test_db_url:
    DATABASES = {"default": _database_from_url(test_db_url)}  # noqa: F405
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
        }
    }

REST_FRAMEWORK = {  # noqa: F405
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_RATES": {"auth": None},
}

