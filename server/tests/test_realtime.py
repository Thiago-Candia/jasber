"""WebSocket de canales (criterio de éxito 2: mensajes sin recargar la página)."""

import pytest
from asgiref.sync import async_to_sync, sync_to_async
from channels.testing import WebsocketCommunicator

from apps.chat.models import Channel
from apps.core.tokens import token_for
from config.asgi import application
from tests.conftest import auth, create_user

ORIGIN = [(b"origin", b"http://localhost:5173")]

pytestmark = pytest.mark.django_db(transaction=True)


def _communicator(channel_id, token, headers=ORIGIN):
    return WebsocketCommunicator(application, f"/ws/channels/{channel_id}/?token={token}", headers=headers)


async def _assert_closed_with(socket, code):
    connected, _ = await socket.connect()
    assert connected  # se acepta para poder informar el código
    assert await socket.receive_output(timeout=2) == {"type": "websocket.close", "code": code}


def test_recibe_los_mensajes_creados_y_borrados_por_la_api(client, fx):
    async def scenario():
        socket = _communicator(fx.general.id, token_for(fx.bob))
        connected, _ = await socket.connect()
        assert connected

        post = sync_to_async(client.post)
        response = await post(f"/api/v1/channels/{fx.general.id}/messages", {"body": "En vivo"}, **auth(fx.alice))
        assert response.status_code == 201

        event = await socket.receive_json_from(timeout=2)
        assert event == {"event": "message.created", "message": response.json()}

        delete = sync_to_async(client.delete)
        assert (await delete(f"/api/v1/messages/{response.json()['id']}", **auth(fx.alice))).status_code == 204
        assert await socket.receive_json_from(timeout=2) == {
            "event": "message.deleted",
            "message_id": response.json()["id"],
        }

        await socket.send_json_to({"type": "ping"})
        assert await socket.receive_json_from(timeout=2) == {"event": "pong"}
        await socket.disconnect()

    async_to_sync(scenario)()


def test_rechaza_token_invalido_con_4401(fx):
    async def scenario():
        await _assert_closed_with(_communicator(fx.general.id, "basura"), 4401)

    async_to_sync(scenario)()


def test_rechaza_canales_no_accesibles_con_4404(fx):
    carol = create_user("Carol", "carol@example.com")
    direct = Channel.direct_between(fx.acme, fx.alice, fx.bob)

    async def scenario():
        for channel_id in (fx.general.id, direct.id, 999999):
            await _assert_closed_with(_communicator(channel_id, token_for(carol)), 4404)

    async_to_sync(scenario)()


def test_rechaza_origenes_no_permitidos(fx):
    async def scenario():
        socket = _communicator(fx.general.id, token_for(fx.bob), headers=[(b"origin", b"https://evil.example")])
        connected, _ = await socket.connect()
        assert not connected

    async_to_sync(scenario)()


def test_cierra_el_socket_si_quitan_al_usuario_del_workspace(client, fx):
    membership = fx.acme.memberships.get(user=fx.bob)

    async def scenario():
        socket = _communicator(fx.general.id, token_for(fx.bob))
        assert (await socket.connect())[0]

        delete = sync_to_async(client.delete)
        response = await delete(f"/api/v1/workspaces/{fx.acme.id}/memberships/{membership.id}", **auth(fx.alice))
        assert response.status_code == 204
        assert await socket.receive_output(timeout=2) == {"type": "websocket.close", "code": 4404}

    async_to_sync(scenario)()


def test_cierra_el_socket_si_borran_el_canal(client, fx):
    async def scenario():
        socket = _communicator(fx.general.id, token_for(fx.bob))
        assert (await socket.connect())[0]

        delete = sync_to_async(client.delete)
        assert (await delete(f"/api/v1/channels/{fx.general.id}", **auth(fx.alice))).status_code == 204
        assert await socket.receive_output(timeout=2) == {"type": "websocket.close", "code": 4404}

    async_to_sync(scenario)()


def test_cierra_el_socket_cuando_vence_el_token(fx):
    from datetime import timedelta

    from django.utils import timezone

    from apps.core.tokens import encode

    almost_expired = encode({"user_id": fx.bob.id}, expires_at=timezone.now() + timedelta(seconds=1))

    async def scenario():
        socket = _communicator(fx.general.id, almost_expired)
        assert (await socket.connect())[0]
        assert await socket.receive_output(timeout=4) == {"type": "websocket.close", "code": 4401}

    async_to_sync(scenario)()
