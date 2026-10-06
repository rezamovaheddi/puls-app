"""Invitation endpoint tests — invite rules and the accept lifecycle."""

from __future__ import annotations

from datetime import timedelta

import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db

ACCEPT_URL = "/api/v1/invitations/{token}/accept"


def invite(client: APIClient, workspace_id: str, email: str, role: str = "MEMBER") -> dict:
    return client.post(
        f"/api/v1/workspaces/{workspace_id}/invitations",
        {"email": email, "role": role},
        format="json",
    )


def workspace_id_of(user) -> str:
    """First workspace owned by `user`, created on demand."""
    from apps.workspaces.infrastructure.models import Workspace
    from tests.factories import WorkspaceFactory

    workspace = Workspace.objects.filter(owner=user).first()
    if workspace is None:
        workspace = WorkspaceFactory(owner=user)
    return str(workspace.id)


def add_member(workspace, user, role: str = "ADMIN") -> None:
    from apps.workspaces.infrastructure.models import WorkspaceMember

    WorkspaceMember.objects.create(workspace=workspace, user=user, role=role)


class TestInviteMember:
    def test_owner_can_invite(self, auth_client, user, user_factory):
        workspace_id = workspace_id_of(user)
        response = invite(auth_client(user), workspace_id, "newcomer@example.com")

        assert response.status_code == 201
        body = response.json()["data"]
        assert body["email"] == "newcomer@example.com"
        assert body["status"] == "PENDING"
        assert body["token"]  # returned once, to the inviter, for sharing
        assert body["invited_by"] == str(user.id)

    def test_admin_can_invite(self, auth_client, user, user_factory):
        from tests.factories import WorkspaceFactory

        workspace = WorkspaceFactory(name="Acme", owner=user)
        admin = user_factory(email="admin@example.com")
        add_member(workspace, admin, "ADMIN")

        response = invite(auth_client(admin), str(workspace.id), "x@example.com")
        assert response.status_code == 201

    def test_member_cannot_invite(self, auth_client, user, user_factory):
        from tests.factories import WorkspaceFactory

        workspace = WorkspaceFactory(name="Acme", owner=user)
        member = user_factory(email="member@example.com")
        add_member(workspace, member, "MEMBER")

        response = invite(auth_client(member), str(workspace.id), "x@example.com")
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "FORBIDDEN"

    def test_non_member_cannot_invite_and_gets_404(self, auth_client, user_factory):
        from tests.factories import WorkspaceFactory

        workspace = WorkspaceFactory(name="Secret", owner=user_factory())
        outsider = user_factory(email="outsider@example.com")

        response = invite(auth_client(outsider), str(workspace.id), "x@example.com")
        assert response.status_code == 404

    def test_cannot_invite_existing_member(self, auth_client, user, user_factory):
        from tests.factories import WorkspaceFactory

        workspace = WorkspaceFactory(name="Acme", owner=user)
        existing = user_factory(email="already@example.com")
        add_member(workspace, existing, "MEMBER")

        response = invite(auth_client(user), str(workspace.id), "already@example.com")
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "MEMBER_ALREADY_EXISTS"

    def test_duplicate_pending_invitation_conflict(self, auth_client, user):
        workspace_id = workspace_id_of(user)
        assert invite(auth_client(user), workspace_id, "dupe@example.com").status_code == 201
        response = invite(auth_client(user), workspace_id, "dupe@example.com")
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "INVITATION_ALREADY_PENDING"

    def test_owner_role_is_not_invitable(self, auth_client, user):
        workspace_id = workspace_id_of(user)
        response = invite(auth_client(user), workspace_id, "x@example.com", role="OWNER")
        assert response.status_code == 400

    def test_list_invitations_excludes_token(self, auth_client, user):
        workspace_id = workspace_id_of(user)
        invite(auth_client(user), workspace_id, "someone@example.com")

        response = auth_client(user).get(f"/api/v1/workspaces/{workspace_id}/invitations")
        assert response.status_code == 200
        items = response.json()["data"]
        assert len(items) == 1
        assert "token" not in items[0]


class TestAcceptInvitation:
    def _invite_and_get_token(self, client, workspace_id, email) -> str:
        return invite(client, workspace_id, email).json()["data"]["token"]

    def test_accept_valid_invitation_creates_membership(self, api_client, auth_client, user, user_factory):
        from apps.workspaces.infrastructure.models import WorkspaceMember

        workspace_id = workspace_id_of(user)
        invitee = user_factory(email="newcomer@example.com")
        token = self._invite_and_get_token(auth_client(user), workspace_id, "newcomer@example.com")

        api_client.force_authenticate(user=invitee)
        response = api_client.post(ACCEPT_URL.format(token=token))
        assert response.status_code == 200
        assert response.json()["data"]["role"] == "MEMBER"

        membership = WorkspaceMember.objects.get(workspace_id=workspace_id, user=invitee)
        assert membership.role == "MEMBER"

    def test_invitation_marked_accepted(self, api_client, auth_client, user, user_factory):
        from apps.invitations.infrastructure.models import Invitation

        workspace_id = workspace_id_of(user)
        invitee = user_factory(email="newcomer@example.com")
        token = self._invite_and_get_token(auth_client(user), workspace_id, "newcomer@example.com")
        api_client.force_authenticate(user=invitee)
        api_client.post(ACCEPT_URL.format(token=token))

        invitation = Invitation.objects.get(token=token)
        assert invitation.status == "ACCEPTED"

    def test_cannot_accept_twice(self, api_client, auth_client, user, user_factory):
        workspace_id = workspace_id_of(user)
        invitee = user_factory(email="newcomer@example.com")
        token = self._invite_and_get_token(auth_client(user), workspace_id, "newcomer@example.com")
        api_client.force_authenticate(user=invitee)
        assert api_client.post(ACCEPT_URL.format(token=token)).status_code == 200

        response = api_client.post(ACCEPT_URL.format(token=token))
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "INVITATION_NOT_PENDING"

    def test_expired_invitation_rejected_and_marked(self, api_client, auth_client, user, user_factory):
        from django.utils import timezone

        from apps.invitations.infrastructure.models import Invitation

        workspace_id = workspace_id_of(user)
        invitee = user_factory(email="late@example.com")
        token = self._invite_and_get_token(auth_client(user), workspace_id, "late@example.com")
        Invitation.objects.filter(token=token).update(
            expires_at=timezone.now() - timedelta(days=1)
        )

        api_client.force_authenticate(user=invitee)
        response = api_client.post(ACCEPT_URL.format(token=token))
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "INVITATION_EXPIRED"
        assert Invitation.objects.get(token=token).status == "EXPIRED"

    def test_revoked_invitation_rejected(self, api_client, auth_client, user, user_factory):
        from apps.invitations.infrastructure.models import Invitation

        workspace_id = workspace_id_of(user)
        invitee = user_factory(email="revoked@example.com")
        token = self._invite_and_get_token(auth_client(user), workspace_id, "revoked@example.com")
        Invitation.objects.filter(token=token).update(status="REVOKED")

        api_client.force_authenticate(user=invitee)
        response = api_client.post(ACCEPT_URL.format(token=token))
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "INVITATION_NOT_PENDING"

    def test_wrong_email_cannot_accept(self, api_client, auth_client, user, user_factory):
        workspace_id = workspace_id_of(user)
        someone_else = user_factory(email="intruder@example.com")
        token = self._invite_and_get_token(auth_client(user), workspace_id, "real@example.com")

        api_client.force_authenticate(user=someone_else)
        response = api_client.post(ACCEPT_URL.format(token=token))
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "INVITATION_EMAIL_MISMATCH"

    def test_accept_requires_authentication(self, api_client, auth_client, user):
        workspace_id = workspace_id_of(user)
        token = self._invite_and_get_token(auth_client(user), workspace_id, "x@example.com")
        response = api_client.post(ACCEPT_URL.format(token=token))
        assert response.status_code == 401

    def test_accept_unknown_token_404(self, api_client, user):
        api_client.force_authenticate(user=user)
        response = api_client.post(ACCEPT_URL.format(token="nonexistent-token"))
        assert response.status_code == 404


class TestRevokeInvitation:
    def test_owner_can_revoke(self, auth_client, user, user_factory):
        from apps.invitations.infrastructure.models import Invitation

        workspace_id = workspace_id_of(user)
        invitation_id = invite(auth_client(user), workspace_id, "bye@example.com").json()["data"]["id"]

        response = auth_client(user).delete(
            f"/api/v1/workspaces/{workspace_id}/invitations/{invitation_id}"
        )
        assert response.status_code == 204
        assert Invitation.objects.get(id=invitation_id).status == "REVOKED"

    def test_member_cannot_revoke(self, auth_client, user, user_factory):
        from tests.factories import WorkspaceFactory

        workspace = WorkspaceFactory(name="Acme", owner=user)
        member = user_factory(email="member@example.com")
        add_member(workspace, member, "MEMBER")

        invitation = invite(auth_client(user), str(workspace.id), "x@example.com").json()["data"]
        response = auth_client(member).delete(
            f"/api/v1/workspaces/{workspace.id}/invitations/{invitation['id']}"
        )
        assert response.status_code == 403
