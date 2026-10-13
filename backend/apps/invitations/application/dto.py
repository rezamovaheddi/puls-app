"""Data Transfer Objects for invitation application layer."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class CreateInvitationInputDTO:
    workspace_id: object
    email: str
    role: str


@dataclass(frozen=True)
class InvitationOutputDTO:
    id: str
    workspace_id: str
    email: str
    role: str
    status: str
    expires_at: datetime
    created_at: datetime | None = None
    token: str | None = None
