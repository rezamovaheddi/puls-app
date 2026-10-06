"""Invitation persistence — model + Django repository.

Security notes:
- Token: `secrets.token_urlsafe(32)` — 256 bits of entropy, URL-safe,
  non-guessable; unique + indexed in the DB.
- One PENDING invitation per (workspace, email) via a partial unique
  constraint (accepted/revoked/expired ones don't block re-inviting).
- The token is never exposed through the list serializer.
"""

from __future__ import annotations

import secrets
import uuid

from django.db import models
from django.utils import timezone

from apps.invitations import domain as invitation_rules
from apps.users.infrastructure.models import User
from apps.workspaces.domain import WorkspaceRole
from apps.workspaces.infrastructure.models import Workspace


class Invitation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="invitations",
    )
    email = models.EmailField(max_length=254)
    invited_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="invitations_sent",
    )
    role = models.CharField(max_length=10, choices=WorkspaceRole.choices)
    token = models.CharField(
        max_length=64,
        unique=True,
        # Pass the CALLABLE, not the result: a literal default is evaluated
        # once at import time and every invitation would share one token.
        default=secrets.token_urlsafe,
        editable=False,
    )
    status = models.CharField(
        max_length=10,
        choices=[
            (invitation_rules.PENDING, "Pending"),
            (invitation_rules.ACCEPTED, "Accepted"),
            (invitation_rules.EXPIRED, "Expired"),
            (invitation_rules.REVOKED, "Revoked"),
        ],
        default=invitation_rules.PENDING,
    )
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "email"],
                condition=models.Q(status=invitation_rules.PENDING),
                name="uniq_pending_invitation_per_email",
            )
        ]
        indexes = [
            models.Index(fields=["email"], name="invitations_email_idx"),
            models.Index(fields=["status"], name="invitations_status_idx"),
            # `unique=True` on token already indexes it.
        ]

    def __str__(self) -> str:
        return f"{self.workspace_id} → {self.email} ({self.status})"

    @property
    def is_expired(self) -> bool:
        return invitation_rules.is_expired(self.expires_at, timezone.now())


class DjangoInvitationRepository:
    def get_by_token(self, token: str) -> Invitation | None:
        return Invitation.objects.filter(token=token).first()

    def get_by_id(self, invitation_id: object) -> Invitation | None:
        return Invitation.objects.filter(pk=invitation_id).first()

    def pending_exists(self, workspace_id: object, email: str) -> bool:
        return Invitation.objects.filter(
            workspace_id=workspace_id,
            email__iexact=email,
            status=invitation_rules.PENDING,
        ).exists()

    def create(
        self,
        *,
        workspace_id: object,
        email: str,
        role: str,
        invited_by: User,
        expires_at: object,
    ) -> Invitation:
        return Invitation.objects.create(
            workspace_id=workspace_id,
            email=email,
            role=role,
            invited_by=invited_by,
            expires_at=expires_at,
        )

    def list_for_workspace(self, workspace_id: object) -> list[Invitation]:
        return list(
            Invitation.objects.filter(workspace_id=workspace_id)
            .select_related("invited_by")
            .order_by("-created_at")
        )

    def set_status(self, invitation: Invitation, status: str) -> None:
        invitation.status = status
        invitation.save(update_fields=["status"])
