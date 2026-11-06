"""Regresiones de la verificación: seguridad de uploads, entradas malformadas y paridad fina con Rails."""

import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from apps.accounts.models import User
from apps.chat.models import Channel
from tests.conftest import FIXTURES_DIR, auth, create_user


def _png_bytes(size=(4, 4)):
    buffer = io.BytesIO()
    Image.new("RGB", size, "red").save(buffer, format="PNG")
    return buffer.getvalue()


# --- XSS por avatar / imagen de workspace
@pytest.mark.parametrize("filename", ["poc.html", "poc.svg", "poc.png.html"])
def test_avatar_con_extension_peligrosa_se_guarda_como_png(client, fx, filename):
    polyglot = _png_bytes() + b"<script>alert(document.domain)</script>"
    upload = SimpleUploadedFile(filename, polyglot, content_type="text/html")
    response = client.patch("/api/v1/profile", {"avatar": upload}, format="multipart", **auth(fx.bob))

    assert response.status_code == 200
    url = response.json()["avatar_url"]
    assert url.startswith("/media/avatars/") and url.endswith(".png")
    assert "poc" not in url

    served = client.get(url)
    assert served.status_code == 200
    assert served["Content-Type"] == "image/png"
    assert served["Content-Security-Policy"] == "default-src 'none'; sandbox"
    assert served["X-Content-Type-Options"] == "nosniff"


def test_imagen_de_workspace_tambien_se_renombra(client, fx):
    upload = SimpleUploadedFile("logo.svg", _png_bytes(), content_type="image/svg+xml")
    response = client.post("/api/v1/workspaces", {"name": "Logo", "image": upload}, **auth(fx.alice))
    assert response.status_code == 201
    assert response.json()["image_url"].endswith(".png")


def test_bomba_de_descompresion_da_422(client, fx):
    huge = _png_bytes(size=(8000, 8000))  # 64 Mpx: supera el límite de píxeles
    upload = SimpleUploadedFile("big.png", huge, content_type="image/png")
    response = client.patch("/api/v1/profile", {"avatar": upload}, format="multipart", **auth(fx.bob))
    assert response.status_code == 422
    assert response.json() == {"errors": ["Avatar no es una imagen válida"]}


def test_avatar_demasiado_pesado_da_422(client, fx, settings):
    settings.MAX_IMAGE_SIZE_MB = 0
    with open(FIXTURES_DIR / "avatar.png", "rb") as avatar:
        response = client.patch("/api/v1/profile", {"avatar": avatar}, format="multipart", **auth(fx.bob))
    assert response.status_code == 422
    assert response.json() == {"errors": ["Avatar es demasiado grande (máximo 0 MB)"]}


def test_avatar_vacio_quita_el_avatar(client, fx):
    with open(FIXTURES_DIR / "avatar.png", "rb") as avatar:
        client.patch("/api/v1/profile", {"avatar": avatar}, format="multipart", **auth(fx.bob))
    response = client.patch("/api/v1/profile", {"avatar": ""}, format="multipart", **auth(fx.bob))
    assert response.status_code == 200
    assert response.json()["avatar_url"] is None


def test_path_traversal_en_media_da_404_json(client, db):
    response = client.get("/media/../private_media/x")
    assert response.status_code == 404


# --- entradas malformadas: 422 y no 500
@pytest.mark.parametrize("bad", [123, ["x"], {"a": 1}, True])
def test_register_con_tipos_invalidos_da_422(client, db, bad):
    for field in ("name", "email", "password"):
        payload = {"name": "Ok", "email": "ok@example.com", "password": "password123", field: bad}
        response = client.post("/api/v1/register", payload, format="json")
        assert response.status_code == 422, (field, bad)
        assert response.json()["errors"]
    assert not User.objects.filter(email="ok@example.com").exists()


@pytest.mark.parametrize("bad", [["public"], {"a": 1}, 5])
def test_crear_canal_con_kind_o_name_invalido_da_422(client, fx, bad):
    url = f"/api/v1/workspaces/{fx.acme.id}/channels"
    assert client.post(url, {"name": "x", "kind": bad}, format="json", **auth(fx.alice)).status_code == 422
    assert client.post(url, {"name": bad}, format="json", **auth(fx.alice)).status_code == 422


def test_mensaje_con_body_no_string_da_422(client, fx):
    url = f"/api/v1/channels/{fx.general.id}/messages"
    assert client.post(url, {"body": {"x": 1}}, format="json", **auth(fx.alice)).status_code == 422


def test_login_con_email_no_string_da_401(client, fx):
    response = client.post("/api/v1/login", {"email": ["a"], "password": "x"}, format="json")
    assert response.status_code == 401


def test_nombre_demasiado_largo_da_422(client, fx):
    response = client.patch("/api/v1/profile", {"name": "x" * 256}, format="json", **auth(fx.bob))
    assert response.status_code == 422
    assert response.json() == {"errors": ["Nombre es demasiado largo (255 caracteres máximo)"]}


def test_request_demasiado_grande_da_413(client, fx, settings):
    settings.MAX_REQUEST_SIZE_MB = 0
    response = client.post(f"/api/v1/channels/{fx.general.id}/messages", {"body": "hola"}, **auth(fx.alice))
    assert response.status_code == 413


def test_adjunto_ejecutable_da_422(client, fx):
    upload = SimpleUploadedFile("virus.exe", b"MZ...", content_type="application/octet-stream")
    response = client.post(
        f"/api/v1/channels/{fx.general.id}/messages", {"body": "x", "files": [upload]}, **auth(fx.alice)
    )
    assert response.status_code == 422
    assert response.json() == {"errors": ["Archivo virus.exe tiene un tipo no permitido"]}


# --- paridad fina con Rails (validaciones de User)
def test_orden_de_errores_como_rails(client, db):
    response = client.post("/api/v1/register", {"name": "", "email": "a@b.com", "password": "corta"}, format="json")
    assert response.json()["errors"] == [
        "Nombre no puede estar en blanco",
        "Contraseña es demasiado corto (8 caracteres mínimo)",
    ]


def test_email_con_espacios_no_es_valido(client, db):
    response = client.post(
        "/api/v1/register", {"name": "A", "email": " a@b.com", "password": "password123"}, format="json"
    )
    assert response.status_code == 422
    assert response.json() == {"errors": ["Email no es válido"]}


def test_contrasena_de_solo_espacios_es_valida_como_en_rails(client, db):
    response = client.post("/api/v1/register", {"name": "A", "email": "a@b.com", "password": " " * 8}, format="json")
    assert response.status_code == 201


# --- PUT como en `resources` de Rails
def test_put_actualiza_workspace_y_canal(client, fx):
    ws = client.put(f"/api/v1/workspaces/{fx.acme.id}", {"name": "Put"}, format="json", **auth(fx.alice))
    ch = client.put(f"/api/v1/channels/{fx.general.id}", {"name": "put"}, format="json", **auth(fx.alice))
    assert ws.status_code == ch.status_code == 200


# --- condiciones de carrera
def test_integrity_error_se_traduce_a_422(client, fx, monkeypatch):
    monkeypatch.setattr(Channel, "validate", lambda self: None)  # simula dos requests que pasaron la validación
    response = client.post(f"/api/v1/workspaces/{fx.acme.id}/channels", {"name": "general"}, **auth(fx.alice))
    assert response.status_code == 422
    assert response.json() == {"errors": ["El registro ya existe"]}


def test_direct_between_no_duplica(fx):
    carol = create_user("Carol", "carol@example.com")
    fx.acme.memberships.create(user=carol, role="member")
    channels = {Channel.direct_between(fx.acme, fx.alice, carol).id for _ in range(3)}
    assert len(channels) == 1
