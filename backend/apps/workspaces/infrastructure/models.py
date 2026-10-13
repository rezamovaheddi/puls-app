"""Workspace persistence — ORM models + the Django repository.

Slug uniqueness: derived from the name, collision-resolved by probing inside
the same transaction; the DB unique constraint is the final guard.
"""

from __future__ import annotations

import uuid

from django.db import models

from apps.users.infrastructure.models import User
from apps.workspaces.domain import WorkspaceRole
from apps.workspaces.infrastructure.repositories import DjangoWorkspaceRepository


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


__all__ = ["Workspace", "WorkspaceMember", "DjangoWorkspaceRepository"]


