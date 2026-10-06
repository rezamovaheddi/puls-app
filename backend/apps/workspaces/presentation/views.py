"""Workspace endpoints — thin views; authorization lives in the use cases."""

from __future__ import annotations

from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.responses import envelope
from apps.workspaces.application.use_cases import (
    CreateWorkspace,
    GetWorkspace,
    ListUserWorkspaces,
)
from apps.workspaces.infrastructure.models import DjangoWorkspaceRepository
from apps.workspaces.presentation.serializers import (
    WorkspaceCreateSerializer,
    WorkspaceSerializer,
    WorkspaceWithRoleSerializer,
)


def _container() -> DjangoWorkspaceRepository:
    return DjangoWorkspaceRepository()


class WorkspaceListCreateView(APIView):
    def get(self, request: Request) -> Response:
        memberships = ListUserWorkspaces(_container()).execute(user=request.user)
        payload = [
            WorkspaceWithRoleSerializer(
                {
                    **WorkspaceSerializer(m.workspace).data,
                    "role": m.role,
                }
            ).data
            for m in memberships
        ]
        return envelope(payload)

    def post(self, request: Request) -> Response:
        serializer = WorkspaceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        workspace = CreateWorkspace(_container()).execute(
            user=request.user, name=serializer.validated_data["name"]
        )
        return envelope(
            WorkspaceSerializer(workspace).data,
            message="Workspace created.",
            status=201,
        )


class WorkspaceDetailView(APIView):
    def get(self, request: Request, pk: str) -> Response:
        workspace, membership = GetWorkspace(_container()).execute(
            user=request.user, workspace_id=pk
        )
        payload = {
            **WorkspaceSerializer(workspace).data,
            "role": membership.role,
        }
        return envelope(payload)
