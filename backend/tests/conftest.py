"""Shared fixtures + factories for the test suite."""

from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from apps.users.infrastructure.models import User


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def user_factory(db):
    from tests.factories import UserFactory

    return UserFactory


@pytest.fixture
def user(user_factory) -> User:
    return user_factory(email="owner@example.com")


def auth(client: APIClient, user: User) -> APIClient:
    """Attach a valid Bearer token for `user` to the client."""
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def auth_client():
    """Returns a callable: auth_client(user) → a FRESH authenticated client.

    Each call builds its own APIClient so authentication state never leaks
    between the "inviter" and the request under test.
    """

    def _factory(target_user: User) -> APIClient:
        return auth(APIClient(), target_user)

    return _factory
