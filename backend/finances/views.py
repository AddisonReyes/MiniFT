import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from .services import (
    create_entry, get_user_entries,
    get_entry, update_entry,
    delete_entry, get_balance_summary
)


@csrf_exempt
@login_required
def entries_view(request):
    # GET – list all entries
    if request.method == 'GET':
        entry_type = request.GET.get('type')  # ?type=INCOME or ?type=EXPENSE
        entries = get_user_entries(request.user, entry_type)
        data = [
            {
                'id':           e.id,
                'name':         e.name,
                'date':         str(e.date),
                'amount':       str(e.amount),
                'currency':     e.currency,
                'entry_type':   e.entry_type,
                'is_recurring': e.is_recurring,
                'recurring': {
                    'frequency':    e.recurring_config.frequency,
                    'repeat_every': e.recurring_config.repeat_every,
                    'repetitions':  e.recurring_config.repetitions,
                } if e.recurring_config else None,
            }
            for e in entries
        ]
        return JsonResponse({'entries': data})

    # POST – create entry
    if request.method == 'POST':
        body = json.loads(request.body)
        try:
            entry = create_entry(
                user           = request.user,
                name           = body['name'],
                date           = body['date'],
                amount         = body['amount'],
                currency       = body['currency'],
                entry_type     = body['entry_type'],
                is_recurring   = body.get('is_recurring', False),
                recurring_data = body.get('recurring_data'),
            )
            return JsonResponse({'message': 'Entry created', 'id': entry.id}, status=201)
        except (ValueError, KeyError) as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
@login_required
def entry_detail(request, pk):
    # GET – single entry
    if request.method == 'GET':
        try:
            e = get_entry(request.user, pk)
            return JsonResponse({
                'id':           e.id,
                'name':         e.name,
                'date':         str(e.date),
                'amount':       str(e.amount),
                'currency':     e.currency,
                'entry_type':   e.entry_type,
                'is_recurring': e.is_recurring,
                'recurring': {
                    'frequency':    e.recurring_config.frequency,
                    'repeat_every': e.recurring_config.repeat_every,
                    'repetitions':  e.recurring_config.repetitions,
                } if e.recurring_config else None,
            })
        except ValueError as e:
            return JsonResponse({'error': str(e)}, status=404)

    # PATCH – update entry
    if request.method == 'PATCH':
        body = json.loads(request.body)
        try:
            entry = update_entry(request.user, pk, **body)
            return JsonResponse({'message': 'Entry updated', 'id': entry.id})
        except ValueError as e:
            return JsonResponse({'error': str(e)}, status=400)

    # DELETE – remove entry
    if request.method == 'DELETE':
        try:
            delete_entry(request.user, pk)
            return JsonResponse({'message': 'Entry deleted'})
        except ValueError as e:
            return JsonResponse({'error': str(e)}, status=404)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@login_required
def summary_view(request):
    if request.method != 'GET':
        return JsonResponse({'error': 'GET required'}, status=405)
    summary = get_balance_summary(request.user)
    return JsonResponse(summary)