from django.contrib import admin
from .models import Well


@admin.register(Well)
class WellAdmin(admin.ModelAdmin):
    list_display = ["name", "area", "structure", "design_depth", "user", "sync_status"]
    list_filter = ["area", "structure", "sync_status"]
    search_fields = ["name", "area"]

    # Показываем только скважины текущего пользователя (для безопасности)
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(user=request.user)

    # Автоматически подставляем текущего пользователя при создании
    def save_model(self, request, obj, form, change):
        if not obj.user_id:
            obj.user = request.user
        super().save_model(request, obj, form, change)
