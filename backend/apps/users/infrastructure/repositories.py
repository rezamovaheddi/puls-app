"""Django implementations of the users application ports."""

from __future__ import annotations

from typing import TYPE_CHECKING

from django.contrib.auth.hashers import check_password, make_password

from apps.users.domain import normalize_email

if TYPE_CHECKING:
    from apps.users.infrastructure.models import User


class DjangoUserRepository:
    def get_by_email(self, email: str) -> User | None:
        from apps.users.infrastructure.models import User

        return User.objects.filter(email=normalize_email(email)).first()

    def get_by_id(self, user_id: object) -> User | None:
        from apps.users.infrastructure.models import User

        return User.objects.filter(pk=user_id).first()

    def create(
        self,
        *,
        email: str,
        password_hash: str,
        first_name: str,
        last_name: str,
    ) -> User:
        from apps.users.infrastructure.models import User

        return User.objects.create(
            email=normalize_email(email),
            password=password_hash,
            first_name=first_name,
            last_name=last_name,
        )


class DjangoPasswordHasher:
    """Delegates to Django's password hashing stack (PBKDF2 by default)."""

    def hash(self, raw_password: str) -> str:
        return make_password(raw_password)

    def verify(self, raw_password: str, password_hash: str) -> bool:
        return check_password(raw_password, password_hash)
