"""Invitation domain rules and policies — pure Python, unit-testable without Django."""

from __future__ import annotations

from datetime import datetime

from apps.common.exceptions import (
    InvitationEmailMismatchError,
    InvitationExpiredError,
    InvitationNotPendingError,
)

PENDING = "PENDING"
ACCEPTED = "ACCEPTED"
EXPIRED = "EXPIRED"
REVOKED = "REVOKED"

#: Roles an invitation may grant — a workspace has exactly one OWNER, and it
#: is the creator, so OWNER is not invitable.
INVITABLE_ROLES = ("ADMIN", "MEMBER")


def is_expired(expires_at: datetime, now: datetime) -> bool:
    return now >= expires_at


def assert_acceptable(
    *,
    status: str,
    expires_at: datetime,
    invitation_email: str,
    actor_email: str,
    now: datetime,
) -> None:
    """Raise the precise domain error if the invitation cannot be accepted."""
    if status != PENDING:
        raise InvitationNotPendingError
    if is_expired(expires_at, now):
        raise InvitationExpiredError
    if invitation_email != actor_email:
        # Invitations are single-recipient: the accepting account must match.
        raise InvitationEmailMismatchError
