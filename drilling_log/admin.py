from django.contrib import admin
from .models import Well, Layer


@admin.register(Well)
class WellAdmin(admin.ModelAdmin):
    list_display = ["name", "area", "structure", "design_depth", "user", "sync_status"]
    list_filter = ["area", "structure", "sync_status"]
    search_fields = ["name", "area"]

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(user=request.user)

    def save_model(self, request, obj, form, change):
        if not obj.user_id:
            obj.user = request.user
        super().save_model(request, obj, form, change)


@admin.register(Layer)
class LayerAdmin(admin.ModelAdmin):
    list_display = ["well", "depth_from", "depth_to", "thickness", "lithology"]
    list_filter = ["lithology", "well__area"]
    search_fields = ["well__name", "description"]

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(well__user=request.user)
