from datetime import date

from django.db.models import Q, Sum
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from minift.apps.transactions.models import Transaction, TransactionType
from minift.apps.transactions.serializers import (
    TransactionCreateSerializer,
    TransactionSerializer,
)


class TransactionListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        transactions = Transaction.objects.filter(user=request.user)

        transaction_type = request.query_params.get("type")
        if transaction_type:
            transactions = transactions.filter(type=transaction_type)

        category = request.query_params.get("category")
        if category:
            transactions = transactions.filter(category=category)

        from_date = request.query_params.get("from")
        if from_date:
            transactions = transactions.filter(date__gte=from_date)

        to_date = request.query_params.get("to")
        if to_date:
            transactions = transactions.filter(date__lte=to_date)

        return Response(TransactionSerializer(transactions, many=True).data)

    def post(self, request):
        serializer = TransactionCreateSerializer(data=request.data)
        if serializer.is_valid():
            transaction = serializer.save(user=request.user)
            return Response(
                TransactionSerializer(transaction).data, status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TransactionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return Transaction.objects.get(pk=pk, user=user)
        except Transaction.DoesNotExist:
            return None

    def get(self, request, pk):
        transaction = self.get_object(pk, request.user)
        if not transaction:
            return Response(
                {"error": "Transaction not found"}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(TransactionSerializer(transaction).data)

    def patch(self, request, pk):
        transaction = self.get_object(pk, request.user)
        if not transaction:
            return Response(
                {"error": "Transaction not found"}, status=status.HTTP_404_NOT_FOUND
            )
        serializer = TransactionCreateSerializer(
            transaction, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(TransactionSerializer(transaction).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        transaction = self.get_object(pk, request.user)
        if not transaction:
            return Response(
                {"error": "Transaction not found"}, status=status.HTTP_404_NOT_FOUND
            )
        transaction.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MonthlySummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
        start_of_month = date(today.year, today.month, 1)

        transactions = Transaction.objects.filter(
            user=request.user, date__gte=start_of_month, type=TransactionType.EXPENSE
        )

        total_expenses = transactions.aggregate(total=Sum("amount"))["total"] or 0

        income_transactions = Transaction.objects.filter(
            user=request.user, date__gte=start_of_month, type=TransactionType.INCOME
        )
        total_income = income_transactions.aggregate(total=Sum("amount"))["total"] or 0

        return Response(
            {
                "month": start_of_month.isoformat(),
                "total_income": total_income,
                "total_expenses": total_expenses,
                "net": total_income - total_expenses,
            }
        )


class CategorySummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
        start_of_month = date(today.year, today.month, 1)

        transactions = Transaction.objects.filter(
            user=request.user, date__gte=start_of_month, type=TransactionType.EXPENSE
        )

        categories = (
            transactions.values("category")
            .annotate(total=Sum("amount"))
            .order_by("-total")
        )

        return Response(
            [
                {"category": item["category"], "total": item["total"]}
                for item in categories
            ]
        )
