from django.urls import path

from apps.workspaces.presentation import views

urlpatterns = [
    path("workspaces", views.WorkspaceListCreateView.as_view(), name="workspace-list"),
    path("workspaces/<uuid:pk>", views.WorkspaceDetailView.as_view(), name="workspace-detail"),
]
