from rest_framework import serializers
from .models import Well


class WellSerializer(serializers.ModelSerializer):
    class Meta:
        model = Well
        fields = "__all__"
        read_only_fields = ("user", "created_at", "updated_at", "sync_status")

    def create(self, validated_data):
        """Автоматически подставляем текущего пользователя"""
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
