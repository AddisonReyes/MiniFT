from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError, models
from django.shortcuts import redirect, render

from minift.apps.budgets.models import Budget
from minift.apps.budgets.forms import BudgetCreateForm
from minift.apps.transactions.models import Transaction, TransactionType
from minift.apps.transactions.forms import TransactionCreateForm
from minift.apps.users.forms import CurrencyUpdateForm, LoginForm, RegisterForm
from minift.apps.users.models import User
from datetime import date


def _current_month_choice():
    today = date.today()
    return str(today.month)


def register_view(request):
    if request.method == "POST":
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect("web-home")
    else:
        form = RegisterForm()
    return render(request, "register.html", {"form": form})


def login_view(request):
    if request.method == "POST":
        form = LoginForm(request.POST, request=request)
        if form.is_valid():
            login(request, form.cleaned_data["user"])
            return redirect("web-home")
    else:
        form = LoginForm(request=request)
    return render(request, "login.html", {"form": form})


def logout_view(request):
    logout(request)
    return redirect("web-login")


@login_required
def transactions_view(request):
    transactions = Transaction.objects.filter(user=request.user).order_by(
        "-date", "-created_at"
    )

    transaction_type = request.GET.get("type")
    if transaction_type:
        transactions = transactions.filter(type=transaction_type)

    category = request.GET.get("category")
    if category:
        transactions = transactions.filter(category=category)

    from_date = request.GET.get("from")
    if from_date:
        try:
            date.fromisoformat(from_date)
            transactions = transactions.filter(date__gte=from_date)
        except ValueError:
            messages.error(request, "From date must be a valid date")

    to_date = request.GET.get("to")
    if to_date:
        try:
            date.fromisoformat(to_date)
            transactions = transactions.filter(date__lte=to_date)
        except ValueError:
            messages.error(request, "To date must be a valid date")

    return render(request, "transactions.html", {"transactions": transactions})


@login_required
def dashboard_view(request):
    today = date.today()
    start_of_month = date(today.year, today.month, 1)

    transactions = (
        Transaction.objects.filter(user=request.user)
        .order_by("-date", "-created_at")
        .all()[:10]
    )

    budgets = Budget.objects.filter(user=request.user, month=start_of_month).order_by(
        "category"
    )

    from django.db.models import Sum

    spent_by_category = {
        row["category"]: row["total"]
        for row in Transaction.objects.filter(
            user=request.user, date__gte=start_of_month, type=TransactionType.EXPENSE
        )
        .values("category")
        .annotate(total=Sum("amount"))
    }

    budget_rows = []
    for b in budgets:
        spent = spent_by_category.get(b.category) or 0
        remaining = b.limit - spent
        budget_rows.append(
            {
                "id": b.id,
                "category": b.category,
                "limit": b.limit,
                "spent": spent,
                "remaining": remaining,
            }
        )

    total_expenses = (
        Transaction.objects.filter(
            user=request.user, date__gte=start_of_month, type=TransactionType.EXPENSE
        ).aggregate(total=Sum("amount"))["total"]
        or 0
    )

    total_income = (
        Transaction.objects.filter(
            user=request.user, date__gte=start_of_month, type=TransactionType.INCOME
        ).aggregate(total=Sum("amount"))["total"]
        or 0
    )

    budgeted_limit = sum((row["limit"] for row in budget_rows), 0)
    budgeted_spent = sum((row["spent"] for row in budget_rows), 0)
    budgeted_remaining = sum((row["remaining"] for row in budget_rows), 0)

    return render(
        request,
        "dashboard.html",
        {
            "transactions": transactions,
            "budget_rows": budget_rows,
            "month_name": start_of_month.strftime("%B"),
            "total_income": total_income,
            "total_expenses": total_expenses,
            "net": total_income - total_expenses,
            "budgeted_limit": budgeted_limit,
            "budgeted_spent": budgeted_spent,
            "budgeted_remaining": budgeted_remaining,
        },
    )


@login_required
def transaction_create_view(request):
    if request.method == "POST":
        form = TransactionCreateForm(request.POST)
        if form.is_valid():
            Transaction.objects.create(
                user=request.user,
                amount=form.cleaned_data["amount"],
                type=form.cleaned_data["type"],
                category=form.cleaned_data["category"],
                note=form.cleaned_data["note"],
                date=form.cleaned_data["date"],
            )
            return redirect("web-home")
    else:
        form = TransactionCreateForm(initial=TransactionCreateForm.initial())
    return render(
        request,
        "transaction_form.html",
        {"form": form, "is_edit": False},
    )


@login_required
def transaction_edit_view(request, pk):
    transaction = Transaction.objects.filter(user=request.user, pk=pk).first()
    if transaction is None:
        messages.error(request, "Transaction not found")
        return redirect("web-home")

    if request.method == "POST":
        form = TransactionCreateForm(request.POST)
        if form.is_valid():
            transaction.amount = form.cleaned_data["amount"]
            transaction.type = form.cleaned_data["type"]
            transaction.category = form.cleaned_data["category"]
            transaction.note = form.cleaned_data["note"]
            transaction.date = form.cleaned_data["date"]
            transaction.save(
                update_fields=["amount", "type", "category", "note", "date"]
            )
            messages.success(request, "Transaction updated")
            return redirect("web-home")
    else:
        form = TransactionCreateForm(
            initial={
                "amount": transaction.amount,
                "type": transaction.type,
                "category": transaction.category,
                "note": transaction.note or "",
                "date": transaction.date,
            }
        )

    return render(
        request,
        "transaction_form.html",
        {"form": form, "is_edit": True, "transaction": transaction},
    )


@login_required
def budgets_view(request):
    budgets = Budget.objects.filter(user=request.user).order_by("-month", "category")
    return render(request, "budgets.html", {"budgets": budgets})


@login_required
def budget_create_view(request):
    if request.method == "POST":
        form = BudgetCreateForm(request.POST)
        if form.is_valid():
            try:
                Budget.objects.create(
                    user=request.user,
                    category=form.cleaned_data["category"],
                    limit=form.cleaned_data["limit"],
                    month=form.cleaned_data["month"],
                )
            except IntegrityError:
                form.add_error(
                    None,
                    "A budget for this category already exists for the selected month",
                )
            else:
                return redirect("web-budgets")
    else:
        form = BudgetCreateForm(initial={"month": _current_month_choice()})
    return render(request, "budget_form.html", {"form": form, "is_edit": False})


@login_required
def budget_edit_view(request, pk):
    budget = Budget.objects.filter(user=request.user, pk=pk).first()
    if budget is None:
        messages.error(request, "Budget not found")
        return redirect("web-budgets")

    if request.method == "POST":
        form = BudgetCreateForm(request.POST, year=budget.month.year)
        if form.is_valid():
            budget.category = form.cleaned_data["category"]
            budget.limit = form.cleaned_data["limit"]
            budget.month = form.cleaned_data["month"]
            try:
                budget.save(update_fields=["category", "limit", "month"])
            except IntegrityError:
                form.add_error(
                    None,
                    "A budget for this category already exists for the selected month",
                )
            else:
                messages.success(request, "Budget updated")
                return redirect("web-budgets")
    else:
        form = BudgetCreateForm(
            initial={
                "category": budget.category,
                "limit": budget.limit,
                "month": str(budget.month.month),
            },
            year=budget.month.year,
        )

    return render(
        request,
        "budget_form.html",
        {"form": form, "is_edit": True, "budget": budget},
    )


@login_required
def monthly_summary_view(request):
    today = date.today()
    start_of_month = date(today.year, today.month, 1)

    total_expenses = (
        Transaction.objects.filter(
            user=request.user, date__gte=start_of_month, type=TransactionType.EXPENSE
        ).aggregate(total=models.Sum("amount"))["total"]
        or 0
    )

    total_income = (
        Transaction.objects.filter(
            user=request.user, date__gte=start_of_month, type=TransactionType.INCOME
        ).aggregate(total=models.Sum("amount"))["total"]
        or 0
    )

    return render(
        request,
        "monthly_summary.html",
        {
            "month": start_of_month.isoformat(),
            "total_income": total_income,
            "total_expenses": total_expenses,
            "net": total_income - total_expenses,
        },
    )


@login_required
def category_summary_view(request):
    today = date.today()
    start_of_month = date(today.year, today.month, 1)

    from django.db.models import Sum

    categories = (
        Transaction.objects.filter(
            user=request.user, date__gte=start_of_month, type=TransactionType.EXPENSE
        )
        .values("category")
        .annotate(total=Sum("amount"))
        .order_by("-total")
    )

    return render(request, "category_summary.html", {"categories": categories})


@login_required
def me_view(request):
    if request.method == "POST":
        form = CurrencyUpdateForm(request.POST)
        if form.is_valid():
            request.user.currency = form.cleaned_data["currency"]
            request.user.save(update_fields=["currency"])
            messages.success(request, "Updated successfully")
            return redirect("web-me")
    else:
        form = CurrencyUpdateForm(initial={"currency": request.user.currency})
    return render(request, "me.html", {"user": request.user, "form": form})
