from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WellViewSet
from . import views

# Создаем router для API
router = DefaultRouter()
router.register(r"wells", WellViewSet)

urlpatterns = [
    path("", views.index, name="index"),
    # Добавляем API URLs
    path("api/", include(router.urls)),
]
