from __future__ import annotations

from datetime import timedelta
from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.exceptions import ForbiddenError, NotFoundError
from apps.common.responses import envelope, no_content
from apps.common.services.email import send_invitation_email
from apps.invitations.infrastructure.models import DjangoInvitationRepository
from apps.projects.infrastructure.models import (
    Project,
    ProjectMember,
    ProjectRole,
    Task,
)
from apps.projects.presentation.serializers import (
    ProjectCreateSerializer,
    ProjectMemberAssignSerializer,
    ProjectMemberSerializer,
    ProjectSerializer,
    TaskSerializer,
)
from apps.users.infrastructure.models import User
from apps.workspaces.infrastructure.models import Workspace, WorkspaceMember


def _check_workspace_access(workspace: Workspace, user: User) -> WorkspaceMember:
    member = WorkspaceMember.objects.filter(workspace=workspace, user=user).first()
    if not member:
        raise NotFoundError("Workspace not found or access denied.")
    return member


class ProjectListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, workspace_id: str) -> Response:
        workspace = get_object_or_404(Workspace, id=workspace_id)
        _check_workspace_access(workspace, request.user)
        projects = Project.objects.filter(workspace=workspace).prefetch_related("members__user", "tasks")
        return envelope(ProjectSerializer(projects, many=True).data)

    def post(self, request: Request, workspace_id: str) -> Response:
        workspace = get_object_or_404(Workspace, id=workspace_id)
        _check_workspace_access(workspace, request.user)

        data = request.data.copy()
        data["workspace_id"] = str(workspace.id)
        serializer = ProjectCreateSerializer(data=data)
        serializer.is_valid(raise_exception=True)

        validated = serializer.validated_data
        name = validated["name"]
        key = validated["key"]
        description = validated.get("description", "")
        status_val = validated.get("status", "active")
        initial_members = validated.get("initial_members", [])

        if Project.objects.filter(workspace=workspace, key=key).exists():
            return Response(
                {"error": {"code": "KEY_EXISTS", "message": f"Project key '{key}' already exists in this workspace."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            project = Project.objects.create(
                workspace=workspace,
                name=name,
                key=key,
                description=description,
                status=status_val,
                created_by=request.user,
            )
            # Creator is automatically an OWNER member of this project
            ProjectMember.objects.create(
                project=project,
                user=request.user,
                role=ProjectRole.OWNER,
            )

            # Process initial members to invite / assign roles
            invitation_repo = DjangoInvitationRepository()
            inviter_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email

            for member_info in initial_members:
                email = member_info["email"].strip().lower()
                role_val = member_info.get("role", ProjectRole.DEVELOPER)

                target_user = User.objects.filter(email=email).first()
                if target_user:
                    # Ensure they are in the workspace
                    if not WorkspaceMember.objects.filter(workspace=workspace, user=target_user).exists():
                        WorkspaceMember.objects.create(
                            workspace=workspace,
                            user=target_user,
                            role="MEMBER",
                        )
                    ProjectMember.objects.get_or_create(
                        project=project,
                        user=target_user,
                        defaults={"role": role_val},
                    )
                else:
                    # User doesn't exist yet: send invitation via SMTP
                    ttl_days = getattr(settings, "INVITATION_TTL_DAYS", 7)
                    from django.utils import timezone

                    inv = invitation_repo.create(
                        workspace_id=workspace.id,
                        email=email,
                        role="MEMBER",
                        invited_by=request.user,
                        expires_at=timezone.now() + timedelta(days=ttl_days),
                    )
                    send_invitation_email(
                        to_email=email,
                        workspace_name=f"{workspace.name} (Project: {project.name})",
                        inviter_name=inviter_name,
                        role=role_val,
                        token=inv.token,
                    )

        return envelope(ProjectSerializer(project).data, message="Project created successfully.", status=201)


class ProjectDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk: str) -> Response:
        project = get_object_or_404(Project.objects.prefetch_related("members__user", "tasks"), id=pk)
        _check_workspace_access(project.workspace, request.user)
        return envelope(ProjectSerializer(project).data)

    def patch(self, request: Request, pk: str) -> Response:
        project = get_object_or_404(Project, id=pk)
        _check_workspace_access(project.workspace, request.user)
        for field in ["name", "description", "status"]:
            if field in request.data:
                setattr(project, field, request.data[field])
        project.save()
        return envelope(ProjectSerializer(project).data, message="Project updated.")

    def delete(self, request: Request, pk: str) -> Response:
        project = get_object_or_404(Project, id=pk)
        _check_workspace_access(project.workspace, request.user)
        project.delete()
        return no_content()


class ProjectMemberManageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, project_id: str) -> Response:
        project = get_object_or_404(Project, id=project_id)
        _check_workspace_access(project.workspace, request.user)
        members = ProjectMember.objects.filter(project=project).select_related("user")
        return envelope(ProjectMemberSerializer(members, many=True).data)

    def post(self, request: Request, project_id: str) -> Response:
        project = get_object_or_404(Project, id=project_id)
        _check_workspace_access(project.workspace, request.user)

        serializer = ProjectMemberAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        role = validated["role"]
        email = validated.get("email")
        user_id = validated.get("user_id")

        target_user = None
        if user_id:
            target_user = User.objects.filter(id=user_id).first()
        elif email:
            target_user = User.objects.filter(email=email.strip().lower()).first()

        if target_user:
            # Ensure workspace membership
            if not WorkspaceMember.objects.filter(workspace=project.workspace, user=target_user).exists():
                WorkspaceMember.objects.create(
                    workspace=project.workspace,
                    user=target_user,
                    role="MEMBER",
                )
            membership, _ = ProjectMember.objects.update_or_create(
                project=project,
                user=target_user,
                defaults={"role": role},
            )
            return envelope(ProjectMemberSerializer(membership).data, message=f"Assigned role {role} to {target_user.email}")

        if email:
            # Unregistered user: dispatch SMTP invite
            clean_email = email.strip().lower()
            invitation_repo = DjangoInvitationRepository()
            from django.utils import timezone
            ttl_days = getattr(settings, "INVITATION_TTL_DAYS", 7)
            inv = invitation_repo.create(
                workspace_id=project.workspace.id,
                email=clean_email,
                role="MEMBER",
                invited_by=request.user,
                expires_at=timezone.now() + timedelta(days=ttl_days),
            )
            inviter_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email
            send_invitation_email(
                to_email=clean_email,
                workspace_name=f"{project.workspace.name} ({project.name})",
                inviter_name=inviter_name,
                role=role,
                token=inv.token,
            )
            return envelope({"invited": True, "email": clean_email, "role": role}, message="Invitation email sent.")

        return Response({"error": {"code": "INVALID_INPUT", "message": "Provide either user_id or email."}}, status=400)


class TaskListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, project_id: str) -> Response:
        project = get_object_or_404(Project, id=project_id)
        _check_workspace_access(project.workspace, request.user)
        tasks = Task.objects.filter(project=project).select_related("assignee", "project")
        return envelope(TaskSerializer(tasks, many=True).data)

    def post(self, request: Request, project_id: str) -> Response:
        project = get_object_or_404(Project, id=project_id)
        _check_workspace_access(project.workspace, request.user)

        data = request.data.copy()
        serializer = TaskSerializer(data=data)
        serializer.is_valid(raise_exception=True)

        assignee = None
        assignee_id = serializer.validated_data.get("assignee_id")
        if assignee_id:
            assignee = User.objects.filter(id=assignee_id).first()

        task = Task.objects.create(
            project=project,
            title=serializer.validated_data["title"],
            description=serializer.validated_data.get("description", ""),
            status=serializer.validated_data.get("status", "todo"),
            priority=serializer.validated_data.get("priority", "medium"),
            progress=serializer.validated_data.get("progress", 0),
            role_required=serializer.validated_data.get("role_required", ProjectRole.DEVELOPER),
            assignee=assignee,
            created_by=request.user,
        )
        return envelope(TaskSerializer(task).data, message="Task created.", status=201)


class TaskDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk: str) -> Response:
        task = get_object_or_404(Task.objects.select_related("assignee", "project__workspace"), id=pk)
        _check_workspace_access(task.project.workspace, request.user)
        return envelope(TaskSerializer(task).data)

    def patch(self, request: Request, pk: str) -> Response:
        task = get_object_or_404(Task.objects.select_related("project__workspace"), id=pk)
        _check_workspace_access(task.project.workspace, request.user)

        for field in ["title", "description", "status", "priority", "role_required"]:
            if field in request.data:
                setattr(task, field, request.data[field])

        if "progress" in request.data:
            try:
                pct = int(request.data["progress"])
                task.progress = max(0, min(100, pct))
                if task.progress == 100:
                    task.status = "done"
            except (ValueError, TypeError):
                pass

        if "assignee_id" in request.data:
            aid = request.data["assignee_id"]
            task.assignee = User.objects.filter(id=aid).first() if aid else None

        task.save()
        return envelope(TaskSerializer(task).data, message="Task updated.")

    def delete(self, request: Request, pk: str) -> Response:
        task = get_object_or_404(Task.objects.select_related("project__workspace"), id=pk)
        _check_workspace_access(task.project.workspace, request.user)
        task.delete()
        return no_content()


class AllWorkspaceTasksView(APIView):
    """List all tasks across all projects of a workspace."""
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, workspace_id: str) -> Response:
        workspace = get_object_or_404(Workspace, id=workspace_id)
        _check_workspace_access(workspace, request.user)
        tasks = Task.objects.filter(project__workspace=workspace).select_related("assignee", "project")
        return envelope(TaskSerializer(tasks, many=True).data)
