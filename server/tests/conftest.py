"""Equivalente a test/test_helper.rb + test/fixtures/*.yml de Rails."""

from pathlib import Path
from types import SimpleNamespace

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.chat.models import Channel, ChannelMembership, Message
from apps.core.tokens import token_for
from apps.workspaces.models import Membership, Workspace

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture(autouse=True)
def _test_settings(settings, tmp_path):
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
    settings.MEDIA_ROOT = tmp_path / "media"
    settings.PRIVATE_MEDIA_ROOT = tmp_path / "private_media"
    settings.MAILERS = {"default": {"BACKEND": "django.core.mail.backends.locmem.EmailBackend"}}
    settings.EMAIL_ASYNC = False
    settings.CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}


def create_user(name, email, password="password123", **extra):
    user = User(name=name, email=email, **extra)
    user.set_password(password)
    user.save()
    return user


@pytest.fixture
def fx(db):
    """Los mismos fixtures que Rails: alice (dueña), bob (miembro), acme, #general y un mensaje."""
    alice = create_user("Alice Owner", "alice@example.com")
    bob = create_user("Bob Member", "bob@example.com")
    acme = Workspace.objects.create(name="Acme", owner=alice, invite_token="acme-invite-token")
    Membership.objects.create(user=alice, workspace=acme, role="owner")
    Membership.objects.create(user=bob, workspace=acme, role="member")
    general = Channel.objects.create(workspace=acme, name="general", kind="public")
    ChannelMembership.objects.create(user=alice, channel=general)
    ChannelMembership.objects.create(user=bob, channel=general)
    welcome = Message.objects.create(channel=general, user=alice, body="Bienvenidos al workspace")
    return SimpleNamespace(alice=alice, bob=bob, acme=acme, general=general, welcome=welcome)


@pytest.fixture
def client():
    return APIClient()


def auth(user):
    return {"HTTP_AUTHORIZATION": f"Bearer {token_for(user)}"}
