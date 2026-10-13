"""Django ORM repository implementation for workspaces."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from django.db import IntegrityError, transaction

from apps.common.exceptions import ConflictError
from apps.workspaces.domain import WorkspaceRole
from apps.workspaces.domain.policies import generate_candidate_slug

if TYPE_CHECKING:
    from apps.users.infrastructure.models import User
    from apps.workspaces.infrastructure.models import Workspace, WorkspaceMember


class DjangoWorkspaceRepository:
    """Implements apps.workspaces.application.ports.WorkspaceRepository."""

    def get_by_id(self, workspace_id: Any) -> Workspace | None:
        from apps.workspaces.infrastructure.models import Workspace

        return Workspace.objects.filter(pk=workspace_id).first()

    def slug_exists(self, slug: str) -> bool:
        from apps.workspaces.infrastructure.models import Workspace

        return Workspace.objects.filter(slug=slug).exists()

    @transaction.atomic
    def create_with_owner(
        self, *, owner: User, name: str, slug: str | None = None
    ) -> Workspace:
        from apps.workspaces.infrastructure.models import Workspace, WorkspaceMember

        # If slug is not provided by use case, resolve collision-free
        if not slug:
            slug = self._unique_slug(name)

        try:
            workspace = Workspace.objects.create(name=name, slug=slug, owner=owner)
            WorkspaceMember.objects.create(
                workspace=workspace,
                user=owner,
                role=WorkspaceRole.OWNER,
            )
            return workspace
        except IntegrityError as exc:
            raise ConflictError("A workspace with this identifier already exists.") from exc

    def list_memberships_for_user(self, user: User) -> list[WorkspaceMember]:
        from apps.workspaces.infrastructure.models import WorkspaceMember

        # Never return a raw QuerySet across the boundary; return a concrete list
        return list(
            WorkspaceMember.objects.filter(user=user)
            .select_related("workspace", "workspace__owner")
            .order_by("-workspace__created_at")
        )

    def get_membership(self, workspace_id: Any, user: User) -> WorkspaceMember | None:
        from apps.workspaces.infrastructure.models import WorkspaceMember

        return WorkspaceMember.objects.filter(workspace_id=workspace_id, user=user).first()

    def membership_exists_for_email(self, workspace_id: Any, email: str) -> bool:
        from apps.workspaces.infrastructure.models import WorkspaceMember

        return WorkspaceMember.objects.filter(
            workspace_id=workspace_id, user__email__iexact=email
        ).exists()

    @transaction.atomic
    def create_member(
        self, *, workspace_id: Any, user: User, role: str
    ) -> WorkspaceMember:

        from apps.workspaces.infrastructure.models import WorkspaceMember

        member, _created = WorkspaceMember.objects.get_or_create(
            workspace_id=workspace_id,
            user=user,
            defaults={"role": role},
        )
        return member

    def _unique_slug(self, name: str, max_length: int = 120) -> str:
        from apps.workspaces.infrastructure.models import Workspace

        suffix = 0
        candidate = generate_candidate_slug(name, suffix, max_length=max_length)
        while Workspace.objects.filter(slug=candidate).exists():
            suffix += 1
            candidate = generate_candidate_slug(name, suffix, max_length=max_length)
        return candidate
