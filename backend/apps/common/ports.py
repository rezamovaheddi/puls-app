"""Explicit transaction boundary port.

Application use cases stay framework-free: instead of importing
`django.db.transaction` they depend on this Protocol, and the infrastructure
layer injects the Django implementation. This keeps the atomicity intent
visible in the use case while the mechanism stays swappable.
"""

from __future__ import annotations

from types import TracebackType
from typing import Protocol


class TransactionBoundary(Protocol):
    def atomic(self) -> _AtomicContext: ...


class _AtomicContext(Protocol):
    def __enter__(self) -> None: ...

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None: ...
