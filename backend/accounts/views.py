import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt  
from django.contrib.auth.decorators import login_required
from .services import register_user, login_user, logout_user


@csrf_exempt
def register_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    data = json.loads(request.body)
    try:
        user = register_user(data['email'], data['password'])
        return JsonResponse({'message': 'User created', 'id': user.id}, status=201)
    except (ValueError, KeyError) as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
def login_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    data = json.loads(request.body)
    try:
        user = login_user(request, data['email'], data['password'])
        return JsonResponse({'message': 'Login successful', 'id': user.id})
    except (ValueError, KeyError) as e:
        return JsonResponse({'error': str(e)}, status=401)


@login_required
def logout_view(request):
    logout_user(request)
    return JsonResponse({'message': 'Logged out'})