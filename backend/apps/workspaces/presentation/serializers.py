"""Input/output shaping for the workspaces app."""

from __future__ import annotations

from rest_framework import serializers

from apps.workspaces.infrastructure.models import Workspace


class WorkspaceSerializer(serializers.ModelSerializer):
    owner_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = Workspace
        fields = ["id", "name", "slug", "owner_id", "created_at"]
        read_only_fields = fields


class WorkspaceCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100, trim_whitespace=True)


class WorkspaceWithRoleSerializer(serializers.Serializer):
    """Workspace payload annotated with the requesting user's role."""

    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    slug = serializers.CharField(read_only=True)
    owner_id = serializers.UUIDField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    role = serializers.CharField(read_only=True)
