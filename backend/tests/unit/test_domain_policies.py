"""Unit tests for domain policies and business rules — pure Python, no DB, no HTTP."""

from datetime import UTC, datetime, timedelta

import pytest

from apps.common.exceptions import (
    InvitationEmailMismatchError,
    InvitationExpiredError,
    InvitationNotPendingError,
)
from apps.invitations.domain import (
    ACCEPTED,
    EXPIRED,
    INVITABLE_ROLES,
    PENDING,
    REVOKED,
    assert_acceptable,
    is_expired,
)
from apps.users.domain import is_valid_email_format, normalize_email
from apps.workspaces.domain import (
    ADMIN,
    MEMBER,
    OWNER,
    can_manage_members,
    can_manage_workspace,
    generate_candidate_slug,
    role_at_least,
    slugify_name,
)


class TestUserDomainPolicies:
    def test_normalize_email(self):
        assert normalize_email("  User@Example.COM  ") == "user@example.com"
        assert normalize_email("test.developer+tag@domain.co.uk") == "test.developer+tag@domain.co.uk"

    def test_is_valid_email_format(self):
        assert is_valid_email_format("user@example.com") is True
        assert is_valid_email_format("invalid-email") is False
        assert is_valid_email_format("user@") is False
        assert is_valid_email_format("@example.com") is False
        assert is_valid_email_format("user@localhost") is False


class TestWorkspaceDomainPolicies:
    def test_role_hierarchy(self):
        assert role_at_least(OWNER, OWNER) is True
        assert role_at_least(OWNER, ADMIN) is True
        assert role_at_least(OWNER, MEMBER) is True
        assert role_at_least(ADMIN, OWNER) is False
        assert role_at_least(ADMIN, ADMIN) is True
        assert role_at_least(ADMIN, MEMBER) is True
        assert role_at_least(MEMBER, ADMIN) is False
        assert role_at_least(MEMBER, MEMBER) is True

    def test_can_manage_members(self):
        assert can_manage_members(OWNER) is True
        assert can_manage_members(ADMIN) is True
        assert can_manage_members(MEMBER) is False

    def test_can_manage_workspace(self):
        assert can_manage_workspace(OWNER) is True
        assert can_manage_workspace(ADMIN) is False
        assert can_manage_workspace(MEMBER) is False

    def test_slugify_name(self):
        assert slugify_name("Acme Corp & Co.") == "acme-corp-co"
        assert slugify_name("Pulse Project 2026") == "pulse-project-2026"
        assert slugify_name("   ") == "workspace"

    def test_generate_candidate_slug(self):
        assert generate_candidate_slug("Acme") == "acme"
        assert generate_candidate_slug("Acme", 1) == "acme-1"
        assert generate_candidate_slug("Acme", 42) == "acme-42"


class TestInvitationDomainPolicies:
    def test_invitable_roles(self):
        assert "ADMIN" in INVITABLE_ROLES
        assert "MEMBER" in INVITABLE_ROLES
        assert "OWNER" not in INVITABLE_ROLES

    def test_is_expired(self):
        now = datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)
        future = now + timedelta(days=1)
        past = now - timedelta(days=1)

        assert is_expired(past, now) is True
        assert is_expired(now, now) is True
        assert is_expired(future, now) is False

    def test_assert_acceptable_success(self):
        now = datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)
        assert_acceptable(
            status=PENDING,
            expires_at=now + timedelta(days=7),
            invitation_email="alice@example.com",
            actor_email="alice@example.com",
            now=now,
        )

    def test_assert_acceptable_fails_when_not_pending(self):
        now = datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)
        for non_pending_status in (ACCEPTED, EXPIRED, REVOKED):
            with pytest.raises(InvitationNotPendingError):
                assert_acceptable(
                    status=non_pending_status,
                    expires_at=now + timedelta(days=7),
                    invitation_email="alice@example.com",
                    actor_email="alice@example.com",
                    now=now,
                )

    def test_assert_acceptable_fails_when_expired(self):
        now = datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)
        with pytest.raises(InvitationExpiredError):
            assert_acceptable(
                status=PENDING,
                expires_at=now - timedelta(seconds=1),
                invitation_email="alice@example.com",
                actor_email="alice@example.com",
                now=now,
            )

    def test_assert_acceptable_fails_on_email_mismatch(self):
        now = datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)
        with pytest.raises(InvitationEmailMismatchError):
            assert_acceptable(
                status=PENDING,
                expires_at=now + timedelta(days=7),
                invitation_email="alice@example.com",
                actor_email="bob@example.com",
                now=now,
            )
