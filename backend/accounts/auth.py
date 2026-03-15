import jwt
from accounts.models import User
from django.conf import settings
from django.http import JsonResponse


def jwt_required(view_func):
    def wrapper(request, *args, **kwargs):
        auth = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth.startswith("Bearer "):
            return JsonResponse({"error": "Unauthorized"}, status=401)
        token = auth.split(" ")[1]
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=["HS256"],
            )
            request.user = User.objects.get(pk=payload["sub"])
        except Exception:
            return JsonResponse({"error": "Invalid token"}, status=401)
        return view_func(request, *args, **kwargs)

    return wrapper
