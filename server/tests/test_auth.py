"""Port de sessions_controller_test, users_controller_test e integration/profile_avatar_test.

Incluye además los flujos de logout, perfil y recuperación de contraseña.
"""

from datetime import timedelta

from django.core import mail
from django.utils import timezone

from apps.accounts.models import User
from apps.core.tokens import encode
from tests.conftest import FIXTURES_DIR, auth, create_user


# --- login / logout
def test_login_con_credenciales_validas_devuelve_token(client, fx):
    response = client.post("/api/v1/login", {"email": fx.alice.email, "password": "password123"})
    assert response.status_code == 200
    body = response.json()
    assert body["token"]
    assert body["user"] == {"id": fx.alice.id, "name": "Alice Owner", "email": "alice@example.com", "avatar_url": None}


def test_login_ignora_mayusculas_en_el_email(client, fx):
    response = client.post("/api/v1/login", {"email": "ALICE@example.com", "password": "password123"}, format="json")
    assert response.status_code == 200


def test_login_con_contrasena_incorrecta_devuelve_401(client, fx):
    response = client.post("/api/v1/login", {"email": fx.alice.email, "password": "incorrecta"})
    assert response.status_code == 401
    assert response.json() == {"errors": ["Email o contraseña inválidos"]}


def test_login_funciona_aunque_venga_un_token_vencido(client, fx):
    response = client.post(
        "/api/v1/login",
        {"email": fx.alice.email, "password": "password123"},
        HTTP_AUTHORIZATION="Bearer basura",
    )
    assert response.status_code == 200


def test_logout_devuelve_204(client):
    assert client.delete("/api/v1/logout").status_code == 204


# --- register
def test_registra_un_usuario_nuevo_y_devuelve_token(client, fx):
    before = User.objects.count()
    response = client.post(
        "/api/v1/register", {"name": "Nuevo", "email": "nuevo@example.com", "password": "password123"}
    )
    assert response.status_code == 201
    assert response.json()["token"]
    assert User.objects.count() == before + 1


def test_register_acepta_username_como_alias_de_name(client, db):
    response = client.post(
        "/api/v1/register",
        {"username": "Alias", "email": "alias@example.com", "password": "password123"},
        format="json",
    )
    assert response.status_code == 201
    assert response.json()["user"]["name"] == "Alias"


def test_no_registra_un_usuario_con_email_repetido(client, fx):
    before = User.objects.count()
    response = client.post("/api/v1/register", {"name": "Repetido", "email": fx.alice.email, "password": "password123"})
    assert response.status_code == 422
    assert response.json() == {"errors": ["Email ya está en uso"]}
    assert User.objects.count() == before


def test_register_sin_datos_devuelve_errores(client, db):
    response = client.post("/api/v1/register", {}, format="json")
    assert response.status_code == 422
    assert response.json()["errors"] == [
        "Contraseña no puede estar en blanco",
        "Nombre no puede estar en blanco",
        "Email no puede estar en blanco",
        "Email no es válido",
    ]


# --- autenticación
def test_token_vencido_devuelve_401(client, fx):
    expired = encode({"user_id": fx.alice.id}, expires_at=timezone.now() - timedelta(minutes=1))
    response = client.get("/api/v1/profile", HTTP_AUTHORIZATION=f"Bearer {expired}")
    assert response.status_code == 401
    assert response.json() == {"errors": ["No autorizado"]}


def test_token_de_usuario_inexistente_devuelve_401(client, db):
    response = client.get("/api/v1/profile", HTTP_AUTHORIZATION=f"Bearer {encode({'user_id': 999})}")
    assert response.status_code == 401


# --- perfil
def test_profile_devuelve_el_usuario_actual(client, fx):
    response = client.get("/api/v1/profile", **auth(fx.bob))
    assert response.status_code == 200
    assert response.json()["email"] == "bob@example.com"


def test_profile_actualiza_el_nombre(client, fx):
    response = client.patch("/api/v1/profile", {"name": "Bob Nuevo"}, format="json", **auth(fx.bob))
    assert response.status_code == 200
    fx.bob.refresh_from_db()
    assert fx.bob.name == "Bob Nuevo"


def test_profile_no_acepta_nombre_vacio(client, fx):
    response = client.patch("/api/v1/profile", {"name": ""}, format="json", **auth(fx.bob))
    assert response.status_code == 422
    assert response.json() == {"errors": ["Nombre no puede estar en blanco"]}


def test_sube_un_avatar_real_y_lo_devuelve_en_el_serializer(client, db):
    user = create_user("Ana", "ana@example.com")
    with open(FIXTURES_DIR / "avatar.png", "rb") as avatar:
        response = client.patch("/api/v1/profile", {"avatar": avatar}, format="multipart", **auth(user))

    assert response.status_code == 200
    user.refresh_from_db()
    assert user.avatar
    assert response.json()["avatar_url"].startswith("/media/avatars/")
    assert client.get(response.json()["avatar_url"]).status_code == 200


def test_rechaza_un_avatar_que_no_es_imagen(client, db, tmp_path):
    user = create_user("Ana", "ana@example.com")
    fake = tmp_path / "evil.html"
    fake.write_text("<script>alert(1)</script>")
    with open(fake, "rb") as upload:
        response = client.patch("/api/v1/profile", {"avatar": upload}, format="multipart", **auth(user))
    assert response.status_code == 422
    assert response.json() == {"errors": ["Avatar no es una imagen válida"]}


# --- recuperación de contraseña
def test_password_reset_envia_el_mail_y_no_revela_si_el_email_existe(client, fx, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        existing = client.post("/api/v1/password-resets", {"email": "ALICE@example.com"}, format="json")
    missing = client.post("/api/v1/password-resets", {"email": "nadie@example.com"}, format="json")

    expected = {"message": "Si el email existe, se generó un enlace"}
    assert existing.status_code == missing.status_code == 200
    assert existing.json() == missing.json() == expected

    fx.alice.refresh_from_db()
    assert len(mail.outbox) == 1
    sent = mail.outbox[0]
    assert sent.subject == "Restablecimiento de contraseña"
    assert sent.to == ["alice@example.com"]
    assert f"/rewrite-password?reset_token={fx.alice.reset_password_token}" in sent.body


def test_password_reset_actualiza_la_contrasena(client, fx):
    fx.alice.reset_password_token = "token-valido"
    fx.alice.reset_password_sent_at = timezone.now()
    fx.alice.save()

    response = client.patch("/api/v1/password-resets/token-valido", {"password": "nueva-clave-123"}, format="json")
    assert response.status_code == 200
    assert response.json() == {"message": "Contraseña actualizada"}

    fx.alice.refresh_from_db()
    assert fx.alice.check_password("nueva-clave-123")
    assert fx.alice.reset_password_token is None
    assert (
        client.patch("/api/v1/password-resets/token-valido", {"password": "otra-clave-123"}, format="json").status_code
        == 422
    )


def test_password_reset_vencido_o_invalido(client, fx):
    fx.alice.reset_password_token = "token-viejo"
    fx.alice.reset_password_sent_at = timezone.now() - timedelta(hours=3)
    fx.alice.save()

    for token in ("token-viejo", "no-existe"):
        response = client.patch(f"/api/v1/password-resets/{token}", {"password": "nueva-clave-123"}, format="json")
        assert response.status_code == 422
        assert response.json() == {"errors": ["Enlace inválido o expirado"]}


def test_password_reset_con_contrasena_corta_no_consume_el_token(client, fx):
    fx.alice.reset_password_token = "token-valido"
    fx.alice.reset_password_sent_at = timezone.now()
    fx.alice.save()

    response = client.patch("/api/v1/password-resets/token-valido", {"password": "corta"}, format="json")
    assert response.status_code == 422
    assert response.json() == {"errors": ["Contraseña es demasiado corto (8 caracteres mínimo)"]}
    fx.alice.refresh_from_db()
    assert fx.alice.reset_password_token == "token-valido"
