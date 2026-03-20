from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from minift.apps.users.models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    model = User

    ordering = ("email",)
    list_display = ("email", "currency", "is_staff", "is_active", "created_at")
    search_fields = ("email",)

    fieldsets = (
        (None, {"fields": ("email", "password", "currency")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "created_at")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "password1",
                    "password2",
                    "currency",
                    "is_staff",
                    "is_active",
                ),
            },
        ),
    )

    readonly_fields = ("created_at", "last_login")
