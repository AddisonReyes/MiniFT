from __future__ import annotations

from datetime import UTC, datetime, timedelta

import jwt
from django.conf import settings


JWT_ALGORITHM = "HS256"
JWT_LOGIN_TTL_DAYS_DEFAULT = 30


def create_login_token(*, user) -> tuple[str, datetime]:
    now = datetime.now(UTC)
    ttl_days = int(getattr(settings, "JWT_LOGIN_TTL_DAYS", JWT_LOGIN_TTL_DAYS_DEFAULT))
    exp = now + timedelta(days=ttl_days)

    payload = {
        "sub": str(user.pk),
        "email": user.email,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }

    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token, exp


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[JWT_ALGORITHM])
