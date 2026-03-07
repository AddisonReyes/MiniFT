from django.contrib.auth import get_user_model
from .models import Entry, RecurringConfig

User = get_user_model()


def create_entry(user, name: str, date, amount, currency: str, entry_type: str,
                 is_recurring: bool = False, recurring_data: dict = None) -> Entry:
    """
    Create an income or expense entry.
    If is_recurring=True, pass recurring_data with keys:
        frequency, repeat_every, repetitions
    """
    recurring_config = None

    if is_recurring:
        if not recurring_data:
            raise ValueError("recurring_data is required when is_recurring=True")
        
        recurring_config = RecurringConfig.objects.create(
            frequency    = recurring_data['frequency'],
            repeat_every = recurring_data['repeat_every'],
            repetitions  = recurring_data['repetitions'],
        )

    entry = Entry.objects.create(
        user             = user,
        name             = name,
        date             = date,
        amount           = amount,
        currency         = currency,
        entry_type       = entry_type,
        is_recurring     = is_recurring,
        recurring_config = recurring_config,
    )
    
    return entry


def get_user_entries(user, entry_type: str = None):
    """Return all entries for a user, optionally filtered by type."""
    
    qs = Entry.objects.filter(user=user).select_related('recurring_config')
    if entry_type:
        qs = qs.filter(entry_type=entry_type)
        
    return qs.order_by('-date')


def get_entry(user, entry_id: int) -> Entry:
    """Return a single entry belonging to the user."""
    
    try:
        return Entry.objects.select_related('recurring_config').get(id=entry_id, user=user)
    except Entry.DoesNotExist:
        raise ValueError(f"Entry {entry_id} not found.")


def update_entry(user, entry_id: int, **fields) -> Entry:
    """Update allowed fields on an entry."""
    entry = get_entry(user, entry_id)

    allowed_fields = {'name', 'date', 'amount', 'currency', 'entry_type'}
    for field, value in fields.items():
        if field in allowed_fields:
            setattr(entry, field, value)

    # Handle recurring config update
    recurring_data = fields.get('recurring_data')
    if recurring_data and entry.recurring_config:
        for field, value in recurring_data.items():
            setattr(entry.recurring_config, field, value)
        entry.recurring_config.save()

    entry.save()
    return entry


def delete_entry(user, entry_id: int) -> None:
    """Delete an entry and its recurring config if it exists."""
    entry = get_entry(user, entry_id)
    if entry.recurring_config:
        entry.recurring_config.delete()
    entry.delete()


def get_balance_summary(user) -> dict:
    """Return total income, total expenses, and net balance for a user."""
    from django.db.models import Sum
    from .models import EntryType

    entries = Entry.objects.filter(user=user)

    total_income  = entries.filter(entry_type=EntryType.INCOME).aggregate(
        total=Sum('amount'))['total'] or 0
    total_expense = entries.filter(entry_type=EntryType.EXPENSE).aggregate(
        total=Sum('amount'))['total'] or 0

    return {
        'total_income':  total_income,
        'total_expense': total_expense,
        'balance':       total_income - total_expense,
    }