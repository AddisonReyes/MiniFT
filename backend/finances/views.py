import json
import logging

from accounts.auth import jwt_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .services import (
    create_entry,
    delete_entry,
    get_balance_summary,
    get_entry,
    get_user_entries,
    update_entry,
)

logger = logging.getLogger("minift.audit")


@csrf_exempt
@jwt_required
def entries_view(request):
    # GET – list all entries
    if request.method == "GET":
        entry_type = request.GET.get("type")  # ?type=INCOME or ?type=EXPENSE
        entries = get_user_entries(request.user, entry_type)
        logger.info(
            "FIN entries list uid=%s n=%s type=%s rid=%s",
            request.user.id,
            len(entries),
            entry_type or "",
            getattr(request, "request_id", ""),
        )
        data = [
            {
                "id": e.id,
                "name": e.name,
                "date": str(e.date),
                "amount": str(e.amount),
                "currency": e.currency,
                "entry_type": e.entry_type,
                "is_recurring": e.is_recurring,
                "recurring": (
                    {
                        "frequency": e.recurring_config.frequency,
                        "repeat_every": e.recurring_config.repeat_every,
                        "repetitions": e.recurring_config.repetitions,
                    }
                    if e.recurring_config
                    else None
                ),
            }
            for e in entries
        ]
        return JsonResponse({"entries": data})

    # POST – create entry
    if request.method == "POST":
        body = json.loads(request.body)
        try:
            entry = create_entry(
                user=request.user,
                name=body["name"],
                date=body["date"],
                amount=body["amount"],
                currency=body["currency"],
                entry_type=body["entry_type"],
                is_recurring=body.get("is_recurring", False),
                recurring_data=body.get("recurring_data"),
            )
            logger.info(
                "FIN entry create ok uid=%s entry_id=%s recurring=%s rid=%s",
                request.user.id,
                entry.id,  # type: ignore[attr-defined]
                bool(body.get("is_recurring", False)),
                getattr(request, "request_id", ""),
            )
            return JsonResponse(
                {"message": "Entry created", "id": entry.id},
                status=201,
            )
        except (ValueError, KeyError) as e:
            logger.warning(
                "FIN entry create fail uid=%s err=%s rid=%s",
                request.user.id,
                str(e),
                getattr(request, "request_id", ""),
            )
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
@jwt_required
def entry_detail(request, pk):
    # GET – single entry
    if request.method == "GET":
        try:
            e = get_entry(request.user, pk)
            logger.info(
                "FIN entry get ok uid=%s entry_id=%s rid=%s",
                request.user.id,
                pk,
                getattr(request, "request_id", ""),
            )
            return JsonResponse(
                {
                    "id": e.id,
                    "name": e.name,
                    "date": str(e.date),
                    "amount": str(e.amount),
                    "currency": e.currency,
                    "entry_type": e.entry_type,
                    "is_recurring": e.is_recurring,
                    "recurring": (
                        {
                            "frequency": e.recurring_config.frequency,
                            "repeat_every": e.recurring_config.repeat_every,
                            "repetitions": e.recurring_config.repetitions,
                        }
                        if e.recurring_config
                        else None
                    ),
                }
            )
        except ValueError as e:
            logger.warning(
                "FIN entry get fail uid=%s entry_id=%s err=%s rid=%s",
                request.user.id,
                pk,
                str(e),
                getattr(request, "request_id", ""),
            )
            return JsonResponse({"error": str(e)}, status=404)

    # PATCH – update entry
    if request.method == "PATCH":
        body = json.loads(request.body)
        try:
            entry = update_entry(request.user, pk, **body)
            logger.info(
                "FIN entry update ok uid=%s entry_id=%s rid=%s",
                request.user.id,
                entry.id,  # type: ignore[attr-defined]
                getattr(request, "request_id", ""),
            )
            return JsonResponse({"message": "Entry updated", "id": entry.id})
        except ValueError as e:
            logger.warning(
                "FIN entry update fail uid=%s entry_id=%s err=%s rid=%s",
                request.user.id,
                pk,
                str(e),
                getattr(request, "request_id", ""),
            )
            return JsonResponse({"error": str(e)}, status=400)

    # DELETE – remove entry
    if request.method == "DELETE":
        try:
            delete_entry(request.user, pk)
            logger.info(
                "FIN entry delete ok uid=%s entry_id=%s rid=%s",
                request.user.id,
                pk,
                getattr(request, "request_id", ""),
            )
            return JsonResponse({"message": "Entry deleted"})
        except ValueError as e:
            logger.warning(
                "FIN entry delete fail uid=%s entry_id=%s err=%s rid=%s",
                request.user.id,
                pk,
                str(e),
                getattr(request, "request_id", ""),
            )
            return JsonResponse({"error": str(e)}, status=404)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@jwt_required
def summary_view(request):
    if request.method != "GET":
        return JsonResponse({"error": "GET required"}, status=405)
    summary = get_balance_summary(request.user)
    logger.info(
        "FIN summary ok uid=%s rid=%s",
        request.user.id,
        getattr(request, "request_id", ""),
    )
    return JsonResponse(summary)
