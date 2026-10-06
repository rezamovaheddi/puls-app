"""Workspace domain — roles and the RBAC policy.

The policy is pure Python so it is unit-testable without Django and is the
single source of truth both the invitations app and the permission checks
consume. The frontend may hide buttons, but enforcement happens here.
"""

from __future__ import annotations

from django.db.models import TextChoices

OWNER = "OWNER"
ADMIN = "ADMIN"
MEMBER = "MEMBER"


class WorkspaceRole(TextChoices):
    OWNER = OWNER, "Owner"
    ADMIN = ADMIN, "Admin"
    MEMBER = MEMBER, "Member"


ROLE_RANK: dict[str, int] = {OWNER: 3, ADMIN: 2, MEMBER: 1}


def role_at_least(role: str, minimum: str) -> bool:
    return ROLE_RANK.get(role, 0) >= ROLE_RANK[minimum]


def can_manage_members(role: str) -> bool:
    """Invite, revoke, remove — OWNER and ADMIN only."""
    return role_at_least(role, ADMIN)


def can_manage_workspace(role: str) -> bool:
    """Settings/deletion — OWNER only."""
    return role == OWNER
