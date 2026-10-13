"""Integration tests for real Django repositories, ORM constraints, and transaction boundaries."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from django.db import IntegrityError, transaction

from apps.common.exceptions import (
    InvitationNotPendingError,
    MemberAlreadyExistsError,
)
from apps.common.infrastructure import DjangoTransactionBoundary
from apps.invitations.application.use_cases import (
    AcceptInvitation,
    InviteMember,
)
from apps.invitations.domain import PENDING, REVOKED
from apps.invitations.infrastructure.repositories import (
    DjangoInvitationRepository,
)
from apps.users.infrastructure.repositories import (
    DjangoUserRepository,
)
from apps.workspaces.domain import OWNER
from apps.workspaces.infrastructure.models import Workspace, WorkspaceMember
from apps.workspaces.infrastructure.repositories import (
    DjangoWorkspaceRepository,
)

pytestmark = pytest.mark.django_db


class TestWorkspaceRepositoryIntegration:
    def test_create_with_owner_atomic_success(self):
        user_repo = DjangoUserRepository()
        user = user_repo.create(
            email="owner@pulse.test",
            password_hash="fakehash",
            first_name="Owner",
            last_name="User",
        )

        ws_repo = DjangoWorkspaceRepository()
        workspace = ws_repo.create_with_owner(owner=user, name="Pulse Headquarters")

        # Verify Workspace created
        assert workspace.id is not None
        assert workspace.slug == "pulse-headquarters"
        assert workspace.owner == user

        # Verify OWNER membership created in same transaction
        membership = WorkspaceMember.objects.get(workspace=workspace, user=user)
        assert membership.role == OWNER

    def test_create_with_owner_rolls_back_workspace_if_membership_creation_fails(self):
        """Proof of transaction atomicity: if membership creation raises, workspace is NOT persisted."""
        user_repo = DjangoUserRepository()
        user = user_repo.create(
            email="rollback@pulse.test",
            password_hash="fakehash",
            first_name="Rollback",
            last_name="Tester",
        )

        ws_repo = DjangoWorkspaceRepository()

        # Patch WorkspaceMember.objects.create to simulate failure
        with patch.object(WorkspaceMember.objects, "create", side_effect=RuntimeError("Database failure")):
            with pytest.raises(RuntimeError):
                ws_repo.create_with_owner(owner=user, name="Doomed Workspace")

        # Workspace must NOT exist in the database!
        assert not Workspace.objects.filter(name="Doomed Workspace").exists()
        assert not WorkspaceMember.objects.filter(user=user).exists()

    def test_database_unique_member_constraint(self):
        """Verifies database constraint uniq_workspace_member prevents duplicate membership rows."""
        user_repo = DjangoUserRepository()
        user = user_repo.create(
            email="member@pulse.test",
            password_hash="fakehash",
            first_name="John",
            last_name="Doe",
        )

        ws_repo = DjangoWorkspaceRepository()
        workspace = ws_repo.create_with_owner(owner=user, name="Acme Team")

        # Attempt to insert a second membership for same (workspace, user)
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                WorkspaceMember.objects.create(
                    workspace=workspace,
                    user=user,
                    role="MEMBER",
                )


class TestInvitationRepositoryIntegration:
    def test_pending_invitation_partial_unique_constraint(self):
        """Verifies partial unique constraint: only ONE pending invitation per (workspace, email)."""
        user_repo = DjangoUserRepository()
        owner = user_repo.create(email="inviter@pulse.test", password_hash="h", first_name="I", last_name="N")
        ws_repo = DjangoWorkspaceRepository()
        workspace = ws_repo.create_with_owner(owner=owner, name="Constraint Team")

        inv_repo = DjangoInvitationRepository()
        from datetime import timedelta

        from django.utils import timezone

        now = timezone.now()
        # First invitation: PENDING
        inv_repo.create(
            workspace_id=workspace.id,
            email="candidate@pulse.test",
            role="MEMBER",
            invited_by=owner,
            expires_at=now + timedelta(days=7),
        )

        # Second PENDING invitation to same email in same workspace MUST violate DB constraint
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                inv_repo.create(
                    workspace_id=workspace.id,
                    email="candidate@pulse.test",
                    role="MEMBER",
                    invited_by=owner,
                    expires_at=now + timedelta(days=7),
                )

    def test_revoked_or_accepted_allows_new_pending_invitation(self):
        """If previous invitation was revoked, a new pending invitation CAN be created."""
        user_repo = DjangoUserRepository()
        owner = user_repo.create(email="inviter2@pulse.test", password_hash="h", first_name="I", last_name="N")
        ws_repo = DjangoWorkspaceRepository()
        workspace = ws_repo.create_with_owner(owner=owner, name="Reinvite Team")

        inv_repo = DjangoInvitationRepository()
        from datetime import timedelta

        from django.utils import timezone

        now = timezone.now()
        first_inv = inv_repo.create(
            workspace_id=workspace.id,
            email="reinvite@pulse.test",
            role="MEMBER",
            invited_by=owner,
            expires_at=now + timedelta(days=7),
        )

        # Revoke first invitation
        inv_repo.set_status(first_inv, REVOKED)

        # Now creating a new PENDING invitation must succeed without IntegrityError
        second_inv = inv_repo.create(
            workspace_id=workspace.id,
            email="reinvite@pulse.test",
            role="ADMIN",
            invited_by=owner,
            expires_at=now + timedelta(days=7),
        )
        assert second_inv.status == PENDING
        assert second_inv.role == "ADMIN"


class TestConcurrentAcceptInvitationHandling:
    def test_race_condition_second_accept_fails_gracefully(self):
        """Simulates two requests accepting the same invitation concurrently."""
        user_repo = DjangoUserRepository()
        owner = user_repo.create(email="boss@pulse.test", password_hash="h", first_name="B", last_name="O")
        invitee = user_repo.create(email="worker@pulse.test", password_hash="h", first_name="W", last_name="O")

        ws_repo = DjangoWorkspaceRepository()
        ws = ws_repo.create_with_owner(owner=owner, name="Fast Co")

        inv_repo = DjangoInvitationRepository()
        tx = DjangoTransactionBoundary()

        invite_uc = InviteMember(ws_repo, inv_repo)
        invitation = invite_uc.execute(
            actor=owner,
            workspace_id=ws.id,
            email=invitee.email,
            role="MEMBER",
        )

        accept_uc = AcceptInvitation(ws_repo, inv_repo, tx)

        # First request succeeds
        member1 = accept_uc.execute(user=invitee, token=invitation.token)
        assert member1.role == "MEMBER"
        assert WorkspaceMember.objects.filter(workspace=ws, user=invitee).count() == 1

        # Second request must fail cleanly (either InvitationNotPending or MemberAlreadyExists)
        with pytest.raises((InvitationNotPendingError, MemberAlreadyExistsError)):
            accept_uc.execute(user=invitee, token=invitation.token)
