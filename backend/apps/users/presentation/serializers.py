"""Input validation (API edge) and output shaping for the users app."""

from __future__ import annotations

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.users.domain import normalize_email


class SignupSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(max_length=128, write_only=True, trim_whitespace=False)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)

    def validate_email(self, value: str) -> str:
        return normalize_email(value)

    def validate_password(self, value: str) -> str:
        # Django's project password policy (length, common-password, numeric).
        validate_password(value)
        return value

    def validate_first_name(self, value: str) -> str:
        return value.strip()

    def validate_last_name(self, value: str) -> str:
        return value.strip()


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(max_length=128, write_only=True, trim_whitespace=False)

    def validate_email(self, value: str) -> str:
        return normalize_email(value)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        from apps.users.infrastructure.models import User

        model = User
        fields = ["id", "email", "first_name", "last_name", "created_at"]
        read_only_fields = fields
