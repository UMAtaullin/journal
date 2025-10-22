from django.db import models
from django.contrib.auth.models import User


class Well(models.Model):
    name = models.CharField(max_length=255, verbose_name="Название скважины")
    area = models.CharField(max_length=255, verbose_name="Участок")
    structure = models.CharField(max_length=255, verbose_name="Сооружение")
    design_depth = models.FloatField(verbose_name="Проектная глубина")

    # Для синхронизации
    offline_id = models.CharField(max_length=100, blank=True, null=True)
    sync_status = models.CharField(
        max_length=20,
        choices=[("synced", "Synced"), ("pending", "Pending")],
        default="synced",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    user = models.ForeignKey(User, on_delete=models.CASCADE)

    class Meta:
        db_table = "wells"

    def __str__(self):
        return self.name
