"""Authentication use cases.

Signup is not "create a row": normalize → check existing → hash → create.
Login never reveals *why* it failed (no user enumeration).
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from apps.common.exceptions import (
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    NotFoundError,
)
from apps.users.domain import normalize_email

if TYPE_CHECKING:
    from apps.users.application.repositories import (
        PasswordHasher,
        UserRepository,
    )
    from apps.users.infrastructure.models import User


class RegisterUser:
    def __init__(self, users: UserRepository, hasher: PasswordHasher) -> None:
        self._users = users
        self._hasher = hasher

    def execute(
        self,
        *,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
    ) -> User:
        normalized = normalize_email(email)
        if self._users.get_by_email(normalized) is not None:
            raise EmailAlreadyExistsError
        return self._users.create(
            email=normalized,
            password_hash=self._hasher.hash(password),
            first_name=first_name.strip(),
            last_name=last_name.strip(),
        )


class LoginUser:
    def __init__(self, users: UserRepository, hasher: PasswordHasher) -> None:
        self._users = users
        self._hasher = hasher

    def execute(self, *, email: str, password: str) -> User:
        user = self._users.get_by_email(normalize_email(email))
        # Same error for "no such user" and "wrong password" — no enumeration.
        if user is None or not self._hasher.verify(password, user.password):
            raise InvalidCredentialsError
        if not user.is_active:
            raise InvalidCredentialsError
        return user


class GetCurrentUser:
    def __init__(self, users: UserRepository) -> None:
        self._users = users

    def execute(self, *, user_id: object) -> User:
        user = self._users.get_by_id(user_id)
        if user is None:
            raise NotFoundError("Authenticated user no longer exists.")
        return user
