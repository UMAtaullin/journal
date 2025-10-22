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


class Layer(models.Model):
    LITHOLOGY_CHOICES = [
        ("prs", "ПРС"),
        ("peat", "Торф"),
        ("loam", "Суглинок"),
        ("sandy_loam", "Супесь"),
        ("sand", "Песок"),
    ]

    well = models.ForeignKey(Well, on_delete=models.CASCADE, related_name="layers")
    depth_from = models.FloatField(verbose_name="Глубина от (м)")
    depth_to = models.FloatField(verbose_name="Глубина до (м)")
    thickness = models.FloatField(
        verbose_name="Мощность (м)", editable=False
    )  # рассчитывается автоматически
    lithology = models.CharField(
        max_length=20, choices=LITHOLOGY_CHOICES, verbose_name="Литология"
    )
    description = models.TextField(verbose_name="Описание", blank=True)

    # Для синхронизации
    offline_id = models.CharField(max_length=100, blank=True, null=True)
    sync_status = models.CharField(
        max_length=20,
        choices=[("synced", "Synced"), ("pending", "Pending")],
        default="synced",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "layers"
        ordering = ["depth_from"]  # сортируем по глубине

    def __str__(self):
        return f"{self.well.name} - {self.depth_from}-{self.depth_to}м ({self.get_lithology_display()})"

    def save(self, *args, **kwargs):
        # Автоматически рассчитываем мощность слоя
        self.thickness = round(self.depth_to - self.depth_from, 2)
        super().save(*args, **kwargs)
