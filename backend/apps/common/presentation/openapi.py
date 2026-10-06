"""OpenAPI postprocessing — document the response envelope.

Every 2xx response is actually `{"data": ..., "message": ...}`; this hook
wraps the documented schemas so the generated contract matches the wire.
"""

from __future__ import annotations

from typing import Any


def wrap_success_envelope(result: dict[str, Any], **kwargs: Any) -> dict[str, Any]:
    for _path, methods in (result.get("paths") or {}).items():
        for method, operation in methods.items():
            if method.lower() not in {"get", "post", "put", "patch", "delete"}:
                continue
            for status_code, response in (operation.get("responses") or {}).items():
                if not str(status_code).startswith("2"):
                    continue
                content = (response or {}).get("content") or {}
                json_media = content.get("application/json")
                if not json_media:
                    continue
                schema = json_media.get("schema")
                if not schema:
                    continue
                json_media["schema"] = {
                    "type": "object",
                    "properties": {
                        "data": schema,
                        "message": {"type": "string", "nullable": True},
                    },
                    "required": ["data"],
                }
    return result
