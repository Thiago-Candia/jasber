"""Validación de imágenes públicas (avatar, imagen de workspace).

Se sirven desde /media en el mismo origen que la API y el admin, así que:
- solo se aceptan PNG, JPEG, GIF y WEBP verificados por Pillow;
- el nombre y la extensión los decide el servidor (nunca el cliente), para que
  un `x.html` o `x.svg` no se sirva como HTML/SVG ejecutable;
- se limita el tamaño del archivo y de la imagen (bombas de descompresión).
"""

import uuid

from django.conf import settings
from django.core.files.uploadedfile import UploadedFile
from PIL import Image, UnidentifiedImageError

from apps.core.validation import ValidationFailed

ALLOWED_FORMATS = {"PNG": "png", "JPEG": "jpg", "GIF": "gif", "WEBP": "webp"}
MAX_PIXELS = 40_000_000


def ensure_image(uploaded, attribute):
    invalid = ValidationFailed([f"{attribute} no es una imagen válida"])
    if not isinstance(uploaded, UploadedFile):
        raise invalid

    max_bytes = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024
    if uploaded.size > max_bytes:
        raise ValidationFailed([f"{attribute} es demasiado grande (máximo {settings.MAX_IMAGE_SIZE_MB} MB)"])

    try:
        with Image.open(uploaded) as image:
            image_format = image.format
            width, height = image.size
            if width * height > MAX_PIXELS:
                raise invalid
            image.verify()
    except ValidationFailed:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, SyntaxError, ValueError) as exc:
        raise invalid from exc
    finally:
        uploaded.seek(0)

    extension = ALLOWED_FORMATS.get(image_format)
    if extension is None:
        raise invalid

    uploaded.name = f"{uuid.uuid4().hex}.{extension}"
    return uploaded
