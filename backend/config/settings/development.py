"""Development settings — verbose, permissive, local-friendly."""

from .base import *  # noqa: F401,F403
from .base import env_bool

DEBUG = env_bool("DJANGO_DEBUG", default=True)
