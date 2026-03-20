# pyright: ignore

import uuid
from datetime import date

from django.db import models
from django.conf import settings


class TransactionType(models.TextChoices):
    INCOME = "income", "Income"  # type: ignore[assignment]
    EXPENSE = "expense", "Expense"  # type: ignore[assignment]


class Transaction(models.Model):
    objects = models.Manager()

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transactions"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    type = models.CharField(max_length=7, choices=TransactionType.choices)
    category = models.CharField(max_length=100)
    note = models.CharField(max_length=255, blank=True, null=True)
    date = models.DateField(default=date.today)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "transactions"
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.type}: {self.amount} ({self.category})"
