"""Ports for invitation persistence — implemented by the infrastructure layer."""

from __future__ import annotations

from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from apps.invitations.infrastructure.models import Invitation
    from apps.users.infrastructure.models import User


class InvitationRepository(Protocol):
    def get_by_token(self, token: str) -> Invitation | None: ...

    def get_by_id(self, invitation_id: object) -> Invitation | None: ...

    def pending_exists(self, workspace_id: object, email: str) -> bool: ...

    def create(
        self,
        *,
        workspace_id: object,
        email: str,
        role: str,
        invited_by: User,
        expires_at: object,
    ) -> Invitation: ...

    def list_for_workspace(self, workspace_id: object) -> list[Invitation]: ...

    def set_status(self, invitation: Invitation, status: str) -> None: ...
