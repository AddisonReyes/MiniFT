import uuid

from django.db import models

from minift.apps.users.models import User


class Budget(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="budgets")
    category = models.CharField(max_length=100)
    limit = models.DecimalField(max_digits=10, decimal_places=2)
    month = models.DateField()

    class Meta:
        db_table = "budgets"
        unique_together = ["user", "category", "month"]
        ordering = ["-month", "category"]

    def __str__(self):
        return f"{self.category}: {self.limit} ({self.month.strftime('%Y-%m')})"
