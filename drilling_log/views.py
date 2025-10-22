from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Well
from .serializers import WellSerializer


@login_required
def index(request):
    """Главная страница - просто показывает статус"""
    return render(request, "index.html")


class WellViewSet(viewsets.ModelViewSet):
    """
    API для работы со скважинами
    """

    serializer_class = WellSerializer
    queryset = Well.objects.all()

    def get_queryset(self):
        """Показываем только скважины текущего пользователя"""
        return Well.objects.filter(user=self.request.user)

    @action(detail=False, methods=["get"])
    def my_wells(self, request):
        """Простой endpoint для получения списка скважин пользователя"""
        wells = self.get_queryset()
        serializer = self.get_serializer(wells, many=True)
        return Response(serializer.data)
