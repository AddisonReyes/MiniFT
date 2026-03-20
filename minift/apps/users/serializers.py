from rest_framework import serializers
from minift.apps.users.models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "currency", "created_at"]
        read_only_fields = ["id", "created_at"]


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["email", "password", "currency"]

    def create(self, validated_data):
        from django.contrib.auth.hashers import make_password

        user = User.objects.create(
            email=validated_data["email"],
            password_hash=make_password(validated_data["password"]),
            currency=validated_data.get("currency", "USD"),
        )
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["currency"]


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
