"""Mensajes de validación con el mismo texto que Rails + rails-i18n (locale `es`).

El frontend muestra `errors` tal cual, así que mantenemos el formato
"<Atributo> <mensaje>" de `errors.full_messages`.
"""

BLANK = "no puede estar en blanco"
TAKEN = "ya está en uso"
INVALID = "no es válido"
INCLUSION = "no está incluido en la lista"


def too_short(count):
    return f"es demasiado corto ({count} caracteres mínimo)"


def too_long(count):
    return f"es demasiado largo ({count} caracteres máximo)"


class ValidationFailed(Exception):
    """Se traduce a 422 `{"errors": [...]}` en el exception handler."""

    def __init__(self, errors):
        super().__init__("; ".join(errors))
        self.errors = list(errors)


def is_blank(value):
    return value is None or (isinstance(value, str) and value.strip() == "")


class Errors:
    def __init__(self):
        self.messages = []

    def add(self, attribute, message):
        self.messages.append(f"{attribute} {message}")

    def raise_if_any(self):
        if self.messages:
            raise ValidationFailed(self.messages)
