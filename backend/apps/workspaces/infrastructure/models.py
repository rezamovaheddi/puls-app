"""Workspace persistence — ORM models + the Django repository.

Slug uniqueness: derived from the name, collision-resolved by probing inside
the same transaction; the DB unique constraint is the final guard.
"""

from __future__ import annotations

import uuid

from django.db import models, transaction
from django.utils.text import slugify

from apps.users.infrastructure.models import User
from apps.workspaces.domain import WorkspaceRole


class Workspace(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True, editable=False)
    owner = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="owned_workspaces",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["owner"], name="workspaces_owner_idx")]

    def __str__(self) -> str:
        return self.name


class WorkspaceMember(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="members",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="workspace_memberships",
    )
    role = models.CharField(max_length=10, choices=WorkspaceRole.choices)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "user"],
                name="uniq_workspace_member",
            )
        ]
        indexes = [
            models.Index(fields=["user"], name="members_user_idx"),
            models.Index(fields=["workspace", "role"], name="members_ws_role_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.workspace_id}:{self.user_id} ({self.role})"


class DjangoWorkspaceRepository:
    """Implements apps.workspaces.application.repositories.WorkspaceRepository."""

    def get_by_id(self, workspace_id: object) -> Workspace | None:
        return Workspace.objects.filter(pk=workspace_id).first()

    @transaction.atomic
    def create_with_owner(self, *, owner: User, name: str) -> Workspace:
        workspace = Workspace(name=name, slug=self._unique_slug(name), owner=owner)
        workspace.save()
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=owner,
            role=WorkspaceRole.OWNER,
        )
        return workspace

    def list_memberships_for_user(self, user: User) -> list[WorkspaceMember]:
        return list(
            WorkspaceMember.objects.filter(user=user)
            .select_related("workspace", "workspace__owner")
            .order_by("-workspace__created_at")
        )

    def get_membership(self, workspace_id: object, user: User) -> WorkspaceMember | None:
        return WorkspaceMember.objects.filter(workspace_id=workspace_id, user=user).first()

    def membership_exists_for_email(self, workspace_id: object, email: str) -> bool:
        return WorkspaceMember.objects.filter(
            workspace_id=workspace_id, user__email__iexact=email
        ).exists()

    @transaction.atomic
    def create_member(self, *, workspace_id: object, user: User, role: str) -> WorkspaceMember:
        member, _created = WorkspaceMember.objects.get_or_create(
            workspace_id=workspace_id,
            user=user,
            defaults={"role": role},
        )
        return member

    @staticmethod
    def _unique_slug(name: str, max_length: int = 120) -> str:
        base = slugify(name)[: max_length - 17] or "workspace"
        candidate = base
        suffix = 0
        while Workspace.objects.filter(slug=candidate).exists():
            suffix += 1
            candidate = f"{base}-{suffix}"
        return candidate
