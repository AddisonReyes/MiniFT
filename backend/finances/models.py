from django.db import models
from django.conf import settings


class Currency(models.TextChoices):
    USD = 'USD', 'US Dollar'
    EUR = 'EUR', 'Euro'
    MXN = 'MXN', 'Mexican Peso'
    DOP = 'DOP', 'Dominican Peso'


class EntryType(models.TextChoices):
    INCOME  = 'INCOME',  'Income'
    EXPENSE = 'EXPENSE', 'Expense'


class RecurrenceFrequency(models.TextChoices):
    DAILY   = 'DAILY',   'Daily'
    WEEKLY  = 'WEEKLY',  'Weekly'
    MONTHLY = 'MONTHLY', 'Monthly'
    YEARLY  = 'YEARLY',  'Yearly'


class RecurringConfig(models.Model):
    """Defines how often an entry repeats and for how many times."""
    
    frequency    = models.CharField(max_length=10, choices=RecurrenceFrequency.choices)
    repeat_every = models.PositiveIntegerField(help_text="Repeat every N frequency units (e.g. every 2 weeks)")
    repetitions  = models.PositiveIntegerField(help_text="Total number of times this entry repeats")

    def __str__(self):
        return f"Every {self.repeat_every} {self.frequency} × {self.repetitions}"


class Entry(models.Model):
    """Represents a single income or expense entry."""
    
    user        = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='entries')
    name        = models.CharField(max_length=255)
    date        = models.DateField()
    amount      = models.DecimalField(max_digits=12, decimal_places=2)
    currency    = models.CharField(max_length=3, choices=Currency.choices, default=Currency.USD)
    entry_type  = models.CharField(max_length=10, choices=EntryType.choices)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)
    is_recurring = models.BooleanField(default=False)
    recurring_config = models.OneToOneField(
        RecurringConfig,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='entry'
    )

    def __str__(self):
        return f"[{self.entry_type}] {self.name} - {self.amount} {self.currency}"