from __future__ import annotations

from django import forms
from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError

from minift.apps.users.models import User


class RegisterForm(forms.Form):
    email = forms.EmailField(required=True)
    password = forms.CharField(required=True, widget=forms.PasswordInput, min_length=8)
    currency = forms.CharField(required=True, max_length=3, initial="USD")

    def clean_email(self):
        email = self.cleaned_data["email"].strip().lower()
        if User.objects.filter(email=email).exists():
            raise ValidationError("Email already exists")
        return email

    def clean_currency(self):
        currency = (self.cleaned_data.get("currency") or "").strip().upper()
        if len(currency) != 3 or not currency.isalpha():
            raise ValidationError("Currency must be a 3-letter code (e.g. USD)")
        return currency

    def save(self) -> User:
        if not self.is_valid():
            raise ValueError("Cannot save with invalid form")
        return User.objects.create_user(
            email=self.cleaned_data["email"],
            password=self.cleaned_data["password"],
            currency=self.cleaned_data["currency"],
        )


class LoginForm(forms.Form):
    email = forms.EmailField(required=True)
    password = forms.CharField(required=True, widget=forms.PasswordInput)

    def clean(self):
        cleaned = super().clean()
        email = (cleaned.get("email") or "").strip().lower()
        password = cleaned.get("password")

        user = authenticate(self.request, username=email, password=password)
        if user is None:
            raise ValidationError("Invalid credentials")

        cleaned["user"] = user
        cleaned["email"] = email
        return cleaned

    def __init__(self, *args, request=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.request = request


class CurrencyUpdateForm(forms.Form):
    currency = forms.CharField(required=True, max_length=3)

    def clean_currency(self):
        currency = (self.cleaned_data.get("currency") or "").strip().upper()
        if len(currency) != 3 or not currency.isalpha():
            raise ValidationError("Currency must be a 3-letter code (e.g. USD)")
        return currency
