"""Invitation use cases.

Business authorization (who may invite/revoke) is enforced here — inside the
backend — regardless of what the frontend chooses to render.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timedelta
from typing import TYPE_CHECKING

from django.conf import settings

from apps.common.exceptions import (
    ConflictError,
    ForbiddenError,
    InputValidationError,
    InvitationAlreadyPendingError,
    InvitationExpiredError,
    MemberAlreadyExistsError,
    NotFoundError,
)
from apps.common.ports import TransactionBoundary
from apps.common.services.email import send_invitation_email
from apps.invitations import domain as rules
from apps.users.domain import normalize_email
from apps.workspaces.domain import can_manage_members

if TYPE_CHECKING:
    from apps.invitations.application.repositories import InvitationRepository
    from apps.invitations.infrastructure.models import Invitation, WorkspaceMember
    from apps.users.infrastructure.models import User
    from apps.workspaces.application.repositories import WorkspaceRepository


def _now() -> datetime:
    """Indirection point for the clock (use cases receive it injected)."""
    from django.utils import timezone

    return timezone.now()


class InviteMember:
    def __init__(
        self,
        workspaces: WorkspaceRepository,
        invitations: InvitationRepository,
        *,
        clock: Callable[[], datetime] = _now,
    ) -> None:
        self._workspaces = workspaces
        self._invitations = invitations
        self._clock = clock

    def execute(
        self,
        *,
        actor: User,
        workspace_id: object,
        email: str,
        role: str,
    ) -> Invitation:
        membership = self._workspaces.get_membership(workspace_id, actor)
        if membership is None:
            # Same response as a missing workspace → do not leak existence.
            raise NotFoundError("Workspace not found.")
        if not can_manage_members(membership.role):
            raise ForbiddenError("Only owners and admins can invite members.")

        normalized = normalize_email(email)
        if role not in rules.INVITABLE_ROLES:
            raise InputValidationError("Role must be ADMIN or MEMBER.")

        if self._workspaces.membership_exists_for_email(workspace_id, normalized):
            raise MemberAlreadyExistsError
        if self._invitations.pending_exists(workspace_id, normalized):
            raise InvitationAlreadyPendingError

        ttl_days = getattr(settings, "INVITATION_TTL_DAYS", 7)
        invitation = self._invitations.create(
            workspace_id=workspace_id,
            email=normalized,
            role=role,
            invited_by=actor,
            expires_at=self._clock() + timedelta(days=ttl_days),
        )

        # Dispatch SMTP invitation email with confirmation link
        inviter_name = f"{actor.first_name} {actor.last_name}".strip() or actor.email
        ws = self._workspaces.get_by_id(workspace_id)
        ws_name = ws.name if ws else "Workspace"
        send_invitation_email(
            to_email=normalized,
            workspace_name=ws_name,
            inviter_name=inviter_name,
            role=role,
            token=invitation.token,
        )

        return invitation


class ListInvitations:
    def __init__(
        self,
        workspaces: WorkspaceRepository,
        invitations: InvitationRepository,
    ) -> None:
        self._workspaces = workspaces
        self._invitations = invitations

    def execute(self, *, actor: User, workspace_id: object) -> list[Invitation]:
        membership = self._workspaces.get_membership(workspace_id, actor)
        if membership is None:
            raise NotFoundError("Workspace not found.")
        if not can_manage_members(membership.role):
            raise ForbiddenError("Only owners and admins can view invitations.")
        return self._invitations.list_for_workspace(workspace_id)


class AcceptInvitation:
    def __init__(
        self,
        workspaces: WorkspaceRepository,
        invitations: InvitationRepository,
        transactions: TransactionBoundary,
        *,
        clock: Callable[[], datetime] = _now,
    ) -> None:
        self._workspaces = workspaces
        self._invitations = invitations
        self._transactions = transactions
        self._clock = clock

    def execute(self, *, user: User, token: str) -> WorkspaceMember:
        invitation = self._invitations.get_by_token(token)
        if invitation is None:
            raise NotFoundError("Invitation not found.")

        try:
            rules.assert_acceptable(
                status=invitation.status,
                expires_at=invitation.expires_at,
                invitation_email=invitation.email,
                actor_email=normalize_email(user.email),
                now=self._clock(),
            )
        except InvitationExpiredError:
            # Persisted OUTSIDE the transaction below on purpose: the accept
            # attempt rolls back, but the materialized EXPIRED status stays.
            self._invitations.set_status(invitation, rules.EXPIRED)
            raise

        with self._transactions.atomic():
            if self._workspaces.membership_exists_for_email(
                invitation.workspace_id, user.email
            ):
                raise MemberAlreadyExistsError

            member = self._workspaces.create_member(
                workspace_id=invitation.workspace_id,
                user=user,
                role=invitation.role,
            )
            self._invitations.set_status(invitation, rules.ACCEPTED)
            return member


class RevokeInvitation:
    def __init__(
        self,
        workspaces: WorkspaceRepository,
        invitations: InvitationRepository,
    ) -> None:
        self._workspaces = workspaces
        self._invitations = invitations

    def execute(self, *, actor: User, workspace_id: object, invitation_id: object) -> None:
        membership = self._workspaces.get_membership(workspace_id, actor)
        if membership is None:
            raise NotFoundError("Workspace not found.")
        if not can_manage_members(membership.role):
            raise ForbiddenError("Only owners and admins can revoke invitations.")

        invitation = self._invitations.get_by_id(invitation_id)
        if invitation is None or invitation.workspace_id != workspace_id:
            raise NotFoundError("Invitation not found.")
        if invitation.status != rules.PENDING:
            raise ConflictError("Only pending invitations can be revoked.")
        self._invitations.set_status(invitation, rules.REVOKED)
