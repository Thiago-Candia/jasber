"""Back-office (Django Admin), seeds y health check."""

from django.core.management import call_command
from django.test import Client

from apps.accounts.models import User
from apps.chat.models import Message
from apps.workspaces.models import Workspace
from tests.conftest import create_user


def test_health(db):
    assert Client().get("/up").status_code == 200


def test_seed_es_idempotente(db):
    call_command("seed")
    call_command("seed")
    assert User.objects.count() == 2
    assert Workspace.objects.get().name == "Equipo Jasber"
    assert Message.objects.count() == 2
    admin = User.objects.get(email="admin@example.com")
    assert admin.admin and admin.check_password("password123")


def test_admin_solo_para_usuarios_admin(db):
    create_user("Admin", "admin@example.com", admin=True)
    create_user("Ana", "ana@example.com")

    web = Client()
    assert not web.login(username="ana@example.com", password="password123") or web.get("/admin/").status_code == 302

    web = Client()
    assert web.login(username="ADMIN@example.com", password="password123")
    dashboard = web.get("/admin/")
    assert dashboard.status_code == 200
    assert "Usuarios" in dashboard.content.decode()
    for url in (
        "/admin/accounts/user/",
        "/admin/workspaces/workspace/",
        "/admin/chat/channel/",
        "/admin/chat/message/",
    ):
        assert web.get(url).status_code == 200, url


def test_un_usuario_comun_no_entra_al_admin(db):
    create_user("Ana", "ana@example.com")
    web = Client()
    response = web.post("/admin/login/", {"username": "ana@example.com", "password": "password123"})
    assert response.status_code == 200  # vuelve a mostrar el login con error
    assert web.get("/admin/").status_code == 302
