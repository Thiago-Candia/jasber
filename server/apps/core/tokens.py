"""Equivalente de `server/lib/json_web_token.rb` (HS256, 24 h, claim `user_id`)."""

import jwt
from django.conf import settings
from django.utils import timezone


def encode(payload, expires_at=None):
    expires_at = expires_at or timezone.now() + settings.JWT_LIFETIME
    return jwt.encode(
        {**payload, "exp": int(expires_at.timestamp())}, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM
    )


def decode(token):
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None


def token_for(user):
    return encode({"user_id": user.id})


def user_from_token(token):
    from apps.accounts.models import User

    payload = decode(token) if token else None
    user_id = payload.get("user_id") if isinstance(payload, dict) else None
    if not isinstance(user_id, int):
        return None
    return User.objects.filter(pk=user_id).first()
