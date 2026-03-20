from django.contrib import admin
from django.urls import include, path

from minift.apps.users import web_views

urlpatterns = [
    path("admin/", admin.site.urls),
    # API routes (DRF)
    path("api/auth/", include("minift.apps.users.urls")),
    path("api/transactions/", include("minift.apps.transactions.urls")),
    path("api/budgets/", include("minift.apps.budgets.urls")),
    # Web routes (templates)
    path("", web_views.dashboard_view, name="web-home"),
    path("transactions/", web_views.transactions_view, name="web-transactions"),
    path("auth/register/", web_views.register_view, name="web-register"),
    path("auth/login/", web_views.login_view, name="web-login"),
    path("auth/logout/", web_views.logout_view, name="web-logout"),
    path("auth/me/", web_views.me_view, name="web-me"),
    path(
        "transactions/create/",
        web_views.transaction_create_view,
        name="web-transaction-create",
    ),
    path(
        "transactions/<uuid:pk>/edit/",
        web_views.transaction_edit_view,
        name="web-transaction-edit",
    ),
    path(
        "transactions/<uuid:pk>/delete/",
        web_views.transaction_delete_view,
        name="web-transaction-delete",
    ),
    path("budgets/", web_views.budgets_view, name="web-budgets"),
    path("budgets/create/", web_views.budget_create_view, name="web-budget-create"),
    path(
        "budgets/<uuid:pk>/edit/",
        web_views.budget_edit_view,
        name="web-budget-edit",
    ),
    path(
        "budgets/<uuid:pk>/delete/",
        web_views.budget_delete_view,
        name="web-budget-delete",
    ),
    path(
        "transactions/summary/month/",
        web_views.monthly_summary_view,
        name="web-monthly-summary",
    ),
    path(
        "transactions/summary/categories/",
        web_views.category_summary_view,
        name="web-category-summary",
    ),
]
