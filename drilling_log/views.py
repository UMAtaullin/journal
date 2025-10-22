from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Well, Layer
from .serializers import WellSerializer, LayerSerializer


@login_required
def index(request):
    """Главная страница - просто показывает статус"""
    return render(request, "index.html")


class WellViewSet(viewsets.ModelViewSet):
    serializer_class = WellSerializer
    queryset = Well.objects.all()

    def get_queryset(self):
        return Well.objects.filter(user=self.request.user)

    @action(detail=False, methods=["get"])
    def my_wells(self, request):
        wells = self.get_queryset()
        serializer = self.get_serializer(wells, many=True)
        return Response(serializer.data)


class LayerViewSet(viewsets.ModelViewSet):
    serializer_class = LayerSerializer
    queryset = Layer.objects.all()

    def get_queryset(self):
        # Показываем только слои скважин текущего пользователя
        return Layer.objects.filter(well__user=self.request.user)

    def perform_create(self, serializer):
        # Проверяем что пользователь имеет доступ к скважине
        well = serializer.validated_data["well"]
        if well.user != self.request.user:
            raise serializers.ValidationError("Нет доступа к этой скважине")
        serializer.save()

    @action(detail=False, methods=["get"])
    def well_layers(self, request):
        """Получить слои конкретной скважины"""
        well_id = request.query_params.get("well_id")
        if not well_id:
            return Response({"error": "Не указан well_id"}, status=400)

        layers = Layer.objects.filter(well_id=well_id, well__user=request.user)
        serializer = self.get_serializer(layers, many=True)
        return Response(serializer.data)
