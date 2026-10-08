from django.urls import path

from apps.projects.presentation.views import (
    AllWorkspaceTasksView,
    ProjectDetailView,
    ProjectListCreateView,
    ProjectMemberManageView,
    TaskDetailView,
    TaskListCreateView,
)

urlpatterns = [
    path("workspaces/<uuid:workspace_id>/projects", ProjectListCreateView.as_view(), name="project-list-create"),
    path("workspaces/<uuid:workspace_id>/tasks", AllWorkspaceTasksView.as_view(), name="workspace-tasks-list"),
    path("projects/<uuid:pk>", ProjectDetailView.as_view(), name="project-detail"),
    path("projects/<uuid:project_id>/members", ProjectMemberManageView.as_view(), name="project-members"),
    path("projects/<uuid:project_id>/tasks", TaskListCreateView.as_view(), name="project-tasks"),
    path("tasks/<uuid:pk>", TaskDetailView.as_view(), name="task-detail"),
]
