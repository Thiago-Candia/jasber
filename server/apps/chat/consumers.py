"""WebSocket de un canal: `ws(s)://<host>/ws/channels/<id>/?token=<jwt>`.

Los navegadores no permiten headers en WebSocket, por eso el JWT viaja en el
query string. El socket se acepta y, si el token no es válido o el canal no es
accesible, se cierra enseguida con un código que el cliente puede leer:
  4401: token ausente, inválido o vencido.
  4404: canal inexistente o no accesible (también si se pierde el acceso después).

Mientras está abierto, el acceso se revoca al instante si al usuario lo quitan del
workspace, se borra el workspace o el canal, o vence el JWT.

Eventos enviados al cliente:
  {"event": "message.created", "message": {...mismo JSON que la API REST...}}
  {"event": "message.deleted", "message_id": 123}
"""

import asyncio
import time
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from apps.chat.models import Channel
from apps.chat.realtime import group_name, user_group_name
from apps.core.tokens import decode, user_from_token

CLOSE_UNAUTHORIZED = 4401
CLOSE_NOT_FOUND = 4404


@database_sync_to_async
def _user_for(token):
    return user_from_token(token)


@database_sync_to_async
def _can_access(user, channel_id):
    return Channel.objects.accessible_by(user).filter(pk=channel_id).exists()


class ChannelConsumer(AsyncJsonWebsocketConsumer):
    groups_joined = ()
    expiry_task = None

    async def connect(self):
        self.channel_id = int(self.scope["url_route"]["kwargs"]["channel_id"])
        query = parse_qs(self.scope.get("query_string", b"").decode())
        token = (query.get("token") or [None])[0]

        self.user = await _user_for(token)
        if self.user is None:
            await self._reject(CLOSE_UNAUTHORIZED)
            return
        if not await _can_access(self.user, self.channel_id):
            await self._reject(CLOSE_NOT_FOUND)
            return

        # Se suscribe antes de aceptar: así no se pierde ningún evento posterior al handshake.
        self.groups_joined = (group_name(self.channel_id), user_group_name(self.user.id))
        for group in self.groups_joined:
            await self.channel_layer.group_add(group, self.channel_name)
        await self.accept()

        expires_at = (decode(token) or {}).get("exp")
        if isinstance(expires_at, int):
            self.expiry_task = asyncio.create_task(self._close_when_token_expires(expires_at))

    async def _reject(self, code):
        # Aceptar y cerrar enseguida: así el cliente recibe el código (si no, ve un 403 genérico).
        await self.accept()
        await self.close(code=code)

    async def disconnect(self, code):
        if self.expiry_task:
            self.expiry_task.cancel()
        for group in self.groups_joined:
            await self.channel_layer.group_discard(group, self.channel_name)

    async def _close_when_token_expires(self, expires_at):
        await asyncio.sleep(max(0, expires_at - time.time()))
        await self.close(code=CLOSE_UNAUTHORIZED)

    async def receive_json(self, content, **kwargs):
        # Los mensajes se envían por la API REST; el socket solo responde pings.
        if isinstance(content, dict) and content.get("type") == "ping":
            await self.send_json({"event": "pong"})

    async def message_created(self, event):
        await self.send_json({"event": "message.created", "message": event["message"]})

    async def message_deleted(self, event):
        await self.send_json({"event": "message.deleted", "message_id": event["message_id"]})

    async def channel_deleted(self, event):
        await self.close(code=CLOSE_NOT_FOUND)

    async def access_changed(self, event):
        if not await _can_access(self.user, self.channel_id):
            await self.close(code=CLOSE_NOT_FOUND)
