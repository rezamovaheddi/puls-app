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
from apps.invitations.infrastructure.repositories import DjangoInvitationRepository
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


__all__ = ["Invitation", "DjangoInvitationRepository"]


