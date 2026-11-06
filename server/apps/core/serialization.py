"""Serializadores con el mismo JSON que `server/app/serializers/*.rb`.

Se usan funciones simples (no ModelSerializer) para controlar el formato exacto
que espera el cliente React.
"""

from datetime import UTC

from django.utils.datastructures import MultiValueDict


def iso8601(value):
    # Igual que Rails: UTC con milisegundos y sufijo Z (2026-11-06T04:02:03.123Z).
    return value.astimezone(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def file_url(field_file):
    return field_file.url if field_file else None


def serialize_user(user):
    return {"id": user.id, "name": user.name, "email": user.email, "avatar_url": file_url(user.avatar)}


def serialize_workspace(workspace):
    return {
        "id": workspace.id,
        "name": workspace.name,
        "image_url": file_url(workspace.image),
        "members": [serialize_user(member) for member in workspace.members.all()],
    }


def serialize_channel(channel):
    return {"id": channel.id, "name": channel.name, "kind": channel.kind, "workspace_id": channel.workspace_id}


def serialize_attachment(attachment):
    return {
        "id": attachment.id,
        "filename": attachment.filename,
        "content_type": attachment.content_type,
        "byte_size": attachment.byte_size,
        "url": f"/api/v1/attachments/{attachment.id}",
    }


def serialize_message(message):
    return {
        "id": message.id,
        "body": message.body,
        "created_at": iso8601(message.created_at),
        "sender": serialize_user(message.user),
        # Campo nuevo (retrocompatible): adjuntos del mensaje.
        "attachments": [serialize_attachment(a) for a in message.attachments.all()],
    }


def uploaded_files(request, key):
    data = request.data
    if isinstance(data, MultiValueDict):
        return [f for f in data.getlist(key) if hasattr(f, "read")]
    return []
