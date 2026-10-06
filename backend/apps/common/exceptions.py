"""Application-wide error hierarchy.

Layering: domain/application code raises these; the DRF exception handler in
`api_exception_handler` converts them (and framework exceptions) into the one
error envelope the frontend can rely on:

    {"error": {"code": "...", "message": "...", "fields": {...}|null}}
"""

from __future__ import annotations

from typing import Any


class AppError(Exception):
    """Base class for every deliberate application/domain error."""

    status_code = 400
    code = "APP_ERROR"
    message = "Unexpected application error."

    def __init__(self, message: str | None = None) -> None:
        self.message = message or self.message
        super().__init__(self.message)


class InputValidationError(AppError):
    status_code = 400
    code = "VALIDATION_ERROR"
    message = "Invalid request."


class UnauthorizedError(AppError):
    status_code = 401
    code = "UNAUTHORIZED"
    message = "Authentication required."


class InvalidCredentialsError(UnauthorizedError):
    code = "INVALID_CREDENTIALS"
    message = "Invalid email or password."


class InvalidRefreshTokenError(UnauthorizedError):
    code = "INVALID_REFRESH_TOKEN"
    message = "Invalid or expired refresh token."


class ForbiddenError(AppError):
    status_code = 403
    code = "FORBIDDEN"
    message = "You do not have permission to perform this action."


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"
    message = "Resource not found."


class ConflictError(AppError):
    status_code = 409
    code = "CONFLICT"
    message = "The request conflicts with the current state."


class EmailAlreadyExistsError(ConflictError):
    code = "EMAIL_ALREADY_EXISTS"
    message = "An account with this email already exists."


class MemberAlreadyExistsError(ConflictError):
    code = "MEMBER_ALREADY_EXISTS"
    message = "This user is already a member of the workspace."


class InvitationAlreadyPendingError(ConflictError):
    code = "INVITATION_ALREADY_PENDING"
    message = "A pending invitation for this email already exists."


class InvitationNotPendingError(ConflictError):
    code = "INVITATION_NOT_PENDING"
    message = "This invitation is no longer pending."


class InvitationExpiredError(ConflictError):
    code = "INVITATION_EXPIRED"
    message = "This invitation has expired."


class InvitationEmailMismatchError(ForbiddenError):
    code = "INVITATION_EMAIL_MISMATCH"
    message = "This invitation was issued for a different email address."


def api_exception_handler(exc: Exception, context: dict[str, Any]) -> Any:
    """Single error envelope for AppError, DRF and unhandled exceptions."""
    from rest_framework.exceptions import APIException
    from rest_framework.response import Response
    from rest_framework.views import exception_handler as drf_exception_handler

    if isinstance(exc, AppError):
        return Response(
            {
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "fields": None,
                }
            },
            status=exc.status_code,
        )

    response = drf_exception_handler(exc, context)
    if response is None:
        return Response(
            {
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Something went wrong on our side.",
                    "fields": None,
                }
            },
            status=500,
        )

    code_map = {
        400: "VALIDATION_ERROR",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        406: "NOT_ACCEPTABLE",
        415: "UNSUPPORTED_MEDIA_TYPE",
        429: "RATE_LIMITED",
    }
    assert isinstance(exc, APIException)
    data = response.data
    fields: dict | None = None
    message = "Invalid request."
    if isinstance(data, dict):
        if set(data.keys()) == {"detail"}:
            message = str(data["detail"])
        else:
            fields = {key: value for key, value in data.items()}
            message = "Invalid request."
    elif isinstance(data, list):
        message = "; ".join(str(item) for item in data)

    return Response(
        {
            "error": {
                "code": code_map.get(response.status_code, "ERROR"),
                "message": message,
                "fields": fields,
            }
        },
        status=response.status_code,
    )
