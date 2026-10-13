"""Unit tests for application use cases using fake repositories (No DB, No HTTP)."""

from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import pytest

from apps.common.exceptions import (
    EmailAlreadyExistsError,
    ForbiddenError,
    InvalidCredentialsError,
    InvitationAlreadyPendingError,
    InvitationExpiredError,
    MemberAlreadyExistsError,
    NotFoundError,
)
from apps.invitations.application.use_cases import (
    AcceptInvitation,
    InviteMember,
    RevokeInvitation,
)
from apps.invitations.domain import ACCEPTED, EXPIRED, PENDING, REVOKED
from apps.users.application.use_cases import (
    AuthenticateUser,
    GetCurrentUser,
    RegisterUser,
)
from apps.workspaces.application.use_cases import (
    CreateWorkspace,
    GetWorkspaceDetails,
)
from apps.workspaces.domain import (
    ADMIN,
    MEMBER,
    OWNER,
    WorkspaceNameRequiredError,
    WorkspaceNameTooLongError,
    WorkspaceNotFoundError,
)

# --- Fake in-memory test doubles ---


@dataclass
class FakeUser:
    id: str
    email: str
    password: str
    first_name: str
    last_name: str
    is_active: bool = True


@dataclass
class FakeWorkspace:
    id: str
    name: str
    slug: str
    owner: FakeUser


@dataclass
class FakeWorkspaceMember:
    id: str
    workspace: FakeWorkspace
    user: FakeUser
    role: str

    @property
    def workspace_id(self) -> str:
        return self.workspace.id


@dataclass
class FakeInvitation:
    id: str
    workspace_id: str
    email: str
    role: str
    token: str
    invited_by: FakeUser
    expires_at: datetime
    status: str = PENDING


class FakeUserRepository:
    def __init__(self):
        self.users: dict[str, FakeUser] = {}

    def get_by_email(self, email: str) -> FakeUser | None:
        return next((u for u in self.users.values() if u.email.lower() == email.lower()), None)

    def get_by_id(self, user_id: object) -> FakeUser | None:
        return self.users.get(str(user_id))

    def create(self, *, email: str, password_hash: str, first_name: str, last_name: str) -> FakeUser:
        user = FakeUser(
            id=str(len(self.users) + 1),
            email=email,
            password=password_hash,
            first_name=first_name,
            last_name=last_name,
        )
        self.users[user.id] = user
        return user


class FakePasswordHasher:
    def hash(self, raw_password: str) -> str:
        return f"hashed::{raw_password}"

    def verify(self, raw_password: str, password_hash: str) -> bool:
        return password_hash == f"hashed::{raw_password}"


class FakeWorkspaceRepository:
    def __init__(self):
        self.workspaces: dict[str, FakeWorkspace] = {}
        self.memberships: list[FakeWorkspaceMember] = []

    def get_by_id(self, workspace_id: object) -> FakeWorkspace | None:
        return self.workspaces.get(str(workspace_id))

    def slug_exists(self, slug: str) -> bool:
        return any(ws.slug == slug for ws in self.workspaces.values())

    def create_with_owner(self, *, owner: FakeUser, name: str, slug: str | None = None) -> FakeWorkspace:
        ws_id = str(len(self.workspaces) + 1)
        ws = FakeWorkspace(id=ws_id, name=name, slug=slug or name.lower(), owner=owner)
        self.workspaces[ws_id] = ws
        member = FakeWorkspaceMember(
            id=str(len(self.memberships) + 1),
            workspace=ws,
            user=owner,
            role=OWNER,
        )
        self.memberships.append(member)
        return ws

    def list_memberships_for_user(self, user: FakeUser) -> list[FakeWorkspaceMember]:
        return [m for m in self.memberships if m.user.id == user.id]

    def get_membership(self, workspace_id: object, user: FakeUser) -> FakeWorkspaceMember | None:
        return next(
            (m for m in self.memberships if m.workspace.id == str(workspace_id) and m.user.id == user.id),
            None,
        )

    def membership_exists_for_email(self, workspace_id: object, email: str) -> bool:
        return any(
            m.workspace.id == str(workspace_id) and m.user.email.lower() == email.lower()
            for m in self.memberships
        )

    def create_member(self, *, workspace_id: object, user: FakeUser, role: str) -> FakeWorkspaceMember:
        ws = self.workspaces[str(workspace_id)]
        member = FakeWorkspaceMember(
            id=str(len(self.memberships) + 1),
            workspace=ws,
            user=user,
            role=role,
        )
        self.memberships.append(member)
        return member


class FakeInvitationRepository:
    def __init__(self):
        self.invitations: dict[str, FakeInvitation] = {}

    def get_by_token(self, token: str) -> FakeInvitation | None:
        return next((inv for inv in self.invitations.values() if inv.token == token), None)

    def get_by_id(self, invitation_id: object) -> FakeInvitation | None:
        return self.invitations.get(str(invitation_id))

    def pending_exists(self, workspace_id: object, email: str) -> bool:
        return any(
            inv.workspace_id == str(workspace_id)
            and inv.email.lower() == email.lower()
            and inv.status == PENDING
            for inv in self.invitations.values()
        )

    def create(
        self,
        *,
        workspace_id: object,
        email: str,
        role: str,
        invited_by: FakeUser,
        expires_at: object,
    ) -> FakeInvitation:
        inv_id = str(len(self.invitations) + 1)
        inv = FakeInvitation(
            id=inv_id,
            workspace_id=str(workspace_id),
            email=email,
            role=role,
            token=f"token-{inv_id}",
            invited_by=invited_by,
            expires_at=expires_at,  # type: ignore[arg-type]
            status=PENDING,
        )
        self.invitations[inv_id] = inv
        return inv

    def list_for_workspace(self, workspace_id: object) -> list[FakeInvitation]:
        return [inv for inv in self.invitations.values() if inv.workspace_id == str(workspace_id)]

    def set_status(self, invitation: FakeInvitation, status: str) -> None:
        invitation.status = status


class FakeTransactionBoundary:
    @contextmanager
    def atomic(self):
        yield None


# --- Tests ---


class TestUsersUseCasesUnit:
    def test_register_user_success(self):
        repo = FakeUserRepository()
        hasher = FakePasswordHasher()
        use_case = RegisterUser(repo, hasher)

        user = use_case.execute(
            email="Alice@Example.COM ",
            password="secretpassword",
            first_name=" Alice ",
            last_name=" Smith ",
        )

        assert user.email == "alice@example.com"
        assert user.first_name == "Alice"
        assert user.last_name == "Smith"
        assert hasher.verify("secretpassword", user.password) is True

    def test_register_user_duplicate_email(self):
        repo = FakeUserRepository()
        hasher = FakePasswordHasher()
        use_case = RegisterUser(repo, hasher)
        use_case.execute(email="alice@example.com", password="pass", first_name="A", last_name="S")

        with pytest.raises(EmailAlreadyExistsError):
            use_case.execute(email="ALICE@example.com", password="other", first_name="A", last_name="S")

    def test_authenticate_user_success(self):
        repo = FakeUserRepository()
        hasher = FakePasswordHasher()
        RegisterUser(repo, hasher).execute(email="bob@example.com", password="correct", first_name="B", last_name="O")

        user = AuthenticateUser(repo, hasher).execute(email="bob@example.com", password="correct")
        assert user.email == "bob@example.com"

    def test_authenticate_user_fails_on_wrong_password(self):
        repo = FakeUserRepository()
        hasher = FakePasswordHasher()
        RegisterUser(repo, hasher).execute(email="bob@example.com", password="correct", first_name="B", last_name="O")

        with pytest.raises(InvalidCredentialsError):
            AuthenticateUser(repo, hasher).execute(email="bob@example.com", password="WRONG")

    def test_authenticate_user_fails_on_nonexistent_user(self):
        repo = FakeUserRepository()
        hasher = FakePasswordHasher()

        with pytest.raises(InvalidCredentialsError):
            AuthenticateUser(repo, hasher).execute(email="ghost@example.com", password="pass")

    def test_authenticate_user_fails_when_inactive(self):
        repo = FakeUserRepository()
        hasher = FakePasswordHasher()
        user = RegisterUser(repo, hasher).execute(email="inactive@example.com", password="pass", first_name="I", last_name="N")
        user.is_active = False

        with pytest.raises(InvalidCredentialsError):
            AuthenticateUser(repo, hasher).execute(email="inactive@example.com", password="pass")

    def test_get_current_user_success(self):
        repo = FakeUserRepository()
        hasher = FakePasswordHasher()
        user = RegisterUser(repo, hasher).execute(email="c@example.com", password="pass", first_name="C", last_name="E")

        fetched = GetCurrentUser(repo).execute(user_id=user.id)
        assert fetched.id == user.id

    def test_get_current_user_not_found(self):
        repo = FakeUserRepository()
        with pytest.raises(NotFoundError):
            GetCurrentUser(repo).execute(user_id="missing-id")


class TestWorkspacesUseCasesUnit:
    def test_create_workspace_success(self):
        repo = FakeWorkspaceRepository()
        user = FakeUser("1", "u@example.com", "h", "First", "Last")
        ws = CreateWorkspace(repo).execute(user=user, name="My Workspace")

        assert ws.name == "My Workspace"
        assert ws.slug == "my-workspace"
        assert ws.owner == user

        memberships = repo.list_memberships_for_user(user)
        assert len(memberships) == 1
        assert memberships[0].role == OWNER

    def test_create_workspace_slug_collision_resolution(self):
        repo = FakeWorkspaceRepository()
        user = FakeUser("1", "u@example.com", "h", "First", "Last")
        ws1 = CreateWorkspace(repo).execute(user=user, name="Acme")
        ws2 = CreateWorkspace(repo).execute(user=user, name="Acme")

        assert ws1.slug == "acme"
        assert ws2.slug == "acme-1"

    def test_create_workspace_blank_name_fails(self):
        repo = FakeWorkspaceRepository()
        user = FakeUser("1", "u@example.com", "h", "First", "Last")
        with pytest.raises(WorkspaceNameRequiredError):
            CreateWorkspace(repo).execute(user=user, name="   ")

    def test_create_workspace_name_too_long_fails(self):
        repo = FakeWorkspaceRepository()
        user = FakeUser("1", "u@example.com", "h", "First", "Last")
        with pytest.raises(WorkspaceNameTooLongError):
            CreateWorkspace(repo).execute(user=user, name="x" * 101)

    def test_get_workspace_details_for_member(self):
        repo = FakeWorkspaceRepository()
        user = FakeUser("1", "u@example.com", "h", "First", "Last")
        ws = CreateWorkspace(repo).execute(user=user, name="Acme")

        fetched_ws, membership = GetWorkspaceDetails(repo).execute(user=user, workspace_id=ws.id)
        assert fetched_ws.id == ws.id
        assert membership.role == OWNER

    def test_get_workspace_details_idor_protection_for_outsider(self):
        repo = FakeWorkspaceRepository()
        owner = FakeUser("1", "owner@example.com", "h", "Owner", "U")
        outsider = FakeUser("2", "outsider@example.com", "h", "Outsider", "U")
        ws = CreateWorkspace(repo).execute(user=owner, name="Secret")

        with pytest.raises(WorkspaceNotFoundError):
            GetWorkspaceDetails(repo).execute(user=outsider, workspace_id=ws.id)


class TestInvitationsUseCasesUnit:
    def test_invite_member_success_by_owner(self):
        ws_repo = FakeWorkspaceRepository()
        inv_repo = FakeInvitationRepository()
        owner = FakeUser("1", "owner@example.com", "h", "O", "W")
        ws = CreateWorkspace(ws_repo).execute(user=owner, name="Acme")

        inv = InviteMember(ws_repo, inv_repo).execute(
            actor=owner,
            workspace_id=ws.id,
            email="newbie@example.com",
            role=ADMIN,
        )
        assert inv.email == "newbie@example.com"
        assert inv.role == ADMIN
        assert inv.status == PENDING

    def test_member_cannot_invite(self):
        ws_repo = FakeWorkspaceRepository()
        inv_repo = FakeInvitationRepository()
        owner = FakeUser("1", "owner@example.com", "h", "O", "W")
        member_user = FakeUser("2", "member@example.com", "h", "M", "E")
        ws = CreateWorkspace(ws_repo).execute(user=owner, name="Acme")
        ws_repo.create_member(workspace_id=ws.id, user=member_user, role=MEMBER)

        with pytest.raises(ForbiddenError):
            InviteMember(ws_repo, inv_repo).execute(
                actor=member_user,
                workspace_id=ws.id,
                email="target@example.com",
                role=MEMBER,
            )

    def test_invite_member_fails_when_already_a_member(self):
        ws_repo = FakeWorkspaceRepository()
        inv_repo = FakeInvitationRepository()
        owner = FakeUser("1", "owner@example.com", "h", "O", "W")
        ws = CreateWorkspace(ws_repo).execute(user=owner, name="Acme")

        with pytest.raises(MemberAlreadyExistsError):
            InviteMember(ws_repo, inv_repo).execute(
                actor=owner,
                workspace_id=ws.id,
                email="owner@example.com",
                role=MEMBER,
            )

    def test_invite_member_fails_when_pending_invitation_exists(self):
        ws_repo = FakeWorkspaceRepository()
        inv_repo = FakeInvitationRepository()
        owner = FakeUser("1", "owner@example.com", "h", "O", "W")
        ws = CreateWorkspace(ws_repo).execute(user=owner, name="Acme")
        InviteMember(ws_repo, inv_repo).execute(
            actor=owner,
            workspace_id=ws.id,
            email="someone@example.com",
            role=MEMBER,
        )

        with pytest.raises(InvitationAlreadyPendingError):
            InviteMember(ws_repo, inv_repo).execute(
                actor=owner,
                workspace_id=ws.id,
                email="someone@example.com",
                role=MEMBER,
            )

    def test_accept_invitation_success(self):
        ws_repo = FakeWorkspaceRepository()
        inv_repo = FakeInvitationRepository()
        tx = FakeTransactionBoundary()
        now = datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)

        owner = FakeUser("1", "owner@example.com", "h", "O", "W")
        ws = CreateWorkspace(ws_repo).execute(user=owner, name="Acme")
        inv = InviteMember(ws_repo, inv_repo, clock=lambda: now).execute(
            actor=owner,
            workspace_id=ws.id,
            email="invitee@example.com",
            role=ADMIN,
        )

        invitee = FakeUser("2", "invitee@example.com", "h", "In", "Vitee")
        member = AcceptInvitation(ws_repo, inv_repo, tx, clock=lambda: now).execute(
            user=invitee,
            token=inv.token,
        )

        assert member.role == ADMIN
        assert inv.status == ACCEPTED
        assert ws_repo.membership_exists_for_email(ws.id, "invitee@example.com") is True

    def test_accept_invitation_fails_and_marks_expired(self):
        ws_repo = FakeWorkspaceRepository()
        inv_repo = FakeInvitationRepository()
        tx = FakeTransactionBoundary()
        created_time = datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)
        owner = FakeUser("1", "owner@example.com", "h", "O", "W")
        ws = CreateWorkspace(ws_repo).execute(user=owner, name="Acme")
        inv = InviteMember(ws_repo, inv_repo, clock=lambda: created_time).execute(
            actor=owner,
            workspace_id=ws.id,
            email="invitee@example.com",
            role=MEMBER,
        )

        much_later = created_time + timedelta(days=30)
        invitee = FakeUser("2", "invitee@example.com", "h", "In", "Vitee")

        with pytest.raises(InvitationExpiredError):
            AcceptInvitation(ws_repo, inv_repo, tx, clock=lambda: much_later).execute(
                user=invitee,
                token=inv.token,
            )

        assert inv.status == EXPIRED

    def test_revoke_invitation_success(self):
        ws_repo = FakeWorkspaceRepository()
        inv_repo = FakeInvitationRepository()
        owner = FakeUser("1", "owner@example.com", "h", "O", "W")
        ws = CreateWorkspace(ws_repo).execute(user=owner, name="Acme")
        inv = InviteMember(ws_repo, inv_repo).execute(
            actor=owner,
            workspace_id=ws.id,
            email="temp@example.com",
            role=MEMBER,
        )

        RevokeInvitation(ws_repo, inv_repo).execute(
            actor=owner,
            workspace_id=ws.id,
            invitation_id=inv.id,
        )
        assert inv.status == REVOKED
