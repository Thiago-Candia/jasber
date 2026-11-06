import logging
import threading

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def build_password_reset_email(user):
    reset_url = f"{settings.FRONTEND_URL}/rewrite-password?reset_token={user.reset_password_token}"
    context = {"user": user, "reset_url": reset_url}
    message = EmailMultiAlternatives(
        subject="Restablecimiento de contraseña",
        body=render_to_string("emails/password_reset_email.txt", context),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    message.attach_alternative(render_to_string("emails/password_reset_email.html", context), "text/html")
    return message


def _send(message):
    try:
        message.send()
    except Exception:  # el usuario recibe la misma respuesta aunque falle el SMTP
        logger.exception("No se pudo enviar el email de restablecimiento")


def send_password_reset_email(user):
    """Equivalente a `UserMailer.password_reset_email(user).deliver_later`."""
    message = build_password_reset_email(user)

    def deliver():
        if settings.EMAIL_ASYNC:
            threading.Thread(target=_send, args=(message,), daemon=True).start()
        else:
            _send(message)

    transaction.on_commit(deliver)
