"""Authorization matrix — role × action, enforced by the backend.

Even if the frontend hides a button, the API must reject the call.
"""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.django_db


@pytest.fixture
def setup(db, user_factory):
    """owner / admin / member / outsider + one workspace."""
    from tests.factories import WorkspaceFactory

    owner = user_factory(email="owner@example.com")
    workspace = WorkspaceFactory(name="Acme", owner=owner)

    admin = user_factory(email="admin@example.com")
    member = user_factory(email="member@example.com")
    outsider = user_factory(email="outsider@example.com")

    from apps.workspaces.infrastructure.models import WorkspaceMember

    WorkspaceMember.objects.create(workspace=workspace, user=admin, role="ADMIN")
    WorkspaceMember.objects.create(workspace=workspace, user=member, role="MEMBER")

    return {"workspace": workspace, "owner": owner, "admin": admin, "member": member, "outsider": outsider}


def invite(api_client, user, workspace, email="new@example.com", role="MEMBER"):
    api_client.force_authenticate(user=user)
    return api_client.post(
        f"/api/v1/workspaces/{workspace.id}/invitations",
        {"email": email, "role": role},
        format="json",
    )


def list_invitations(api_client, user, workspace):
    api_client.force_authenticate(user=user)
    return api_client.get(f"/api/v1/workspaces/{workspace.id}/invitations")


def revoke(api_client, user, workspace, invitation_id):
    api_client.force_authenticate(user=user)
    return api_client.delete(f"/api/v1/workspaces/{workspace.id}/invitations/{invitation_id}")


def create_invitation_and_get_id(api_client, user, workspace) -> str:
    from apps.invitations.infrastructure.models import Invitation

    invite(api_client, user, workspace)
    return str(Invitation.objects.get(workspace=workspace).id)


class TestInviteAuthorization:
    def test_owner_can_invite(self, api_client, setup):
        assert invite(api_client, setup["owner"], setup["workspace"]).status_code == 201

    def test_admin_can_invite(self, api_client, setup):
        assert invite(api_client, setup["admin"], setup["workspace"]).status_code == 201

    def test_member_cannot_invite(self, api_client, setup):
        response = invite(api_client, setup["member"], setup["workspace"])
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "FORBIDDEN"

    def test_unauthenticated_cannot_invite(self, api_client, setup):
        response = api_client.post(
            f"/api/v1/workspaces/{setup['workspace'].id}/invitations",
            {"email": "x@example.com", "role": "MEMBER"},
            format="json",
        )
        assert response.status_code == 401

    def test_outsider_cannot_invite(self, api_client, setup):
        response = invite(api_client, setup["outsider"], setup["workspace"])
        assert response.status_code == 404  # existence not revealed


class TestListInvitationsAuthorization:
    def test_owner_and_admin_can_list(self, api_client, setup):
        assert list_invitations(api_client, setup["owner"], setup["workspace"]).status_code == 200
        assert list_invitations(api_client, setup["admin"], setup["workspace"]).status_code == 200

    def test_member_cannot_list(self, api_client, setup):
        assert list_invitations(api_client, setup["member"], setup["workspace"]).status_code == 403


class TestRevokeAuthorization:
    def test_owner_can_revoke(self, api_client, setup):
        invitation_id = create_invitation_and_get_id(api_client, setup["owner"], setup["workspace"])
        assert revoke(api_client, setup["owner"], setup["workspace"], invitation_id).status_code == 204

    def test_admin_can_revoke(self, api_client, setup):
        invitation_id = create_invitation_and_get_id(api_client, setup["owner"], setup["workspace"])
        assert revoke(api_client, setup["admin"], setup["workspace"], invitation_id).status_code == 204

    def test_member_cannot_revoke(self, api_client, setup):
        invitation_id = create_invitation_and_get_id(api_client, setup["owner"], setup["workspace"])
        assert revoke(api_client, setup["member"], setup["workspace"], invitation_id).status_code == 403


class TestWorkspaceAccessMatrix:
    def test_member_can_view_workspace(self, api_client, setup):
        api_client.force_authenticate(user=setup["member"])
        response = api_client.get(f"/api/v1/workspaces/{setup['workspace'].id}")
        assert response.status_code == 200
        assert response.json()["data"]["role"] == "MEMBER"

    def test_outsider_view_is_404(self, api_client, setup):
        api_client.force_authenticate(user=setup["outsider"])
        response = api_client.get(f"/api/v1/workspaces/{setup['workspace'].id}")
        assert response.status_code == 404
