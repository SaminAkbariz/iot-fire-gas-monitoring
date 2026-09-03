"""
پیکربندی URLهای پروژه config

urlpatterns مسیرهای URL را به Viewها وصل می‌کند.
این فایل مشخص می‌کند هر درخواست HTTP به کدام بخش از برنامه برود.
"""

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from .views import spa


urlpatterns = [

    # پنل ادمین جنگو
    path('admin/', admin.site.urls),


path('accounts/', include('accounts.urls')),
    # =========================
    # مسیرهای API (اولویت بالا)
    # =========================

    # همه URLهای مربوط به devices
    # مثال:
    # /devices/data/
    path('devices/', include('devices.urls')),

    # مسیر API جایگزین (برای انعطاف بیشتر)
    # مثال:
    # /api/data/
    path('api/', include('devices.urls')),

    # =========================
    # SPA (فرانت‌اند)
    # =========================

    # catch-all
    # هر URLای که بالا match نشد، می‌افتد اینجا
    # مخصوص Single Page Application
    # مثلاً React / Vue / HTML + JS
    re_path(r'^.*$', spa),

] + static(
    # سرو کردن فایل‌های static (CSS, JS, images)
    # فقط مناسب توسعه (DEBUG=True)
    settings.STATIC_URL,
    document_root=settings.STATIC_ROOT
)
