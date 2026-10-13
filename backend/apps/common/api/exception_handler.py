"""API exception handling — converts domain/app exceptions into unified response envelopes."""

from __future__ import annotations

from typing import Any


def api_exception_handler(exc: Exception, context: dict[str, Any]) -> Any:
    """Single error envelope for AppError, DRF and unhandled exceptions:

    {"error": {"code": "...", "message": "...", "fields": {...}|null}}
    """
    from rest_framework.exceptions import APIException
    from rest_framework.response import Response
    from rest_framework.views import exception_handler as drf_exception_handler

    from apps.common.exceptions import AppError

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
