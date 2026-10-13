"""Explicit transaction boundary port.

Application use cases stay framework-free: instead of importing
`django.db.transaction` they depend on this Protocol, and the infrastructure
layer injects the Django implementation. This keeps the atomicity intent
visible in the use case while the mechanism stays swappable.
"""

from __future__ import annotations

from contextlib import AbstractContextManager
from typing import Protocol


class TransactionBoundary(Protocol):
    def atomic(self) -> AbstractContextManager[None]: ...

