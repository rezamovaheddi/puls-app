"""User domain entities — pure Python dataclasses representing business concepts."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class UserEntity:
    id: object
    email: str
    first_name: str
    last_name: str
    is_active: bool = True
    created_at: datetime | None = None

    @property
    def full_name(self) -> str:
        name = f"{self.first_name} {self.last_name}".strip()
        return name or self.email
