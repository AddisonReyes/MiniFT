from __future__ import annotations

from django import forms
from django.core.exceptions import ValidationError
from django.utils import timezone

from minift.apps.transactions.models import TransactionType


class TransactionCreateForm(forms.Form):
    amount = forms.DecimalField(required=True, max_digits=10, decimal_places=2)
    type = forms.ChoiceField(required=True, choices=TransactionType.choices)
    category = forms.CharField(required=True, max_length=100)
    note = forms.CharField(required=False, max_length=255)
    date = forms.DateField(required=True, input_formats=["%Y-%m-%d"])

    def clean_amount(self):
        amount = self.cleaned_data["amount"]
        if amount <= 0:
            raise ValidationError("Amount must be greater than 0")
        return amount

    def clean_category(self):
        category = (self.cleaned_data.get("category") or "").strip()
        if not category:
            raise ValidationError("Category is required")
        return category

    def clean_note(self):
        note = (self.cleaned_data.get("note") or "").strip()
        return note or None

    @classmethod
    def initial(cls):
        return {"date": timezone.localdate()}
