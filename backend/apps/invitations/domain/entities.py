"""Invitation domain entities."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from apps.invitations.domain.policies import PENDING


@dataclass(frozen=True)
class InvitationEntity:
    id: object
    workspace_id: object
    email: str
    role: str
    token: str
    invited_by_id: object
    expires_at: datetime
    status: str = PENDING
    created_at: datetime | None = None
