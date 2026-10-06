from django.urls import path

from apps.invitations.presentation import views

urlpatterns = [
    path(
        "workspaces/<uuid:workspace_id>/invitations",
        views.InvitationListCreateView.as_view(),
        name="invitation-list",
    ),
    path(
        "workspaces/<uuid:workspace_id>/invitations/<uuid:pk>",
        views.InvitationDeleteView.as_view(),
        name="invitation-delete",
    ),
    path(
        "invitations/<str:token>/accept",
        views.AcceptInvitationView.as_view(),
        name="invitation-accept",
    ),
]
