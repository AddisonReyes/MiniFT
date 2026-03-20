from django.urls import path
from minift.apps.transactions.views import (
    TransactionListCreateView,
    TransactionDetailView,
    MonthlySummaryView,
    CategorySummaryView,
)

urlpatterns = [
    path("", TransactionListCreateView.as_view(), name="transaction-list"),
    path("<uuid:pk>", TransactionDetailView.as_view(), name="transaction-detail"),
    path("summary/month", MonthlySummaryView.as_view(), name="monthly-summary"),
    path("summary/categories", CategorySummaryView.as_view(), name="category-summary"),
]
