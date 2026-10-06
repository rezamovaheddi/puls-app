"""factory_boy factories for tests."""

from __future__ import annotations

import factory

from apps.users.infrastructure.models import User
from apps.workspaces.domain import WorkspaceRole
from apps.workspaces.infrastructure.models import Workspace


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ["email"]

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    password = factory.PostGenerationMethodCall("set_password", "StrongPassword123!")


class WorkspaceFactory(factory.django.DjangoModelFactory):
    """Creates the workspace AND its OWNER membership (mirrors the use case)."""

    class Meta:
        model = Workspace

    name = factory.Sequence(lambda n: f"Workspace {n}")
    slug = factory.Sequence(lambda n: f"workspace-{n}")
    owner = factory.SubFactory(UserFactory)

    @factory.post_generation
    def owner_membership(self, create, extracted, **kwargs):
        from apps.workspaces.infrastructure.models import WorkspaceMember

        WorkspaceMember.objects.create(
            workspace=self, user=self.owner, role=WorkspaceRole.OWNER
        )
        if not create:
            return
