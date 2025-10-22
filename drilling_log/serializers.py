from rest_framework import serializers
from .models import Well, Layer


class LayerSerializer(serializers.ModelSerializer):
    lithology_display = serializers.CharField(
        source="get_lithology_display", read_only=True
    )

    class Meta:
        model = Layer
        fields = "__all__"
        read_only_fields = ("thickness", "created_at", "updated_at", "sync_status")


class WellSerializer(serializers.ModelSerializer):
    layers = LayerSerializer(many=True, read_only=True)

    class Meta:
        model = Well
        fields = "__all__"
        read_only_fields = ("user", "created_at", "updated_at", "sync_status")

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
