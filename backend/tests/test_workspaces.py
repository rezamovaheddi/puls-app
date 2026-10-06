"""Workspace endpoint tests — creation atomicity, listing, IDOR protection."""

from __future__ import annotations

import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


class TestCreateWorkspace:
    def test_create_workspace_creates_owner_membership_atomically(self, auth_client, user):
        response = auth_client(user).post(
            "/api/v1/workspaces", {"name": "Acme Engineering"}, format="json"
        )
        assert response.status_code == 201
        body = response.json()
        assert body["data"]["name"] == "Acme Engineering"
        assert body["data"]["slug"] == "acme-engineering"
        assert body["data"]["owner_id"] == str(user.id)

        from apps.workspaces.infrastructure.models import WorkspaceMember

        membership = WorkspaceMember.objects.get(workspace=body["data"]["id"], user=user)
        assert membership.role == "OWNER"

    def test_slug_collision_resolved(self, auth_client, user):
        first = auth_client(user).post("/api/v1/workspaces", {"name": "Acme"}, format="json")
        second = auth_client(user).post("/api/v1/workspaces", {"name": "Acme"}, format="json")
        assert first.json()["data"]["slug"] == "acme"
        assert second.json()["data"]["slug"] == "acme-1"

    def test_create_workspace_requires_auth(self, api_client):
        response = api_client.post("/api/v1/workspaces", {"name": "Nope"}, format="json")
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "UNAUTHORIZED"

    def test_create_workspace_blank_name_rejected(self, auth_client, user):
        response = auth_client(user).post("/api/v1/workspaces", {"name": "   "}, format="json")
        assert response.status_code == 400


class TestListWorkspaces:
    def test_lists_only_own_workspaces(self, api_client, user_factory):
        from tests.factories import UserFactory, WorkspaceFactory

        mine_owner = UserFactory(email="a@example.com")
        other = UserFactory(email="b@example.com")
        WorkspaceFactory(name="Mine", owner=mine_owner)
        WorkspaceFactory(name="Theirs", owner=other)

        client = APIClient()
        client.force_authenticate(user=mine_owner)
        response = client.get("/api/v1/workspaces")

        names = [item["name"] for item in response.json()["data"]]
        assert names == ["Mine"]
        assert names and names[0] != "Theirs"

    def test_list_payload_includes_requester_role(self, auth_client, user):
        auth_client(user).post("/api/v1/workspaces", {"name": "Acme"}, format="json")
        response = auth_client(user).get("/api/v1/workspaces")
        assert response.json()["data"][0]["role"] == "OWNER"


class TestWorkspaceDetail:
    def test_member_can_read_own_workspace(self, auth_client, user):
        created = auth_client(user).post("/api/v1/workspaces", {"name": "Acme"}, format="json")
        workspace_id = created.json()["data"]["id"]

        response = auth_client(user).get(f"/api/v1/workspaces/{workspace_id}")
        assert response.status_code == 200
        assert response.json()["data"]["role"] == "OWNER"

    def test_non_member_gets_404_not_403(self, api_client, user_factory):
        """IDOR: existence of someone else's workspace is not revealed."""
        from tests.factories import UserFactory, WorkspaceFactory

        owner = UserFactory(email="owner2@example.com")
        workspace = WorkspaceFactory(name="Secret", owner=owner)

        outsider = UserFactory(email="outsider@example.com")
        client = APIClient()
        client.force_authenticate(user=outsider)
        response = client.get(f"/api/v1/workspaces/{workspace.id}")
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "NOT_FOUND"

    def test_detail_requires_auth(self, api_client):
        response = api_client.get("/api/v1/workspaces/00000000-0000-0000-0000-000000000000")
        assert response.status_code == 401
