"""User domain exceptions."""

from __future__ import annotations

from apps.common.exceptions import (
    AppError,
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    NotFoundError,
)


class InvalidEmailError(AppError):
    status_code = 400
    code = "INVALID_EMAIL"
    message = "The provided email address is invalid."


__all__ = [
    "InvalidEmailError",
    "EmailAlreadyExistsError",
    "InvalidCredentialsError",
    "NotFoundError",
]
