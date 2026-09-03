from django.contrib import admin
from .models import Device, DeviceData, Alert


# =========================
# Device
# =========================

@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = [
        'device_id',
        'name',
        'location',
        'is_active',
        'created_at',
    ]

    list_filter = [
        'is_active',
    ]

    search_fields = [
        'device_id',
        'name',
        'location',
    ]

    readonly_fields = [
        'created_at',
        'updated_at',
    ]


# =========================
# Device Data
# =========================

@admin.register(DeviceData)
class DeviceDataAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'device',
        'fire',
        'gas',
        'temp',
        'humidity',
        'created_at',
    ]

    list_filter = [
        'fire',
        'gas',
    ]

    search_fields = [
        'device__device_id',
    ]

    readonly_fields = [
        'created_at',
    ]


# =========================
# Alerts
# =========================

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = [
        'device',
        'alert_type',
        'message',
        'is_resolved',
        'created_at',
    ]

    list_filter = [
        'alert_type',
        'is_resolved',
        'device',
    ]

    search_fields = [
        'device__device_id',
        'message',
    ]

    readonly_fields = [
        'created_at',
    ]

    actions = [
        'mark_as_resolved',
    ]

    @admin.action(description='برطرف کردن هشدارهای انتخاب شده')
    def mark_as_resolved(self, request, queryset):
        from django.utils import timezone

        count = queryset.update(
            is_resolved=True,
            resolved_at=timezone.now()
        )

        self.message_user(
            request,
            f"{count} هشدار برطرف شد."
        )