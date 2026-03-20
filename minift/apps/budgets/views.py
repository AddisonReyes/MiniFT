from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from minift.apps.budgets.models import Budget
from minift.apps.budgets.serializers import (
    BudgetSerializer,
    BudgetCreateSerializer,
)


class BudgetListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        budgets = Budget.objects.filter(user=request.user)
        return Response(BudgetSerializer(budgets, many=True).data)

    def post(self, request):
        serializer = BudgetCreateSerializer(data=request.data)
        if serializer.is_valid():
            budget = serializer.save(user=request.user)
            return Response(
                BudgetSerializer(budget).data, status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BudgetDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return Budget.objects.get(pk=pk, user=user)
        except Budget.DoesNotExist:
            return None

    def patch(self, request, pk):
        budget = self.get_object(pk, request.user)
        if not budget:
            return Response(
                {"error": "Budget not found"}, status=status.HTTP_404_NOT_FOUND
            )
        serializer = BudgetCreateSerializer(budget, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(BudgetSerializer(budget).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        budget = self.get_object(pk, request.user)
        if not budget:
            return Response(
                {"error": "Budget not found"}, status=status.HTTP_404_NOT_FOUND
            )
        budget.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
