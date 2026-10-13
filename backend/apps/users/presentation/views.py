"""Auth endpoints — thin views over use cases.

Authentication strategy (see backend/README.md): JWT pair; the refresh token
ALSO rides in an HttpOnly cookie scoped to /api/v1/auth/ so the Next.js app
can refresh without exposing the token to JS. Refresh/logout read the cookie
first and fall back to a JSON body token for non-browser API clients.
"""

from __future__ import annotations

from typing import Any

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.common.exceptions import InvalidRefreshTokenError
from apps.common.responses import envelope, no_content
from apps.users.application.ports import PasswordHasher, UserRepository
from apps.users.application.use_cases import (
    GetCurrentUser,
    LoginUser,
    RegisterUser,
)
from apps.users.infrastructure.repositories import (
    DjangoPasswordHasher,
    DjangoUserRepository,
)
from apps.users.presentation.serializers import (
    LoginSerializer,
    SignupSerializer,
    UserSerializer,
)


def build_container() -> tuple[UserRepository, PasswordHasher]:
    return DjangoUserRepository(), DjangoPasswordHasher()


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    from django.conf import settings

    response.set_cookie(
        settings.REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=settings.REFRESH_COOKIE_MAX_AGE,
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
        path="/api/v1/auth/",
    )


def clear_refresh_cookie(response: Response) -> None:
    from django.conf import settings

    response.delete_cookie(
        settings.REFRESH_COOKIE_NAME,
        path="/api/v1/auth/",
    )


def _refresh_from(request: Request) -> str | None:
    """Explicit body token wins over the implicit HttpOnly cookie: API
    clients that send a refresh in JSON get exactly what they sent, while
    browsers (no body) fall back to the cookie."""
    raw = request.data.get("refresh") if isinstance(request.data, dict) else None
    if isinstance(raw, str) and raw:
        return raw
    from django.conf import settings

    return request.COOKIES.get(settings.REFRESH_COOKIE_NAME)


def _issue_tokens(user: Any) -> tuple[str, str]:
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token), str(refresh)


def _load_user_from_token(token: RefreshToken) -> Any:
    from apps.common.exceptions import NotFoundError
    from apps.users.infrastructure.repositories import DjangoUserRepository

    user = DjangoUserRepository().get_by_id(token.payload.get("user_id"))
    if user is None or not user.is_active:
        raise NotFoundError("User for this token no longer exists.")
    return user


class AuthThrottledView(APIView):
    """Base for auth endpoints that share the `auth` throttle scope."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


class SignupView(AuthThrottledView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        users, hasher = build_container()
        user = RegisterUser(users, hasher).execute(**serializer.validated_data)

        access, refresh = _issue_tokens(user)
        response = envelope(
            {
                "user": UserSerializer(user).data,
                "access": access,
                "refresh": refresh,
            },
            message="Account created.",
            status=status.HTTP_201_CREATED,
        )
        set_refresh_cookie(response, refresh)
        return response


class LoginView(AuthThrottledView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        users, hasher = build_container()
        user = LoginUser(users, hasher).execute(**serializer.validated_data)

        access, refresh = _issue_tokens(user)
        response = envelope(
            {
                "user": UserSerializer(user).data,
                "access": access,
                "refresh": refresh,
            },
            message="Logged in.",
        )
        set_refresh_cookie(response, refresh)
        return response


class RefreshView(AuthThrottledView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        raw_refresh = _refresh_from(request)
        if not raw_refresh:
            raise InvalidRefreshTokenError("No refresh token provided.")
        try:
            token = RefreshToken(raw_refresh)
        except Exception as exc:  # TokenError + decode errors → same envelope
            raise InvalidRefreshTokenError from exc

        user = _load_user_from_token(token)
        # Rotation: retire the presented token before issuing a new pair.
        try:
            token.blacklist()
        except AttributeError:
            # Blacklist app disabled — accept non-rotating behavior.
            pass

        access, refresh = _issue_tokens(user)
        response = envelope({"access": access, "refresh": refresh}, message="Token refreshed.")
        set_refresh_cookie(response, refresh)
        return response


class LogoutView(AuthThrottledView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        raw_refresh = _refresh_from(request)
        response: Response
        if not raw_refresh:
            # Idempotent: nothing to revoke.
            response = no_content()
            clear_refresh_cookie(response)
            return response
        try:
            token = RefreshToken(raw_refresh)
        except Exception as exc:
            raise InvalidRefreshTokenError from exc
        try:
            token.blacklist()
        except AttributeError:
            pass
        response = no_content()
        clear_refresh_cookie(response)
        return response


class MeView(APIView):
    def get(self, request: Request) -> Response:
        user = GetCurrentUser(build_container()[0]).execute(user_id=request.user.id)
        return envelope(UserSerializer(user).data)
