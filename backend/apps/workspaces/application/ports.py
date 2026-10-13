"""Ports for workspace persistence — implemented by the infrastructure layer."""

from __future__ import annotations

from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from apps.users.infrastructure.models import User
    from apps.workspaces.infrastructure.models import Workspace, WorkspaceMember


class WorkspaceRepository(Protocol):
    def get_by_id(self, workspace_id: object) -> Workspace | None: ...

    def create_with_owner(
        self,
        *,
        name: str,
        slug: str,
        owner: User,
    ) -> Workspace: ...

    def list_memberships_for_user(self, user: User) -> list[WorkspaceMember]: ...

    def get_membership(self, workspace_id: object, user: User) -> WorkspaceMember | None: ...

    def membership_exists_for_email(self, workspace_id: object, email: str) -> bool: ...

    def create_member(
        self,
        *,
        workspace_id: object,
        user: User,
        role: str,
    ) -> WorkspaceMember: ...

    def slug_exists(self, slug: str) -> bool: ...
