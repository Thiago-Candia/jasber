"""Port de channels_controller_test, messages_controller_test y channel_access_test."""

from apps.chat.models import Channel, Message
from apps.workspaces.models import Membership
from tests.conftest import auth, create_user


def _member(fx, email):
    user = create_user(email, email)
    Membership.objects.create(user=user, workspace=fx.acme, role="member")
    return user


def assert_can_read_and_write(client, channel, user):
    assert client.get(f"/api/v1/channels/{channel.id}/messages", **auth(user)).status_code == 200
    before = channel.messages.count()
    assert client.post(f"/api/v1/channels/{channel.id}/messages", {"body": "Hola"}, **auth(user)).status_code == 201
    assert channel.messages.count() == before + 1


def assert_cannot_read_or_write(client, channel, user):
    assert client.get(f"/api/v1/channels/{channel.id}/messages", **auth(user)).status_code == 404
    before = channel.messages.count()
    assert client.post(f"/api/v1/channels/{channel.id}/messages", {"body": "Hola"}, **auth(user)).status_code == 404
    assert channel.messages.count() == before


# --- channels_controller_test.rb
def test_lista_los_canales_del_workspace(client, fx):
    response = client.get(f"/api/v1/workspaces/{fx.acme.id}/channels", **auth(fx.alice))
    assert response.status_code == 200
    assert response.json() == [{"id": fx.general.id, "name": "general", "kind": "public", "workspace_id": fx.acme.id}]


def test_crea_un_canal_dentro_del_workspace(client, fx):
    before = Channel.objects.count()
    response = client.post(f"/api/v1/workspaces/{fx.acme.id}/channels", {"name": "random"}, **auth(fx.alice))
    assert response.status_code == 201
    assert response.json()["kind"] == "public"
    assert Channel.objects.count() == before + 1
    assert Channel.objects.get(pk=response.json()["id"]).members.filter(pk=fx.alice.pk).exists()


def test_no_crea_un_canal_con_nombre_repetido_o_vacio(client, fx):
    duplicated = client.post(f"/api/v1/workspaces/{fx.acme.id}/channels", {"name": "General"}, **auth(fx.alice))
    assert duplicated.status_code == 422
    assert duplicated.json() == {"errors": ["Nombre ya está en uso"]}
    empty = client.post(f"/api/v1/workspaces/{fx.acme.id}/channels", {}, **auth(fx.alice))
    assert empty.json() == {"errors": ["Nombre no puede estar en blanco"]}


def test_un_usuario_ajeno_no_puede_crear_canales(client, fx):
    otro = create_user("Ajeno", "ajeno@example.com")
    response = client.post(f"/api/v1/workspaces/{fx.acme.id}/channels", {"name": "intruso"}, **auth(otro))
    assert response.status_code == 404


def test_crea_un_canal_privado_visible_solo_para_sus_miembros(client, fx):
    response = client.post(
        f"/api/v1/workspaces/{fx.acme.id}/channels", {"name": "secreto", "kind": "private"}, **auth(fx.alice)
    )
    assert response.status_code == 201
    assert response.json()["kind"] == "private"

    alice_names = [c["name"] for c in client.get(f"/api/v1/workspaces/{fx.acme.id}/channels", **auth(fx.alice)).json()]
    bob_names = [c["name"] for c in client.get(f"/api/v1/workspaces/{fx.acme.id}/channels", **auth(fx.bob)).json()]
    assert "secreto" in alice_names
    assert "secreto" not in bob_names


def test_no_permite_crear_canales_directos_por_la_api(client, fx):
    response = client.post(
        f"/api/v1/workspaces/{fx.acme.id}/channels", {"name": "x", "kind": "direct"}, **auth(fx.alice)
    )
    assert response.status_code == 422


def test_el_listado_excluye_los_mensajes_directos(client, fx):
    Channel.direct_between(fx.acme, fx.alice, fx.bob)
    kinds = {c["kind"] for c in client.get(f"/api/v1/workspaces/{fx.acme.id}/channels", **auth(fx.alice)).json()}
    assert kinds == {"public"}


def test_el_dueno_renombra_y_elimina_un_canal(client, fx):
    renamed = client.patch(f"/api/v1/channels/{fx.general.id}", {"name": "anuncios"}, format="json", **auth(fx.alice))
    assert renamed.status_code == 200
    assert renamed.json()["name"] == "anuncios"
    assert client.delete(f"/api/v1/channels/{fx.general.id}", **auth(fx.alice)).status_code == 204
    assert not Channel.objects.filter(pk=fx.general.pk).exists()


# --- messages_controller_test.rb
def test_lista_los_mensajes_del_canal(client, fx):
    response = client.get(f"/api/v1/channels/{fx.general.id}/messages", **auth(fx.alice))
    assert response.status_code == 200
    [message] = response.json()
    assert message["body"] == "Bienvenidos al workspace"
    assert message["sender"]["id"] == fx.alice.id
    assert message["attachments"] == []
    assert message["created_at"].endswith("Z")


def test_los_mensajes_se_ordenan_por_fecha(client, fx):
    client.post(f"/api/v1/channels/{fx.general.id}/messages", {"body": "segundo"}, **auth(fx.bob))
    bodies = [m["body"] for m in client.get(f"/api/v1/channels/{fx.general.id}/messages", **auth(fx.bob)).json()]
    assert bodies == ["Bienvenidos al workspace", "segundo"]


def test_crea_un_mensaje_asociado_al_usuario_autenticado(client, fx):
    response = client.post(
        f"/api/v1/channels/{fx.general.id}/messages", {"body": "Hola a todos", "user_id": fx.alice.id}, **auth(fx.bob)
    )
    assert response.status_code == 201
    assert Message.objects.latest("id").user_id == fx.bob.id


def test_no_crea_un_mensaje_sin_contenido(client, fx):
    before = Message.objects.count()
    response = client.post(f"/api/v1/channels/{fx.general.id}/messages", {"body": ""}, **auth(fx.alice))
    assert response.status_code == 422
    assert response.json() == {"errors": ["Mensaje no puede estar en blanco"]}
    assert Message.objects.count() == before


def test_solo_se_pueden_borrar_mensajes_propios(client, fx):
    assert client.delete(f"/api/v1/messages/{fx.welcome.id}", **auth(fx.bob)).status_code == 404
    assert client.delete(f"/api/v1/messages/{fx.welcome.id}", **auth(fx.alice)).status_code == 204
    assert not Message.objects.filter(pk=fx.welcome.pk).exists()


# --- channel_access_test.rb
def test_la_duena_de_un_workspace_nuevo_puede_usar_general(client, db):
    owner = create_user("Dueña", "duena@example.com")
    response = client.post("/api/v1/workspaces", {"name": "Nuevo"}, **auth(owner))
    general = Channel.objects.get(workspace_id=response.json()["id"], name="general")

    assert_can_read_and_write(client, general, owner)
    assert client.get(f"/api/v1/channels/{general.id}", **auth(owner)).status_code == 200
    renamed = client.patch(f"/api/v1/channels/{general.id}", {"name": "anuncios"}, format="json", **auth(owner))
    assert renamed.status_code == 200
    general.refresh_from_db()
    assert general.name == "anuncios"


def test_quien_se_une_por_invitacion_usa_los_canales_publicos(client, fx):
    response = client.post(f"/api/v1/workspaces/{fx.acme.id}/channels", {"name": "random"}, **auth(fx.alice))
    random = Channel.objects.get(pk=response.json()["id"])
    nuevo = create_user("Nuevo", "nuevo@example.com")

    assert client.post("/api/v1/join/acme-invite-token", **auth(nuevo)).status_code == 200
    assert_can_read_and_write(client, fx.general, nuevo)
    assert_can_read_and_write(client, random, nuevo)


def test_alguien_ajeno_no_accede_a_canales_publicos(client, fx):
    assert_cannot_read_or_write(client, fx.general, create_user("Ajeno", "ajeno@example.com"))


def test_quien_sale_del_workspace_pierde_el_acceso(client, fx):
    fx.acme.memberships.get(user=fx.bob).delete()
    assert_cannot_read_or_write(client, fx.general, fx.bob)


def test_un_mensaje_directo_queda_restringido_a_sus_participantes(client, fx):
    carol = _member(fx, "carol@example.com")
    direct = Channel.direct_between(fx.acme, fx.alice, fx.bob)

    assert_can_read_and_write(client, direct, fx.bob)
    assert_cannot_read_or_write(client, direct, carol)
    assert client.get(f"/api/v1/channels/{direct.id}", **auth(carol)).status_code == 404


def test_un_canal_privado_solo_es_accesible_para_sus_miembros(client, fx):
    carol = _member(fx, "carol@example.com")
    private = Channel.objects.create(workspace=fx.acme, name="privado", kind="private")
    private.channel_memberships.create(user=fx.alice)

    assert_can_read_and_write(client, private, fx.alice)
    assert_cannot_read_or_write(client, private, carol)


# --- direct_messages
def test_dm_crea_y_lista_mensajes_entre_dos_miembros(client, fx):
    url = f"/api/v1/workspaces/{fx.acme.id}/direct_messages/{fx.bob.id}"
    assert client.get(url, **auth(fx.alice)).json() == []
    created = client.post(url, {"body": "Hola Bob"}, **auth(fx.alice))
    assert created.status_code == 201

    back = client.get(f"/api/v1/workspaces/{fx.acme.id}/direct_messages/{fx.alice.id}", **auth(fx.bob)).json()
    assert [m["body"] for m in back] == ["Hola Bob"]


def test_dm_con_alguien_que_no_es_miembro_devuelve_404(client, fx):
    outsider = create_user("Ajeno", "ajeno@example.com")
    url = f"/api/v1/workspaces/{fx.acme.id}/direct_messages/{outsider.id}"
    assert client.get(url, **auth(fx.alice)).status_code == 404
