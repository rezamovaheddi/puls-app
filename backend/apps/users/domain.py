"""User domain — normalization rule.

The Django `User` model doubles as the domain object here on purpose: the
application layer never touches the ORM directly, it goes through the
repository protocol (see application/repositories.py). Duplicating the model
as a dataclass would be Clean Architecture theater, not architecture — the
real seam that matters (application vs infrastructure) is the protocol.
"""

from __future__ import annotations


def normalize_email(email: str) -> str:
    """Emails are the identity key — store them lowercase and stripped."""
    return email.strip().lower()
