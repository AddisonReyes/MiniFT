from django.urls import path

from minift.apps.budgets.views import BudgetDetailView, BudgetListCreateView

urlpatterns = [
    path("", BudgetListCreateView.as_view(), name="budget-list"),
    path("<uuid:pk>/", BudgetDetailView.as_view(), name="budget-detail"),
]
