from django.urls import path

from .views import (
    DeviceDataView,
    DeviceDataListView,
    BuzzerControlView,
    BuzzerStatusView,
)


urlpatterns = [

    path(
        'data/',
        DeviceDataView.as_view(),
        name='device-data'
    ),

    path(
        'data/all/',
        DeviceDataListView.as_view(),
        name='device-data-all'
    ),

    path(
        'buzzer/',
        BuzzerControlView.as_view(),
        name='buzzer-control'
    ),

    path(
        'buzzer/status/',
        BuzzerStatusView.as_view(),
        name='buzzer-status'
    ),
]