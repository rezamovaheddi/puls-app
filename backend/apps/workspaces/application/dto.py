"""Data Transfer Objects for workspace application layer."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class CreateWorkspaceInputDTO:
    name: str
    owner_id: object


@dataclass(frozen=True)
class WorkspaceOutputDTO:
    id: str
    name: str
    slug: str
    owner_id: str
    created_at: datetime | None = None


@dataclass(frozen=True)
class WorkspaceMemberOutputDTO:
    workspace_id: str
    workspace_name: str
    workspace_slug: str
    user_id: str
    role: str
    joined_at: datetime | None = None
