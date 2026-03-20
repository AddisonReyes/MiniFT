from __future__ import annotations

import uuid
from datetime import date
from typing import cast

from django.db import models
from django.conf import settings


class Budget(models.Model):
    objects = models.Manager()

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="budgets"
    )
    category = models.CharField(max_length=100)
    limit = models.DecimalField(max_digits=10, decimal_places=2)
    month = models.DateField()

    class Meta:
        db_table = "budgets"
        unique_together = ["user", "category", "month"]
        ordering = ["-month", "category"]

    def __str__(self):
        month = cast(date, self.month)
        return f"{self.category}: {self.limit} ({month.strftime('%Y-%m')})"
