from django.contrib.auth import authenticate, login, logout
from django.contrib.auth import get_user_model

User = get_user_model()

def register_user(email: str, password: str) -> User:
    """Create and return a new user."""
    if User.objects.filter(email=email).exists():
        raise ValueError("A user with this email already exists.")
    return User.objects.create_user(email=email, password=password)

def login_user(request, email: str, password: str) -> User:
    """Authenticate and log in a user. Returns user or raises exception."""
    user = authenticate(request, username=email, password=password)
    
    if user is None:
        raise ValueError("Invalid credentials.")
    if not user.is_active:
        raise ValueError("This account is inactive.")
    
    login(request, user)
    return user

def logout_user(request) -> None:
    """Log out the current user and flush the session."""
    logout(request)