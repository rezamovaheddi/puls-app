"""Test settings — deterministic and fast.

- MD5 password hasher: the production PBKDF2 is intentionally slow; tests
  hash hundreds of passwords, so the test settings swap in the weakest
  hasher Django offers. Never use these settings outside pytest.
- Throttling is disabled so tests that hammer auth endpoints stay
  deterministic; throttling behavior is covered by configuration, not here.
"""

from .base import *  # noqa: F401,F403

DEBUG = True

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

REST_FRAMEWORK = {  # noqa: F405
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_RATES": {"auth": None},
}
