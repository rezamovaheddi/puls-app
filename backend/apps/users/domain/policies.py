"""User domain policies — pure Python business rules."""

from __future__ import annotations


def normalize_email(email: str) -> str:
    """Emails are the identity key — store them lowercase and stripped."""
    return email.strip().lower()


def is_valid_email_format(email: str) -> bool:
    """Basic format check without framework dependencies."""
    normalized = normalize_email(email)
    if not normalized or "@" not in normalized:
        return False
    parts = normalized.split("@")
    return len(parts) == 2 and bool(parts[0]) and "." in parts[1]
