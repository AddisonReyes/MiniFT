from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db import models
from minift.apps.users.models import User
from minift.apps.transactions.models import Transaction, TransactionType
from minift.apps.budgets.models import Budget
from datetime import date


def register_view(request):
    if request.method == "POST":
        email = request.POST.get("email")
        password = request.POST.get("password")
        currency = request.POST.get("currency", "USD")
        if User.objects.filter(email=email).exists():
            messages.error(request, "Email already exists")
        else:
            from django.contrib.auth.hashers import make_password

            user = User.objects.create(
                email=email, password_hash=make_password(password), currency=currency
            )
            login(request, user)
            return redirect("/transactions/")
    return render(request, "register.html")


def login_view(request):
    if request.method == "POST":
        email = request.POST.get("email")
        password = request.POST.get("password")
        try:
            user = User.objects.get(email=email)
            from django.contrib.auth.hashers import check_password

            if check_password(password, user.password_hash):
                login(request, user)
                return redirect("/transactions/")
            else:
                messages.error(request, "Invalid credentials")
        except User.DoesNotExist:
            messages.error(request, "Invalid credentials")
    return render(request, "login.html")


def logout_view(request):
    logout(request)
    return redirect("/auth/login/")


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
        transactions = transactions.filter(date__gte=from_date)

    to_date = request.GET.get("to")
    if to_date:
        transactions = transactions.filter(date__lte=to_date)

    return render(request, "transactions.html", {"transactions": transactions})


@login_required
def transaction_create_view(request):
    if request.method == "POST":
        Transaction.objects.create(
            user=request.user,
            amount=request.POST.get("amount"),
            type=request.POST.get("type"),
            category=request.POST.get("category"),
            note=request.POST.get("note") or None,
            date=request.POST.get("date"),
        )
        return redirect("/transactions/")
    return render(request, "transaction_form.html")


@login_required
def budgets_view(request):
    budgets = Budget.objects.filter(user=request.user).order_by("-month", "category")
    return render(request, "budgets.html", {"budgets": budgets})


@login_required
def budget_create_view(request):
    if request.method == "POST":
        month_str = request.POST.get("month")
        year, month = month_str.split("-")
        month_date = date(int(year), int(month), 1)
        Budget.objects.create(
            user=request.user,
            category=request.POST.get("category"),
            limit=request.POST.get("limit"),
            month=month_date,
        )
        return redirect("/budgets/")
    return render(request, "budget_form.html")


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
        request.user.currency = request.POST.get("currency")
        request.user.save()
        messages.success(request, "Updated successfully")
    return render(request, "me.html", {"user": request.user})
