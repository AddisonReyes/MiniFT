from rest_framework import serializers
from minift.apps.transactions.models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = [
            "id",
            "user_id",
            "amount",
            "type",
            "category",
            "note",
            "date",
            "created_at",
        ]
        read_only_fields = ["id", "user_id", "created_at"]


class TransactionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ["amount", "type", "category", "note", "date"]
