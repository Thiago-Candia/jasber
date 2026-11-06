from rest_framework.authentication import BaseAuthentication

from apps.core.tokens import user_from_token


class JWTAuthentication(BaseAuthentication):
    """`Authorization: Bearer <jwt>`; como en Rails, se toma el último segmento del header.

    Un token ausente o inválido deja la request como anónima: las vistas protegidas
    responden 401 y las públicas (login, register, password-resets) siguen funcionando.
    """

    def authenticate(self, request):
        header = request.headers.get("Authorization", "")
        token = header.split(" ")[-1] if header else None
        user = user_from_token(token)
        return (user, token) if user else None

    def authenticate_header(self, request):
        # Hace que DRF responda 401 (y no 403) cuando falta autenticación.
        return "Bearer"
