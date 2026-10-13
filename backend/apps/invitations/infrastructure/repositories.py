"""Django ORM repository implementation for invitations."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from apps.invitations import domain as invitation_rules

if TYPE_CHECKING:
    from apps.invitations.infrastructure.models import Invitation
    from apps.users.infrastructure.models import User


class DjangoInvitationRepository:
    """Implements apps.invitations.application.ports.InvitationRepository."""

    def get_by_token(self, token: str) -> Invitation | None:
        from apps.invitations.infrastructure.models import Invitation

        return Invitation.objects.filter(token=token).first()

    def get_by_id(self, invitation_id: Any) -> Invitation | None:
        from apps.invitations.infrastructure.models import Invitation

        return Invitation.objects.filter(pk=invitation_id).first()

    def pending_exists(self, workspace_id: Any, email: str) -> bool:
        from apps.invitations.infrastructure.models import Invitation

        return Invitation.objects.filter(
            workspace_id=workspace_id,
            email__iexact=email,
            status=invitation_rules.PENDING,
        ).exists()

    def create(
        self,
        *,
        workspace_id: Any,
        email: str,
        role: str,
        invited_by: User,
        expires_at: Any,
    ) -> Invitation:
        from apps.invitations.infrastructure.models import Invitation

        return Invitation.objects.create(
            workspace_id=workspace_id,
            email=email,
            role=role,
            invited_by=invited_by,
            expires_at=expires_at,
        )

    def list_for_workspace(self, workspace_id: Any) -> list[Invitation]:

        from apps.invitations.infrastructure.models import Invitation

        return list(
            Invitation.objects.filter(workspace_id=workspace_id)
            .select_related("invited_by")
            .order_by("-created_at")
        )

    def set_status(self, invitation: Invitation, status: str) -> None:
        invitation.status = status
        invitation.save(update_fields=["status"])
