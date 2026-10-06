"""Custom User model — email is the identity key.

Django's model autodiscovery looks for `<app>/models.py`, so this module
re-exports the implementation that lives in `infrastructure/models.py`
(keeping the Clean Architecture layering intact).
"""

from .infrastructure.models import User, UserManager  # noqa: F401
