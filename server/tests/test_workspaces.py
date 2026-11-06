"""Port de workspaces_controller_test y permissions_test, más membresías."""

from apps.chat.models import Channel
from apps.workspaces.models import Membership, Workspace
from tests.conftest import FIXTURES_DIR, auth, create_user


def test_sin_token_devuelve_401(client, db):
    response = client.get("/api/v1/workspaces")
    assert response.status_code == 401
    assert response.json() == {"errors": ["No autorizado"]}


def test_lista_solo_los_workspaces_del_usuario(client, fx):
    other_owner = create_user("Otro", "otro@example.com")
    other = Workspace.objects.create(name="Ajeno", owner=other_owner)
    Membership.objects.create(user=other_owner, workspace=other, role="owner")

    response = client.get("/api/v1/workspaces", **auth(fx.alice))
    assert response.status_code == 200
    ids = [w["id"] for w in response.json()]
    assert ids == [fx.acme.id]


def test_formato_del_workspace_serializado(client, fx):
    body = client.get(f"/api/v1/workspaces/{fx.acme.id}", **auth(fx.bob)).json()
    assert body == {
        "id": fx.acme.id,
        "name": "Acme",
        "image_url": None,
        "members": [
            {"id": fx.alice.id, "name": "Alice Owner", "email": "alice@example.com", "avatar_url": None},
            {"id": fx.bob.id, "name": "Bob Member", "email": "bob@example.com", "avatar_url": None},
        ],
    }


def test_crea_un_workspace_con_owner_y_canal_general(client, fx):
    response = client.post("/api/v1/workspaces", {"name": "Nuevo workspace"}, **auth(fx.alice))
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Nuevo workspace"
    workspace = Workspace.objects.get(pk=body["id"])
    assert workspace.owner == fx.alice
    assert workspace.memberships.get(user=fx.alice).role == "owner"
    assert workspace.channels.filter(name="general", kind="public").exists()


def test_crea_un_workspace_con_imagen(client, fx):
    with open(FIXTURES_DIR / "avatar.png", "rb") as image:
        response = client.post("/api/v1/workspaces", {"name": "Con logo", "image": image}, **auth(fx.alice))
    assert response.status_code == 201
    assert response.json()["image_url"].startswith("/media/workspaces/")


def test_no_crea_un_workspace_sin_nombre(client, fx):
    response = client.post("/api/v1/workspaces", {"name": ""}, **auth(fx.alice))
    assert response.status_code == 422
    assert response.json() == {"errors": ["Nombre no puede estar en blanco"]}


def test_invite_devuelve_el_token(client, fx):
    response = client.post(f"/api/v1/workspaces/{fx.acme.id}/invite", **auth(fx.alice))
    assert response.status_code == 200
    assert response.json() == {"invite_token": "acme-invite-token"}


def test_un_ajeno_no_puede_obtener_la_invitacion(client, fx):
    outsider = create_user("Ajeno", "ajeno@example.com")
    assert client.post(f"/api/v1/workspaces/{fx.acme.id}/invite", **auth(outsider)).status_code == 404


def test_join_con_token_valido_suma_al_usuario_como_member(client, fx):
    nuevo = create_user("Nuevo", "nuevo@example.com")
    before = Membership.objects.count()
    response = client.post("/api/v1/join/acme-invite-token", **auth(nuevo))
    assert response.status_code == 200
    assert response.json()["id"] == fx.acme.id
    assert Membership.objects.count() == before + 1
    assert fx.acme.memberships.get(user=nuevo).role == "member"


def test_join_no_duplica_la_membresia(client, fx):
    before = Membership.objects.count()
    assert client.post("/api/v1/join/acme-invite-token", **auth(fx.bob)).status_code == 200
    assert Membership.objects.count() == before


def test_join_con_token_inexistente_devuelve_404(client, fx):
    response = client.post("/api/v1/join/token-inexistente", **auth(fx.bob))
    assert response.status_code == 404
    assert response.json() == {"errors": ["Recurso no encontrado"]}


def test_join_sin_autenticacion_devuelve_401(client, fx):
    assert client.post("/api/v1/join/acme-invite-token").status_code == 401


# --- permisos (permissions_test.rb)
def test_un_miembro_no_dueno_no_puede_eliminar_el_workspace(client, fx):
    response = client.delete(f"/api/v1/workspaces/{fx.acme.id}", **auth(fx.bob))
    assert response.status_code == 403
    assert response.json() == {"errors": ["No tenés permisos para realizar esta acción"]}
    assert Workspace.objects.filter(pk=fx.acme.pk).exists()


def test_el_dueno_puede_editar_el_workspace(client, fx):
    response = client.patch(f"/api/v1/workspaces/{fx.acme.id}", {"name": "Renombrado"}, format="json", **auth(fx.alice))
    assert response.status_code == 200
    fx.acme.refresh_from_db()
    assert fx.acme.name == "Renombrado"


def test_el_dueno_puede_eliminar_el_workspace_en_cascada(client, fx):
    assert client.delete(f"/api/v1/workspaces/{fx.acme.id}", **auth(fx.alice)).status_code == 204
    assert not Workspace.objects.filter(pk=fx.acme.pk).exists()
    assert not Channel.objects.filter(pk=fx.general.pk).exists()


def test_un_miembro_no_puede_agregar_otros_miembros(client, fx):
    nuevo = create_user("Nuevo", "nuevo@example.com")
    before = Membership.objects.count()
    response = client.post(f"/api/v1/workspaces/{fx.acme.id}/memberships", {"email": nuevo.email}, **auth(fx.bob))
    assert response.status_code == 403
    assert Membership.objects.count() == before


def test_un_miembro_no_puede_eliminar_canales(client, fx):
    assert client.delete(f"/api/v1/channels/{fx.general.id}", **auth(fx.bob)).status_code == 403
    assert Channel.objects.filter(pk=fx.general.pk).exists()


def test_un_recurso_inexistente_devuelve_404_con_cuerpo_json(client, fx):
    response = client.get("/api/v1/workspaces/0", **auth(fx.alice))
    assert response.status_code == 404
    assert response.json() == {"errors": ["Recurso no encontrado"]}


def test_ruta_inexistente_devuelve_404_json(client, db):
    response = client.get("/api/v1/no-existe")
    assert response.status_code == 404


# --- membresías
def test_lista_los_miembros_como_usuarios(client, fx):
    response = client.get(f"/api/v1/workspaces/{fx.acme.id}/memberships", **auth(fx.bob))
    assert response.status_code == 200
    assert [u["email"] for u in response.json()] == ["alice@example.com", "bob@example.com"]


def test_el_dueno_agrega_un_miembro_por_email(client, fx):
    nuevo = create_user("Nuevo", "nuevo@example.com")
    response = client.post(
        f"/api/v1/workspaces/{fx.acme.id}/memberships", {"email": "NUEVO@example.com"}, **auth(fx.alice)
    )
    assert response.status_code == 201
    assert response.json()["id"] == nuevo.id
    assert fx.acme.memberships.get(user=nuevo).role == "member"


def test_agregar_un_email_inexistente_devuelve_404(client, fx):
    response = client.post(
        f"/api/v1/workspaces/{fx.acme.id}/memberships", {"email": "nadie@example.com"}, **auth(fx.alice)
    )
    assert response.status_code == 404


def test_el_dueno_elimina_una_membresia(client, fx):
    membership = fx.acme.memberships.get(user=fx.bob)
    response = client.delete(f"/api/v1/workspaces/{fx.acme.id}/memberships/{membership.id}", **auth(fx.alice))
    assert response.status_code == 204
    assert not fx.acme.memberships.filter(user=fx.bob).exists()
