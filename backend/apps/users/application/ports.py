"""Ports for the users application layer — implemented in infrastructure."""

from __future__ import annotations

from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from apps.users.infrastructure.models import User


class UserRepository(Protocol):
    def get_by_email(self, email: str) -> User | None: ...

    def get_by_id(self, user_id: object) -> User | None: ...

    def create(
        self,
        *,
        email: str,
        password_hash: str,
        first_name: str,
        last_name: str,
    ) -> User: ...


class PasswordHasher(Protocol):
    def hash(self, raw_password: str) -> str: ...

    def verify(self, raw_password: str, password_hash: str) -> bool: ...
