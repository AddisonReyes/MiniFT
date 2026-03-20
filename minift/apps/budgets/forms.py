from __future__ import annotations

from datetime import date

from django import forms
from django.core.exceptions import ValidationError
from django.utils import timezone


MONTH_CHOICES = [
    ("1", "January"),
    ("2", "February"),
    ("3", "March"),
    ("4", "April"),
    ("5", "May"),
    ("6", "June"),
    ("7", "July"),
    ("8", "August"),
    ("9", "September"),
    ("10", "October"),
    ("11", "November"),
    ("12", "December"),
]


class BudgetCreateForm(forms.Form):
    category = forms.CharField(required=True, max_length=100)
    limit = forms.DecimalField(required=True, max_digits=10, decimal_places=2)
    month = forms.ChoiceField(required=True, choices=MONTH_CHOICES)

    def clean_category(self):
        category = (self.cleaned_data.get("category") or "").strip()
        if not category:
            raise ValidationError("Category is required")
        return category

    def clean_limit(self):
        limit = self.cleaned_data["limit"]
        if limit <= 0:
            raise ValidationError("Limit must be greater than 0")
        return limit

    def clean_month(self):
        month_s = str(self.cleaned_data.get("month") or "").strip()
        try:
            month_i = int(month_s)
        except ValueError:
            raise ValidationError("Month must be a valid month")
        if month_i < 1 or month_i > 12:
            raise ValidationError("Month must be a valid month")

        year = getattr(self, "_year", None)
        if year is None:
            year = timezone.localdate().year
        return date(int(year), month_i, 1)

    def __init__(self, *args, year=None, **kwargs):
        super().__init__(*args, **kwargs)
        self._year = year
