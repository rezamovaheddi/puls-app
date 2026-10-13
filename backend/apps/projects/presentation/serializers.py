from __future__ import annotations

from rest_framework import serializers

from apps.projects.infrastructure.models import (
    Project,
    ProjectMember,
    ProjectRole,
    ProjectStatus,
    Task,
    TaskStatus,
)
from apps.users.infrastructure.models import User


class SimpleUserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "name"]

    def get_name(self, obj: User) -> str:
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email


class ProjectMemberSerializer(serializers.ModelSerializer):
    user = SimpleUserSerializer(read_only=True)

    class Meta:
        model = ProjectMember
        fields = ["id", "user", "role", "assigned_at"]


class ProjectMemberAssignSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=False)
    email = serializers.EmailField(required=False)
    role = serializers.ChoiceField(choices=ProjectRole.choices)


class TaskSerializer(serializers.ModelSerializer):
    assignee = SimpleUserSerializer(read_only=True)
    assignee_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    project_key = serializers.CharField(source="project.key", read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "project",
            "project_key",
            "title",
            "description",
            "status",
            "priority",
            "progress",
            "assignee",
            "assignee_id",
            "role_required",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "project", "project_key", "created_at", "updated_at"]

    def validate_progress(self, value: int) -> int:
        if not (0 <= value <= 100):
            raise serializers.ValidationError("Progress must be between 0 and 100 percent.")
        return value


class ProjectSerializer(serializers.ModelSerializer):
    members = ProjectMemberSerializer(many=True, read_only=True)
    open_tasks = serializers.SerializerMethodField()
    total_tasks = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "workspace",
            "name",
            "key",
            "description",
            "status",
            "members",
            "open_tasks",
            "total_tasks",
            "progress",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "workspace", "created_at", "updated_at"]

    def get_open_tasks(self, obj: Project) -> int:
        return obj.tasks.exclude(status=TaskStatus.DONE).count()

    def get_total_tasks(self, obj: Project) -> int:
        return obj.tasks.count()

    def get_progress(self, obj: Project) -> int:
        tasks = obj.tasks.all()
        if not tasks.exists():
            return 0
        total_pct = sum(t.progress for t in tasks)
        return round(total_pct / tasks.count())


class MemberInviteInputSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=ProjectRole.choices, default=ProjectRole.DEVELOPER)


class ProjectCreateSerializer(serializers.Serializer):
    workspace_id = serializers.UUIDField()
    name = serializers.CharField(max_length=128)
    key = serializers.CharField(max_length=10)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    status = serializers.ChoiceField(choices=ProjectStatus.choices, default=ProjectStatus.ACTIVE)
    initial_members = MemberInviteInputSerializer(many=True, required=False, default=list)

    def validate_key(self, value: str) -> str:
        clean = value.strip().upper()
        if not clean.isalnum():
            raise serializers.ValidationError("Project key must be alphanumeric (e.g. CORE, PUL).")
        return clean
