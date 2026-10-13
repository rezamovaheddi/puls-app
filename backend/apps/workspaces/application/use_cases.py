"""Workspace use cases.

CreateWorkspace is atomic: workspace + OWNER membership commit together or
not at all (atomicity is enforced at the repository infrastructure boundary).
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from apps.workspaces.domain import (
    WorkspaceNameRequiredError,
    WorkspaceNameTooLongError,
    WorkspaceNotFoundError,
    WorkspaceRole,
    generate_candidate_slug,
)

if TYPE_CHECKING:
    from apps.users.infrastructure.models import User
    from apps.workspaces.application.ports import WorkspaceRepository
    from apps.workspaces.infrastructure.models import Workspace, WorkspaceMember


class CreateWorkspace:
    def __init__(self, workspaces: WorkspaceRepository) -> None:
        self._workspaces = workspaces

    def _generate_unique_slug(self, name: str) -> str:
        """Collision-safe slug generation using repository protocol."""
        suffix = 0
        candidate = generate_candidate_slug(name, suffix)
        while self._workspaces.slug_exists(candidate):
            suffix += 1
            candidate = generate_candidate_slug(name, suffix)
        return candidate

    def execute(self, *, user: User, name: str) -> Workspace:
        cleaned = (name or "").strip()
        if not cleaned:
            raise WorkspaceNameRequiredError
        if len(cleaned) > 100:
            raise WorkspaceNameTooLongError

        slug = self._generate_unique_slug(cleaned)
        return self._workspaces.create_with_owner(owner=user, name=cleaned, slug=slug)


class ListUserWorkspaces:
    def __init__(self, workspaces: WorkspaceRepository) -> None:
        self._workspaces = workspaces

    def execute(self, *, user: User) -> list[WorkspaceMember]:
        return self._workspaces.list_memberships_for_user(user)


class GetWorkspaceDetails:
    """Returns the workspace when the caller is a member.

    A non-member caller receives WorkspaceNotFoundError (404) — deliberately
    the same as a non-existent workspace, providing IDOR protection.
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
            raise WorkspaceNotFoundError
        return workspace, membership


# Aliased for backward compatibility
GetWorkspace = GetWorkspaceDetails

__all__ = [
    "CreateWorkspace",
    "ListUserWorkspaces",
    "GetWorkspaceDetails",
    "GetWorkspace",
    "WorkspaceRole",
]
