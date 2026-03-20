from rest_framework import serializers
from minift.apps.budgets.models import Budget


class BudgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Budget
        fields = ["id", "user_id", "category", "limit", "month"]
        read_only_fields = ["id", "user_id"]


class BudgetCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Budget
        fields = ["category", "limit", "month"]
