"""Invitation endpoints — thin views over use cases."""

from __future__ import annotations

from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.infrastructure import DjangoTransactionBoundary
from apps.common.responses import envelope, no_content
from apps.invitations.application.use_cases import (
    AcceptInvitation,
    InviteMember,
    ListInvitations,
    RevokeInvitation,
)
from apps.invitations.infrastructure.models import DjangoInvitationRepository
from apps.invitations.presentation.serializers import (
    InvitationCreatedSerializer,
    InvitationCreateSerializer,
    InvitationSerializer,
)
from apps.workspaces.infrastructure.models import DjangoWorkspaceRepository


def _container() -> tuple[DjangoWorkspaceRepository, DjangoInvitationRepository]:
    return DjangoWorkspaceRepository(), DjangoInvitationRepository()


class InvitationListCreateView(APIView):
    def post(self, request: Request, workspace_id: str) -> Response:
        serializer = InvitationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        workspaces, invitations = _container()
        invitation = InviteMember(workspaces, invitations).execute(
            actor=request.user,
            workspace_id=workspace_id,
            email=serializer.validated_data["email"],
            role=serializer.validated_data["role"],
        )
        return envelope(
            InvitationCreatedSerializer(invitation).data,
            message="Invitation created.",
            status=201,
        )

    def get(self, request: Request, workspace_id: str) -> Response:
        workspaces, invitations = _container()
        invitations_list = ListInvitations(workspaces, invitations).execute(
            actor=request.user, workspace_id=workspace_id
        )
        return envelope(InvitationSerializer(invitations_list, many=True).data)


class InvitationDeleteView(APIView):
    def delete(self, request: Request, workspace_id: str, pk: str) -> Response:
        workspaces, invitations = _container()
        RevokeInvitation(workspaces, invitations).execute(
            actor=request.user,
            workspace_id=workspace_id,
            invitation_id=pk,
        )
        return no_content()


class AcceptInvitationView(APIView):
    """POST /api/v1/invitations/<token>/accept — authenticated accept."""

    def post(self, request: Request, token: str) -> Response:
        workspaces, invitations = _container()
        member = AcceptInvitation(
            workspaces,
            invitations,
            DjangoTransactionBoundary(),
        ).execute(user=request.user, token=token)
        return envelope(
            {"workspace_id": str(member.workspace_id), "role": member.role},
            message="Invitation accepted — you are now a member.",
        )
