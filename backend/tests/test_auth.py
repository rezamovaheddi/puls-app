"""Authentication endpoint tests — the contract the Next.js app depends on."""

from __future__ import annotations

import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db

SIGNUP_PAYLOAD = {
    "email": "John@Example.com",
    "password": "StrongPassword123!",
    "first_name": "John",
    "last_name": "Doe",
}


def signup(client: APIClient, **overrides) -> dict:
    return client.post("/api/v1/auth/signup", {**SIGNUP_PAYLOAD, **overrides}, format="json")


class TestSignup:
    def test_signup_successful(self, api_client):
        response = signup(api_client)

        assert response.status_code == 201
        body = response.json()
        # Email is normalized to lowercase — the identity key.
        assert body["data"]["user"]["email"] == "john@example.com"
        assert body["data"]["access"]
        assert body["data"]["refresh"]
        assert body["message"] == "Account created."
        # HttpOnly refresh cookie scoped to the auth path.
        cookie = response.cookies["pulse_refresh_token"]
        assert cookie["httponly"]
        assert cookie["path"] == "/api/v1/auth/"

    def test_signup_stores_hashed_password_never_plaintext(self, api_client):
        signup(api_client)
        from apps.users.infrastructure.models import User

        user = User.objects.get(email="john@example.com")
        assert user.password != SIGNUP_PAYLOAD["password"]
        assert user.password.startswith(("pbkdf2_", "argon2", "bcrypt", "md5$"))
        assert user.check_password(SIGNUP_PAYLOAD["password"])

    def test_signup_duplicate_email_conflict(self, api_client):
        assert signup(api_client).status_code == 201
        response = signup(api_client)
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "EMAIL_ALREADY_EXISTS"

    def test_signup_duplicate_email_case_insensitive(self, api_client):
        assert signup(api_client).status_code == 201
        response = signup(api_client, email="JOHN@example.com")
        assert response.status_code == 409

    def test_signup_invalid_email(self, api_client):
        response = signup(api_client, email="not-an-email")
        assert response.status_code == 400
        error = response.json()["error"]
        assert error["code"] == "VALIDATION_ERROR"
        assert "email" in error["fields"]

    def test_signup_weak_password(self, api_client):
        response = signup(api_client, password="short")
        assert response.status_code == 400
        assert "password" in response.json()["error"]["fields"]

    def test_signup_numeric_only_password_rejected(self, api_client):
        response = signup(api_client, password="98347592837592")
        assert response.status_code == 400


class TestLogin:
    def test_login_successful(self, api_client, user_factory):
        user_factory(email="jane@example.com", password="StrongPassword123!")
        response = api_client.post(
            "/api/v1/auth/login",
            {"email": "jane@example.com", "password": "StrongPassword123!"},
            format="json",
        )
        assert response.status_code == 200
        body = response.json()
        assert body["data"]["user"]["email"] == "jane@example.com"
        assert body["data"]["access"]
        assert response.cookies["pulse_refresh_token"]

    def test_login_wrong_password_generic_error(self, api_client, user_factory):
        user_factory(email="jane@example.com", password="StrongPassword123!")
        response = api_client.post(
            "/api/v1/auth/login",
            {"email": "jane@example.com", "password": "WrongPassword123!"},
            format="json",
        )
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"

    def test_login_unknown_email_same_error_as_wrong_password(self, api_client):
        """No user enumeration: unknown email == wrong password response."""
        response = api_client.post(
            "/api/v1/auth/login",
            {"email": "ghost@example.com", "password": "Whatever123!"},
            format="json",
        )
        assert response.status_code == 401
        assert response.json()["error"] == {
            "code": "INVALID_CREDENTIALS",
            "message": "Invalid email or password.",
            "fields": None,
        }


class TestRefreshAndLogout:
    def test_refresh_via_body_rotates_token(self, api_client, user):
        data = api_client.post("/api/v1/auth/login", SIGNUP_PAYLOAD | {"email": user.email}, format="json").json()["data"]
        old_refresh = data["refresh"]

        response = api_client.post("/api/v1/auth/refresh", {"refresh": old_refresh}, format="json")
        assert response.status_code == 200
        assert response.json()["data"]["access"]
        assert response.json()["data"]["refresh"] != old_refresh

        # Rotation + blacklist: the old token can never be used again.
        replay = api_client.post("/api/v1/auth/refresh", {"refresh": old_refresh}, format="json")
        assert replay.status_code == 401
        assert replay.json()["error"]["code"] == "INVALID_REFRESH_TOKEN"

    def test_refresh_via_httponly_cookie(self, api_client, user):
        login = api_client.post(
            "/api/v1/auth/login",
            {"email": user.email, "password": "StrongPassword123!"},
            format="json",
        )
        response = api_client.post("/api/v1/auth/refresh")  # body absent → cookie
        assert response.status_code == 200
        assert response.cookies["pulse_refresh_token"].value != login.cookies["pulse_refresh_token"].value

    def test_refresh_with_garbage_token(self, api_client):
        response = api_client.post("/api/v1/auth/refresh", {"refresh": "garbage"}, format="json")
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "INVALID_REFRESH_TOKEN"

    def test_logout_blacklists_and_clears_cookie(self, api_client, user):
        api_client.post(
            "/api/v1/auth/login",
            {"email": user.email, "password": "StrongPassword123!"},
            format="json",
        )
        response = api_client.post("/api/v1/auth/logout")
        assert response.status_code == 204
        assert response.cookies["pulse_refresh_token"].value == ""

        replay = api_client.post("/api/v1/auth/refresh")
        assert replay.status_code == 401


class TestMe:
    def test_me_authenticated(self, auth_client, user):
        response = auth_client(user).get("/api/v1/auth/me")
        assert response.status_code == 200
        assert response.json()["data"]["email"] == user.email

    def test_me_unauthenticated(self, api_client):
        response = api_client.get("/api/v1/auth/me")
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "UNAUTHORIZED"
