"""Workspace domain policies and roles — 100% pure Python, no framework dependencies."""

from __future__ import annotations

import re
import unicodedata
from enum import StrEnum


class WorkspaceRole(StrEnum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"

    @classmethod
    def choices(cls) -> list[tuple[str, str]]:
        return [(role.value, role.name.capitalize()) for role in cls]


OWNER = WorkspaceRole.OWNER.value
ADMIN = WorkspaceRole.ADMIN.value
MEMBER = WorkspaceRole.MEMBER.value

ROLE_RANK: dict[str, int] = {OWNER: 3, ADMIN: 2, MEMBER: 1}


def role_at_least(role: str, minimum: str) -> bool:
    return ROLE_RANK.get(role, 0) >= ROLE_RANK.get(minimum, 0)


def can_manage_members(role: str) -> bool:
    """Invite, revoke, remove — OWNER and ADMIN only."""
    return role_at_least(role, ADMIN)


def can_manage_workspace(role: str) -> bool:
    """Settings/deletion — OWNER only."""
    return role == OWNER


def slugify_name(value: str) -> str:
    """Pure Python slugify without Django dependencies."""
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^\w\s-]", "", value).strip().lower()
    return re.sub(r"[-\s]+", "-", value) or "workspace"


def generate_candidate_slug(name: str, suffix: int = 0, max_length: int = 120) -> str:
    base = slugify_name(name)[: max_length - 17] or "workspace"
    if suffix > 0:
        return f"{base}-{suffix}"
    return base
