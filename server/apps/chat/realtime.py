"""Difusión de eventos a los WebSockets (Django Channels).

- Grupo `channel_<id>`: sockets abiertos sobre un canal (eventos de mensajes, canal borrado).
- Grupo `user_<id>`: sockets de un usuario; sirve para revocar acceso al instante cuando
  lo quitan de un workspace o se borra el workspace.
"""

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction

logger = logging.getLogger(__name__)


def group_name(channel_id):
    return f"channel_{channel_id}"


def user_group_name(user_id):
    return f"user_{user_id}"


def _send(group, event):
    layer = get_channel_layer()
    if layer is None:
        return
    try:
        async_to_sync(layer.group_send)(group, event)
    except Exception:  # sin Redis la API REST sigue funcionando (fallback por polling)
        logger.exception("No se pudo difundir el evento %s", event.get("type"))


def broadcast_message_created(message_payload, channel_id):
    event = {"type": "message.created", "message": message_payload}
    transaction.on_commit(lambda: _send(group_name(channel_id), event))


def broadcast_message_deleted(message_id, channel_id):
    event = {"type": "message.deleted", "message_id": message_id}
    transaction.on_commit(lambda: _send(group_name(channel_id), event))


def broadcast_channel_deleted(channel_id):
    transaction.on_commit(lambda: _send(group_name(channel_id), {"type": "channel.deleted"}))


def broadcast_access_changed(user_ids):
    """Pide a los sockets de esos usuarios que vuelvan a verificar su acceso."""
    user_ids = list(user_ids)

    def send_all():
        for user_id in user_ids:
            _send(user_group_name(user_id), {"type": "access.changed"})

    transaction.on_commit(send_all)
