"""Django's model autodiscovery expects `<app>/models.py` — re-export."""

from .infrastructure.models import (  # noqa: F401
    DjangoInvitationRepository,
    Invitation,
)
