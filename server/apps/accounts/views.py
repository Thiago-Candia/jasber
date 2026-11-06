"""Registro, sesión, perfil y recuperación de contraseña.

Port de users_controller, sessions_controller, profiles_controller y
password_resets_controller (server/app/controllers/api/v1).
"""

import secrets
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.accounts.emails import send_password_reset_email
from apps.accounts.models import User
from apps.core.exceptions import errors_response
from apps.core.images import ensure_image
from apps.core.serialization import serialize_user
from apps.core.tokens import token_for
from apps.core.views import param, text_param

RESET_TOKEN_LIFETIME = timedelta(hours=2)


def _email_param(request):
    email = text_param(request, "email", "Email")
    return email.lower() if email else None


def _auth_payload(user):
    return {"token": token_for(user), "user": serialize_user(user)}


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def register(request):
    name = text_param(request, "name", "Nombre")
    if name is None:
        name = text_param(request, "username", "Nombre")
    user = User(name=name or "", email=text_param(request, "email", "Email") or "")
    user.set_password(text_param(request, "password", "Contraseña"))
    user.validate()
    user.save()
    return Response(_auth_payload(user), status=status.HTTP_201_CREATED)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def login(request):
    email = param(request, "email")
    user = User.objects.filter(email=email.lower()).first() if isinstance(email, str) and email else None
    password = param(request, "password")

    if user and isinstance(password, str) and user.check_password(password):
        return Response(_auth_payload(user))
    return errors_response(["Email o contraseña inválidos"], status.HTTP_401_UNAUTHORIZED)


@api_view(["DELETE"])
@authentication_classes([])
@permission_classes([AllowAny])
def logout(request):
    # JWT es stateless: el cliente descarta el token.
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "PATCH", "PUT"])
def profile(request):
    user = request.user
    if request.method in ("PATCH", "PUT"):
        name = text_param(request, "name", "Nombre")
        avatar = param(request, "avatar")
        if name is not None:
            user.name = name
        user.validate()
        if avatar == "":
            # Como Active Storage: un valor vacío quita el avatar.
            if user.avatar:
                user.avatar.delete(save=False)
            user.avatar = None
        elif avatar is not None:
            user.avatar = ensure_image(avatar, "Avatar")
        user.save()
    return Response(serialize_user(user))


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def password_reset_create(request):
    email = _email_param(request)
    user = User.objects.filter(email=email).first() if email else None
    if user:
        with transaction.atomic():
            user.reset_password_token = secrets.token_urlsafe(16)
            user.reset_password_sent_at = timezone.now()
            user.save(update_fields=["reset_password_token", "reset_password_sent_at", "updated_at"])
            send_password_reset_email(user)
    # Misma respuesta exista o no el email.
    return Response({"message": "Si el email existe, se generó un enlace"})


@api_view(["PATCH"])
@authentication_classes([])
@permission_classes([AllowAny])
def password_reset_update(request, token):
    user = User.objects.filter(reset_password_token=token).first()
    expired = (
        user is None
        or user.reset_password_sent_at is None
        or (user.reset_password_sent_at < timezone.now() - RESET_TOKEN_LIFETIME)
    )
    if expired:
        return errors_response(["Enlace inválido o expirado"], status.HTTP_422_UNPROCESSABLE_ENTITY)

    user.set_password(text_param(request, "password", "Contraseña"))
    user.validate()
    user.reset_password_token = None
    user.reset_password_sent_at = None
    user.save()
    return Response({"message": "Contraseña actualizada"})
