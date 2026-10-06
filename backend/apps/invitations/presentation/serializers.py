"""Input/output shaping for the invitations app.

The token is ONLY returned to the inviter at creation time (this phase has
no email delivery — the inviter shares the accept link out-of-band). List
and detail payloads deliberately omit it.
"""

from __future__ import annotations

from rest_framework import serializers

from apps.invitations import domain as invitation_rules
from apps.invitations.infrastructure.models import Invitation


class InvitationSerializer(serializers.ModelSerializer):
    invited_by = serializers.UUIDField(source="invited_by_id", read_only=True)
    workspace_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = Invitation
        fields = [
            "id",
            "workspace_id",
            "email",
            "role",
            "status",
            "expires_at",
            "created_at",
            "invited_by",
        ]
        read_only_fields = fields


class InvitationCreatedSerializer(InvitationSerializer):
    token = serializers.CharField(read_only=True)

    class Meta(InvitationSerializer.Meta):
        fields = [*InvitationSerializer.Meta.fields, "token"]


class InvitationCreateSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    role = serializers.ChoiceField(choices=invitation_rules.INVITABLE_ROLES)

    def validate_email(self, value: str) -> str:
        from apps.users.domain import normalize_email

        return normalize_email(value)
