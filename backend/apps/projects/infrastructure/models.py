from __future__ import annotations

import uuid

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class ProjectRole(models.TextChoices):
    OWNER = "OWNER", "Owner"
    LEAD = "LEAD", "Lead"
    DEVELOPER = "DEVELOPER", "Developer"
    VIEWER = "VIEWER", "Viewer"


class ProjectStatus(models.TextChoices):
    PLANNING = "planning", "Planning"
    ACTIVE = "active", "Active"
    PAUSED = "paused", "Paused"
    COMPLETED = "completed", "Completed"


class TaskStatus(models.TextChoices):
    TODO = "todo", "To Do"
    IN_PROGRESS = "in-progress", "In Progress"
    REVIEW = "review", "Review"
    DONE = "done", "Done"


class TaskPriority(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    URGENT = "urgent", "Urgent"


class Project(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "workspaces.Workspace",
        on_delete=models.CASCADE,
        related_name="projects",
    )
    name = models.CharField(max_length=128)
    key = models.CharField(max_length=10)
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=16,
        choices=ProjectStatus.choices,
        default=ProjectStatus.ACTIVE,
    )
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.PROTECT,
        related_name="created_projects",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "pulse_projects"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "key"],
                name="unique_project_key_per_workspace",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.key} - {self.name}"


class ProjectMember(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="members",
    )
    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="project_memberships",
    )
    role = models.CharField(
        max_length=16,
        choices=ProjectRole.choices,
        default=ProjectRole.DEVELOPER,
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pulse_project_members"
        constraints = [
            models.UniqueConstraint(
                fields=["project", "user"],
                name="unique_member_per_project",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} in {self.project.key} ({self.role})"


class Task(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="tasks",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=16,
        choices=TaskStatus.choices,
        default=TaskStatus.TODO,
    )
    priority = models.CharField(
        max_length=16,
        choices=TaskPriority.choices,
        default=TaskPriority.MEDIUM,
    )
    progress = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Progress completion percentage from 0 to 100",
    )
    assignee = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tasks",
    )
    role_required = models.CharField(
        max_length=16,
        choices=ProjectRole.choices,
        default=ProjectRole.DEVELOPER,
        help_text="Role assigned or designated for this task",
    )
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.PROTECT,
        related_name="created_tasks",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "pulse_tasks"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"[{self.project.key}] {self.title} ({self.progress}%)"
