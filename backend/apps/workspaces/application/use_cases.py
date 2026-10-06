"""Workspace use cases.

CreateWorkspace is atomic: workspace + OWNER membership commit together or
not at all (the atomicity is enforced inside the repository implementation).
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from apps.common.exceptions import InputValidationError, NotFoundError
from apps.workspaces.domain import WorkspaceRole

if TYPE_CHECKING:
    from apps.users.infrastructure.models import User
    from apps.workspaces.application.repositories import WorkspaceRepository
    from apps.workspaces.infrastructure.models import Workspace, WorkspaceMember


class CreateWorkspace:
    def __init__(self, workspaces: WorkspaceRepository) -> None:
        self._workspaces = workspaces

    def execute(self, *, user: User, name: str) -> Workspace:
        cleaned = (name or "").strip()
        if not cleaned:
            raise InputValidationError("Workspace name is required.")
        if len(cleaned) > 100:
            raise InputValidationError("Workspace name must be 100 characters or fewer.")
        return self._workspaces.create_with_owner(owner=user, name=cleaned)


class ListUserWorkspaces:
    def __init__(self, workspaces: WorkspaceRepository) -> None:
        self._workspaces = workspaces

    def execute(self, *, user: User) -> list[WorkspaceMember]:
        return self._workspaces.list_memberships_for_user(user)


class GetWorkspace:
    """Returns the workspace when the caller is a member.

    A non-member (or anonymous-id) caller gets NOT_FOUND — deliberately the
    same response as a missing workspace, so workspace identifiers are not
    enumerable (IDOR protection).
    """

    def __init__(self, workspaces: WorkspaceRepository) -> None:
        self._workspaces = workspaces

    def execute(
        self, *, user: User, workspace_id: object
    ) -> tuple[Workspace, WorkspaceMember]:
        workspace = self._workspaces.get_by_id(workspace_id)
        membership = (
            self._workspaces.get_membership(workspace_id, user) if workspace else None
        )
        if workspace is None or membership is None:
            raise NotFoundError("Workspace not found.")
        return workspace, membership


__all__ = ["CreateWorkspace", "GetWorkspace", "ListUserWorkspaces", "WorkspaceRole"]
