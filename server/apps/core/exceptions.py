"""Todas las respuestas de error de la API tienen la forma `{"errors": ["..."]}`."""

from django.core.exceptions import ObjectDoesNotExist
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.db import IntegrityError
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler

from apps.core.validation import ValidationFailed

NOT_FOUND = "Recurso no encontrado"
FORBIDDEN = "No tenés permisos para realizar esta acción"
UNAUTHORIZED = "No autorizado"
CONFLICT = "El registro ya existe"


def errors_response(messages, status_code):
    return Response({"errors": list(messages)}, status=status_code)


def _flatten(detail):
    if isinstance(detail, dict):
        return [message for value in detail.values() for message in _flatten(value)]
    if isinstance(detail, (list, tuple)):
        return [message for value in detail for message in _flatten(value)]
    return [str(detail)]


def api_exception_handler(exc, context):
    if isinstance(exc, (Http404, ObjectDoesNotExist, exceptions.NotFound)):
        return errors_response([NOT_FOUND], status.HTTP_404_NOT_FOUND)
    if isinstance(exc, (exceptions.NotAuthenticated, exceptions.AuthenticationFailed)):
        response = errors_response([UNAUTHORIZED], status.HTTP_401_UNAUTHORIZED)
        response["WWW-Authenticate"] = "Bearer"
        return response
    if isinstance(exc, (exceptions.PermissionDenied, DjangoPermissionDenied)):
        return errors_response([FORBIDDEN], status.HTTP_403_FORBIDDEN)
    if isinstance(exc, ValidationFailed):
        return errors_response(exc.errors, status.HTTP_422_UNPROCESSABLE_ENTITY)
    if isinstance(exc, IntegrityError):
        # Dos requests simultáneas pasaron la validación previa (email o canal duplicado).
        return errors_response([CONFLICT], status.HTTP_422_UNPROCESSABLE_ENTITY)

    response = exception_handler(exc, context)
    if response is not None:
        response.data = {"errors": _flatten(response.data)}
    return response
