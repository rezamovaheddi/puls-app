"""Workspace domain entities."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from apps.workspaces.domain.policies import WorkspaceRole


@dataclass(frozen=True)
class WorkspaceEntity:
    id: object
    name: str
    slug: str
    owner_id: object
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass(frozen=True)
class WorkspaceMemberEntity:
    id: object
    workspace_id: object
    user_id: object
    role: str
    joined_at: datetime | None = None

    def is_owner(self) -> bool:
        return self.role == WorkspaceRole.OWNER

    def is_admin(self) -> bool:
        return self.role == WorkspaceRole.ADMIN
