"""Canales, mensajes, mensajes directos y adjuntos.

Port de channels_controller, messages_controller, direct_messages_controller y el
concern ChannelMessages. Todo acceso a un canal pasa por `Channel.objects.accessible_by`.
"""

import mimetypes
import os

from django.conf import settings
from django.db import transaction
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.chat import realtime
from apps.chat.models import Attachment, Channel, ChannelMembership, Message
from apps.core.serialization import serialize_channel, serialize_message, uploaded_files
from apps.core.validation import ValidationFailed
from apps.core.views import text_param
from apps.workspaces.views import get_member_workspace

CREATABLE_KINDS = {Channel.PUBLIC, Channel.PRIVATE}


def _messages_of(channel):
    return channel.messages.select_related("user").prefetch_related("attachments").order_by("created_at", "id")


def _validate_attachments(files):
    errors = []
    if len(files) > settings.MAX_ATTACHMENTS_PER_MESSAGE:
        errors.append(f"Archivos no pueden ser más de {settings.MAX_ATTACHMENTS_PER_MESSAGE} por mensaje")
    max_bytes = settings.MAX_ATTACHMENT_SIZE_MB * 1024 * 1024
    blocked = {ext.lower() for ext in settings.BLOCKED_ATTACHMENT_EXTENSIONS}
    for uploaded in files:
        if os.path.splitext(uploaded.name)[1].lower() in blocked:
            errors.append(f"Archivo {uploaded.name} tiene un tipo no permitido")
        elif uploaded.size > max_bytes:
            errors.append(f"Archivo {uploaded.name} es demasiado grande (máximo {settings.MAX_ATTACHMENT_SIZE_MB} MB)")
    if errors:
        raise ValidationFailed(errors)


def _channel_messages_response(request, channel):
    """Comportamiento compartido entre canales y DMs (concern ChannelMessages)."""
    if request.method == "GET":
        return Response([serialize_message(m) for m in _messages_of(channel)])

    files = uploaded_files(request, "files")
    message = Message(channel=channel, user=request.user, body=text_param(request, "body", "Mensaje") or "")
    message.validate(has_attachments=bool(files))
    _validate_attachments(files)

    with transaction.atomic():
        message.save()
        for uploaded in files:
            Attachment.objects.create(
                message=message,
                file=uploaded,
                filename=os.path.basename(uploaded.name)[:255],
                content_type=uploaded.content_type or mimetypes.guess_type(uploaded.name)[0] or "",
                byte_size=uploaded.size,
            )
        payload = serialize_message(
            Message.objects.prefetch_related("attachments").select_related("user").get(pk=message.pk)
        )
        realtime.broadcast_message_created(payload, channel.id)
    return Response(payload, status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
def workspace_channels(request, workspace_id):
    workspace = get_member_workspace(request.user, workspace_id)

    if request.method == "GET":
        # Decisión de la migración: se listan solo los canales accesibles (los privados
        # ajenos ya no aparecen). Los directos siguen excluidos como en Rails.
        channels = Channel.objects.accessible_by(request.user).filter(workspace=workspace).exclude(kind=Channel.DIRECT)
        return Response([serialize_channel(c) for c in channels])

    kind = text_param(request, "kind", "Kind") or Channel.PUBLIC
    channel = Channel(workspace=workspace, name=text_param(request, "name", "Nombre"), kind=kind)
    if kind not in CREATABLE_KINDS:
        channel.kind = "invalid"
    channel.validate()
    with transaction.atomic():
        channel.save()
        ChannelMembership.objects.create(channel=channel, user=request.user)
    return Response(serialize_channel(channel), status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "PUT", "DELETE"])
def channel_detail(request, pk):
    channel = get_object_or_404(Channel.objects.accessible_by(request.user).select_related("workspace"), pk=pk)
    if request.method == "GET":
        return Response(serialize_channel(channel))

    if not channel.workspace.owned_by(request.user):
        raise PermissionDenied()

    if request.method == "DELETE":
        with transaction.atomic():
            channel_id = channel.id
            channel.delete()
            realtime.broadcast_channel_deleted(channel_id)
        return Response(status=status.HTTP_204_NO_CONTENT)

    name = text_param(request, "name", "Nombre")
    if name is not None:
        channel.name = name
    channel.validate()
    channel.save()
    return Response(serialize_channel(channel))


@api_view(["GET", "POST"])
def channel_messages(request, channel_id):
    channel = get_object_or_404(Channel.objects.accessible_by(request.user), pk=channel_id)
    return _channel_messages_response(request, channel)


@api_view(["DELETE"])
def message_detail(request, pk):
    # Solo mensajes propios; los ajenos responden 404 como en Rails.
    message = get_object_or_404(request.user.messages.all(), pk=pk)
    channel_id = message.channel_id
    files = [(a.file.storage, a.file.name) for a in message.attachments.all()]
    with transaction.atomic():
        message.delete()
        realtime.broadcast_message_deleted(pk, channel_id)
        # Los archivos se borran solo si el borrado en la base se confirmó.
        transaction.on_commit(lambda: [storage.delete(name) for storage, name in files])
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "POST"])
def direct_messages(request, workspace_id, user_id):
    workspace = get_member_workspace(request.user, workspace_id)
    other_user = get_object_or_404(workspace.members.all(), pk=user_id)
    channel = Channel.direct_between(workspace, request.user, other_user)
    return _channel_messages_response(request, channel)


@api_view(["GET"])
def attachment_download(request, pk):
    """Descarga autenticada: el adjunto solo se entrega si el canal es accesible para el usuario."""
    accessible = Channel.objects.accessible_by(request.user).values("id")
    attachment = get_object_or_404(Attachment.objects.filter(message__channel_id__in=accessible), pk=pk)
    response = FileResponse(
        attachment.file.open("rb"),
        as_attachment=True,
        filename=attachment.filename,
        content_type=attachment.content_type or "application/octet-stream",
    )
    response["X-Content-Type-Options"] = "nosniff"
    response["Cache-Control"] = "private, no-store"
    return response
