"""Data Transfer Objects for users application layer."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RegisterUserInputDTO:
    email: str
    password: str
    first_name: str
    last_name: str


@dataclass(frozen=True)
class LoginInputDTO:
    email: str
    password: str


@dataclass(frozen=True)
class UserOutputDTO:
    id: str
    email: str
    first_name: str
    last_name: str
    full_name: str
