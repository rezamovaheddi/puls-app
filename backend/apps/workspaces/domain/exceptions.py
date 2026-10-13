"""Workspace domain exceptions."""

from __future__ import annotations

from apps.common.exceptions import (
    AppError,
    ForbiddenError,
    InputValidationError,
    MemberAlreadyExistsError,
    NotFoundError,
)


class WorkspaceNameRequiredError(InputValidationError):
    message = "Workspace name is required."


class WorkspaceNameTooLongError(InputValidationError):
    message = "Workspace name must be 100 characters or fewer."


class WorkspaceNotFoundError(NotFoundError):
    message = "Workspace not found."


__all__ = [
    "WorkspaceNameRequiredError",
    "WorkspaceNameTooLongError",
    "WorkspaceNotFoundError",
    "ForbiddenError",
    "MemberAlreadyExistsError",
    "AppError",
]
