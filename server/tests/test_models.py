"""Port de test/models/*_test.rb."""

import pytest

from apps.accounts.models import User
from apps.chat.models import Channel, Message
from apps.core.validation import ValidationFailed
from apps.workspaces.models import Workspace
from tests.conftest import create_user


def _user(name, email, password):
    user = User(name=name, email=email)
    user.set_password(password)
    return user


# --- User
def test_user_es_valido_con_nombre_email_y_contrasena(fx):
    _user("Nueva", "nueva@example.com", "password123").validate()


def test_user_requiere_email_unico_sin_distinguir_mayusculas(fx):
    with pytest.raises(ValidationFailed) as exc:
        _user("Duplicado", fx.alice.email.upper(), "password123").validate()
    assert "Email ya está en uso" in exc.value.errors


def test_user_normaliza_el_email_a_minusculas(db):
    assert create_user("Mayus", "MAYUS@Example.com").email == "mayus@example.com"


def test_user_requiere_contrasena_de_al_menos_8_caracteres(db):
    with pytest.raises(ValidationFailed) as exc:
        _user("Corta", "corta@example.com", "1234567").validate()
    assert exc.value.errors == ["Contraseña es demasiado corto (8 caracteres mínimo)"]


def test_user_requiere_nombre_y_email_valido(db):
    with pytest.raises(ValidationFailed) as exc:
        _user("", "no-es-email", "password123").validate()
    assert exc.value.errors == ["Nombre no puede estar en blanco", "Email no es válido"]


def test_user_acepta_hash_bcrypt_heredado_de_rails(db):
    import bcrypt

    user = create_user("Legacy", "legacy@example.com")
    User.objects.filter(pk=user.pk).update(password=bcrypt.hashpw(b"password123", bcrypt.gensalt(4)).decode())
    user.refresh_from_db()
    assert user.check_password("password123")
    user.refresh_from_db()
    assert not user.password.startswith("$2")  # quedó re-hasheada con el hasher de Django


# --- Workspace
def test_workspace_requiere_nombre(fx):
    with pytest.raises(ValidationFailed):
        Workspace(owner=fx.alice, name="").validate()


def test_workspace_genera_invite_token_al_crearse(fx):
    assert Workspace.objects.create(name="Nuevo", owner=fx.alice).invite_token


def test_workspace_regenerate_invite_token_cambia_el_token(fx):
    original = fx.acme.invite_token
    fx.acme.regenerate_invite_token()
    assert fx.acme.invite_token != original


# --- Channel
def test_channel_no_permite_dos_canales_con_el_mismo_nombre(fx):
    with pytest.raises(ValidationFailed):
        Channel(workspace=fx.acme, name="GENERAL", kind="public").validate()


def test_direct_between_reutiliza_el_canal_existente(fx):
    first = Channel.direct_between(fx.acme, fx.alice, fx.bob)
    second = Channel.direct_between(fx.acme, fx.bob, fx.alice)
    assert first == second


def test_direct_between_consigo_mismo_se_reutiliza_y_no_mezcla_dms(fx):
    pair = Channel.direct_between(fx.acme, fx.alice, fx.bob)
    self_dm = Channel.direct_between(fx.acme, fx.alice, fx.alice)
    assert self_dm != pair
    assert Channel.direct_between(fx.acme, fx.alice, fx.alice) == self_dm


def test_accessible_by(fx):
    outsider = create_user("Ajeno", "ajeno@example.com")
    private = Channel.objects.create(workspace=fx.acme, name="privado", kind="private")
    assert set(Channel.objects.accessible_by(fx.bob)) == {fx.general}
    assert not Channel.objects.accessible_by(outsider).exists()
    private.channel_memberships.create(user=fx.bob)
    assert set(Channel.objects.accessible_by(fx.bob)) == {fx.general, private}


# --- Message
def test_message_requiere_contenido(fx):
    with pytest.raises(ValidationFailed) as exc:
        Message(channel=fx.general, user=fx.alice, body="").validate()
    assert exc.value.errors == ["Mensaje no puede estar en blanco"]
