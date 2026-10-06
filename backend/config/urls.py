"""URL configuration — everything is versioned under /api/v1/."""

from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

api_v1 = [
    path("auth/", include("apps.users.presentation.urls")),
    path("", include("apps.workspaces.presentation.urls")),
    path("", include("apps.invitations.presentation.urls")),
]

urlpatterns = [
    path("api/v1/", include(api_v1)),
    path("api/schema", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
]
