"""Infrastructure implementations of the common ports."""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

from django.db import transaction as django_transaction


class DjangoTransactionBoundary:
    @contextmanager
    def atomic(self) -> Iterator[None]:
        with django_transaction.atomic():
            yield None
