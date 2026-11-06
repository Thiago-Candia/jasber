from django.conf import settings
from django.core.exceptions import SuspiciousFileOperation
from django.http import Http404, HttpResponse, JsonResponse
from django.views.static import serve

from apps.core.exceptions import NOT_FOUND
from apps.core.validation import ValidationFailed


def health(request):
    """Equivalente a `GET /up` de Rails."""
    return HttpResponse("ok", content_type="text/plain")


def json_not_found(request, exception=None):
    return JsonResponse({"errors": [NOT_FOUND]}, status=404)


def public_media(request, path):
    """Avatares e imágenes de workspace (públicos, como los blobs de Active Storage).

    Los adjuntos de mensajes NO se sirven acá: viven en PRIVATE_MEDIA_ROOT.
    Defensa en profundidad: aunque solo se guardan imágenes con extensión elegida por
    el servidor, la respuesta no puede ejecutar scripts ni ser reinterpretada.
    """
    try:
        response = serve(request, path, document_root=settings.MEDIA_ROOT)
    except (Http404, SuspiciousFileOperation):
        return json_not_found(request)
    response["X-Content-Type-Options"] = "nosniff"
    response["Content-Security-Policy"] = "default-src 'none'; sandbox"
    return response


def param(request, key):
    """Como `params[:key]` de Rails: cuerpo (JSON, form o multipart) y, si no, query string.

    Devuelve None si la clave no vino, para poder imitar `{...}.compact`.
    """
    data = request.data
    if hasattr(data, "get") and key in data:
        return data.get(key)
    return request.query_params.get(key)


def text_param(request, key, attribute=None):
    """Igual que `param`, pero exige texto: números, listas u objetos dan 422 (no 500).

    `null` en JSON se trata como ausente.
    """
    value = param(request, key)
    if value is None or isinstance(value, str):
        return value
    raise ValidationFailed([f"{attribute or key.capitalize()} no es válido"])
