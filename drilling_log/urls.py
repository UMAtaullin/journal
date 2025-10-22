from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WellViewSet, LayerViewSet, index

router = DefaultRouter()
router.register(r"wells", WellViewSet)
router.register(r"layers", LayerViewSet)  # добавляем URLs для слоев

urlpatterns = [
    path("", index, name="index"),
    path("api/", include(router.urls)),
]
