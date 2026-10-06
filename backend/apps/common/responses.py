"""Success-envelope helper.

Every 2xx response from this API has the shape:

    {"data": <payload>, "message": <optional human message>}

so the Next.js client never guesses per-endpoint response shapes.
"""

from __future__ import annotations

from typing import Any

from rest_framework.response import Response


def envelope(
    data: Any = None,
    *,
    message: str | None = None,
    status: int = 200,
) -> Response:
    payload: dict[str, Any] = {"data": data}
    if message is not None:
        payload["message"] = message
    return Response(payload, status=status)


def no_content() -> Response:
    return Response(status=204)
