from django.contrib import admin
from django.urls import path, include
from minift.apps.users import web_views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("auth/", include("minift.apps.users.urls")),
    path("transactions/", include("minift.apps.transactions.urls")),
    path("budgets/", include("minift.apps.budgets.urls")),
    path("", web_views.transactions_view, name="home"),
    path("register/", web_views.register_view, name="register"),
    path("login/", web_views.login_view, name="login"),
    path("logout/", web_views.logout_view, name="logout"),
    path(
        "transactions/create/",
        web_views.transaction_create_view,
        name="transaction-create",
    ),
    path("budgets/create/", web_views.budget_create_view, name="budget-create"),
    path(
        "transactions/summary/month/",
        web_views.monthly_summary_view,
        name="monthly-summary",
    ),
    path(
        "transactions/summary/categories/",
        web_views.category_summary_view,
        name="category-summary",
    ),
    path("auth/me/", web_views.me_view, name="me"),
]
