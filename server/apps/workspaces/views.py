"""Workspaces, invitaciones y membresías.

Port de workspaces_controller y memberships_controller. Regla de acceso:
un workspace del que no sos miembro responde 404 (no se revela que existe);
si sos miembro pero no dueño, las acciones de dueño responden 403.
"""

from django.db import transaction
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.accounts.models import User
from apps.chat import realtime
from apps.chat.models import Channel
from apps.core.images import ensure_image
from apps.core.serialization import serialize_user, serialize_workspace
from apps.core.views import param, text_param
from apps.workspaces.models import Membership, Workspace


def workspaces_for(user):
    members = User.objects.order_by("id")
    return Workspace.objects.filter(memberships__user=user).prefetch_related(Prefetch("members", queryset=members))


def get_member_workspace(user, pk):
    return get_object_or_404(workspaces_for(user), pk=pk)


def require_owner(workspace, user):
    if not workspace.owned_by(user):
        raise PermissionDenied()


def _apply_workspace_params(workspace, request):
    name = text_param(request, "name", "Nombre")
    image = param(request, "image")
    if name is not None:
        workspace.name = name
    workspace.validate()
    if image == "":
        if workspace.image:
            workspace.image.delete(save=False)
        workspace.image = None
    elif image is not None:
        workspace.image = ensure_image(image, "Imagen")


@api_view(["GET", "POST"])
def workspace_list(request):
    if request.method == "GET":
        return Response([serialize_workspace(w) for w in workspaces_for(request.user)])

    workspace = Workspace(owner=request.user, name="")
    _apply_workspace_params(workspace, request)
    with transaction.atomic():
        workspace.save()
        Membership.objects.create(user=request.user, workspace=workspace, role=Membership.OWNER)
        Channel.objects.create(workspace=workspace, name="general", kind=Channel.PUBLIC)
    return Response(
        serialize_workspace(get_member_workspace(request.user, workspace.pk)), status=status.HTTP_201_CREATED
    )


@api_view(["GET", "PATCH", "PUT", "DELETE"])
def workspace_detail(request, pk):
    workspace = get_member_workspace(request.user, pk)
    if request.method == "GET":
        return Response(serialize_workspace(workspace))

    require_owner(workspace, request.user)
    if request.method == "DELETE":
        with transaction.atomic():
            member_ids = list(workspace.memberships.values_list("user_id", flat=True))
            workspace.delete()
            realtime.broadcast_access_changed(member_ids)
        return Response(status=status.HTTP_204_NO_CONTENT)

    _apply_workspace_params(workspace, request)
    workspace.save()
    return Response(serialize_workspace(get_member_workspace(request.user, pk)))


@api_view(["POST"])
def invite(request, pk):
    workspace = get_member_workspace(request.user, pk)
    return Response({"invite_token": workspace.invite_token})


@api_view(["POST"])
def join(request, token):
    workspace = get_object_or_404(Workspace, invite_token=token)
    Membership.objects.get_or_create(user=request.user, workspace=workspace, defaults={"role": Membership.MEMBER})
    return Response(serialize_workspace(get_member_workspace(request.user, workspace.pk)))


@api_view(["GET", "POST"])
def membership_list(request, workspace_id):
    workspace = get_member_workspace(request.user, workspace_id)
    if request.method == "GET":
        return Response([serialize_user(member) for member in workspace.members.all()])

    require_owner(workspace, request.user)
    email = text_param(request, "email", "Email")
    user = get_object_or_404(User, email=(email or "").lower())
    Membership.objects.get_or_create(user=user, workspace=workspace, defaults={"role": Membership.MEMBER})
    return Response(serialize_user(user), status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
def membership_detail(request, workspace_id, pk):
    workspace = get_member_workspace(request.user, workspace_id)
    require_owner(workspace, request.user)
    membership = get_object_or_404(workspace.memberships, pk=pk)
    with transaction.atomic():
        membership.delete()
        realtime.broadcast_access_changed([membership.user_id])
    return Response(status=status.HTTP_204_NO_CONTENT)
