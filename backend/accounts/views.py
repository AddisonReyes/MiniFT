import json
import logging

from accounts.auth import jwt_required
from django.http import JsonResponse

from .jwt import create_login_token
from .services import login_user, logout_user, register_user

logger = logging.getLogger("minift.audit")


def _mask_email(email: str) -> str:
    try:
        email = (email or "").strip()
        if "@" not in email:
            return ""
        local, domain = email.split("@", 1)
        if not domain:
            return ""
        prefix = local[:1] if local else ""
        return f"{prefix}***@{domain.lower()}"
    except Exception:
        return ""


@jwt_required
def register_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    data = json.loads(request.body)
    email_masked = _mask_email(data.get("email", ""))
    logger.info(
        "AUTH register attempt email=%s rid=%s",
        email_masked,
        getattr(request, "request_id", ""),
    )
    try:
        user = register_user(data["email"], data["password"])
        logger.info(
            "AUTH register ok uid=%s email=%s rid=%s",
            user.id,
            email_masked,
            getattr(request, "request_id", ""),
        )
        return JsonResponse(
            {"message": "User created", "id": user.id},
            status=201,
        )
    except (ValueError, KeyError) as e:
        logger.warning(
            "AUTH register fail email=%s err=%s rid=%s",
            email_masked,
            str(e),
            getattr(request, "request_id", ""),
        )
        return JsonResponse({"error": str(e)}, status=400)


@jwt_required
def login_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    data = json.loads(request.body)
    email_masked = _mask_email(data.get("email", ""))
    logger.info(
        "AUTH login attempt email=%s rid=%s",
        email_masked,
        getattr(request, "request_id", ""),
    )
    try:
        user = login_user(request, data["email"], data["password"])
        token, exp = create_login_token(user=user)
        logger.info(
            "AUTH login ok uid=%s email=%s rid=%s",
            user.id,
            email_masked,
            getattr(request, "request_id", ""),
        )
        return JsonResponse(
            {
                "message": "Login successful",
                "id": user.id,
                "token": token,
                "expires_at": exp.isoformat(),
            }
        )
    except (ValueError, KeyError) as e:
        logger.warning(
            "AUTH login fail email=%s err=%s rid=%s",
            email_masked,
            str(e),
            getattr(request, "request_id", ""),
        )
        return JsonResponse({"error": str(e)}, status=401)


@jwt_required
def logout_view(request):
    logger.info(
        "AUTH logout uid=%s rid=%s",
        request.user.id,
        getattr(request, "request_id", ""),
    )
    logout_user(request)
    return JsonResponse({"message": "Logged out"})
