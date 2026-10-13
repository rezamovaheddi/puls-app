"""Workspace domain package."""

from apps.workspaces.domain.entities import (
    WorkspaceEntity,
    WorkspaceMemberEntity,
)
from apps.workspaces.domain.exceptions import (
    WorkspaceNameRequiredError,
    WorkspaceNameTooLongError,
    WorkspaceNotFoundError,
)
from apps.workspaces.domain.policies import (
    ADMIN,
    MEMBER,
    OWNER,
    ROLE_RANK,
    WorkspaceRole,
    can_manage_members,
    can_manage_workspace,
    generate_candidate_slug,
    role_at_least,
    slugify_name,
)

__all__ = [
    "WorkspaceEntity",
    "WorkspaceMemberEntity",
    "WorkspaceNameRequiredError",
    "WorkspaceNameTooLongError",
    "WorkspaceNotFoundError",
    "WorkspaceRole",
    "OWNER",
    "ADMIN",
    "MEMBER",
    "ROLE_RANK",
    "role_at_least",
    "can_manage_members",
    "can_manage_workspace",
    "generate_candidate_slug",
    "slugify_name",
]
