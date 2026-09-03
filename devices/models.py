from django.conf import settings
from django.db import models


# =========================
# Device
# =========================

class Device(models.Model):

    device_id = models.CharField(
        max_length=100,
        unique=True
    )

    name = models.CharField(
        max_length=100,
        blank=True
    )

    location = models.CharField(
        max_length=200,
        blank=True
    )

    # مالک دستگاه
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='devices',
        null=True,
        blank=True
    )

    is_active = models.BooleanField(
        default=True
    )

    # وضعیت بازر
    buzzer_active = models.BooleanField(
        default=False
    )

    buzzer_muted = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return self.device_id


# =========================
# Device Data
# =========================

class DeviceData(models.Model):

    device = models.ForeignKey(
        Device,
        on_delete=models.CASCADE,
        related_name='device_data',
        null=True,
        blank=True
    )

    fire = models.IntegerField(default=1)

    gas = models.IntegerField(default=1)

    temp = models.FloatField(
        null=True,
        blank=True
    )

    humidity = models.FloatField(
        null=True,
        blank=True
    )

    sensor_state = models.JSONField(
        default=dict
    )

    sent_alerts = models.JSONField(
        default=dict
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = "داده دستگاه"
        verbose_name_plural = "داده‌های دستگاه‌ها"

    def __str__(self):
        return f"Data {self.id} - {self.created_at}"


# =========================
# Alert
# =========================

class Alert(models.Model):

    ALERT_TYPES = [
        ('temperature', 'دما بالا'),
        ('humidity', 'رطوبت'),
        ('flame', 'آتش'),
        ('mq2', 'گاز / دود'),
    ]

    device = models.ForeignKey(
        Device,
        on_delete=models.CASCADE,
        related_name='alerts'
    )

    alert_type = models.CharField(
        max_length=50,
        choices=ALERT_TYPES
    )

    message = models.TextField()

    value = models.FloatField(
        null=True,
        blank=True
    )

    is_resolved = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    resolved_at = models.DateTimeField(
        null=True,
        blank=True
    )

    class Meta:
        verbose_name = "هشدار"
        verbose_name_plural = "هشدارها"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.device.device_id} - {self.alert_type}"