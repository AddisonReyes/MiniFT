from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

from django import template

register = template.Library()


_SYMBOLS = {
    "DOP": "$",
    "USD": "$",
    "EUR": "€",
    "GBP": "£",
    "JPY": "¥",
    "CNY": "¥",
    "INR": "₹",
    "KRW": "₩",
    "RUB": "₽",
    "TRY": "₺",
    "AUD": "$",
    "CAD": "$",
    "HKD": "$",
    "MXN": "$",
    "NZD": "$",
    "SGD": "$",
}


@register.filter(name="money")
def money(value, currency: str = "USD") -> str:
    """Format a numeric value as currency for UI.

    Example: 8990.00 -> $8,990.0
    """

    if value is None or value == "":
        return ""

    try:
        amount = value if isinstance(value, Decimal) else Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return str(value)

    amount = amount.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)

    sign = "-" if amount < 0 else ""
    amount = abs(amount)

    rendered = f"{amount:,.1f}"

    code = (currency or "USD").upper()
    symbol = _SYMBOLS.get(code)
    if symbol:
        return f"{sign}{symbol}{rendered}"
    return f"{sign}{code} {rendered}"
