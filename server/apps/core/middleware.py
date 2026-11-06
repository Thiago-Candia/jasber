from django.conf import settings
from django.http import JsonResponse


class RequestSizeLimitMiddleware:
    """Rechaza con 413 los cuerpos más grandes que MAX_REQUEST_SIZE_MB sin leerlos."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            length = int(request.META.get("CONTENT_LENGTH") or 0)
        except ValueError:
            length = 0
        limit_mb = settings.MAX_REQUEST_SIZE_MB
        if length > limit_mb * 1024 * 1024:
            return JsonResponse({"errors": [f"La solicitud es demasiado grande (máximo {limit_mb} MB)"]}, status=413)
        return self.get_response(request)
