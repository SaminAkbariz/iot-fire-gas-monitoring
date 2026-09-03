from django.shortcuts import render
from django.core.mail import send_mail
from django.conf import settings
from .models import Device, DeviceData, Alert
from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone
import json


def dashboard(request):
    return render(request, 'index.html')


# ============================================
# کلاس اصلی DeviceDataView (GET و POST)
# ============================================
@method_decorator(csrf_exempt, name='dispatch')
class DeviceDataView(View):

    def post(self, request):

        try:

            data = json.loads(request.body)
            print(f"📥 دریافت دیتا: {data}")

            device_id = data.get(
                'device_id',
                'esp32_001'
            )

            device, created = Device.objects.get_or_create(
                device_id=device_id,
                defaults={
                    'name': f'Device {device_id}'
                }
            )

            sensors = data.get(
                'sensors',
                {}
            )

            # =========================
            # MQ2 - گاز
            # =========================

            mq2_data = sensors.get(
                'mq2',
                {}
            )

            mq2_status = mq2_data.get(
                'status'
            )

            try:
                gas_value = int(
                    mq2_data.get('value')
                )
            except (ValueError, TypeError):
                gas_value = None


            # =========================
            # Flame - آتش
            # =========================

            flame_data = sensors.get(
                'flame',
                {}
            )

            flame_status = flame_data.get(
                'status'
            )

            try:
                fire_value = int(
                    flame_data.get('value')
                )
            except (ValueError, TypeError):
                fire_value = None


            # =========================
            # DHT22
            # =========================

            dht_data = sensors.get(
                'dht22',
                {}
            )

            dht_status = dht_data.get(
                'status'
            )

            try:
                temp = float(
                    dht_data.get('temperature')
                )
            except (ValueError, TypeError):
                temp = None

            try:
                humidity = float(
                    dht_data.get('humidity')
                )
            except (ValueError, TypeError):
                humidity = None


            # =========================
            # وضعیت اتصال سنسورها
            # =========================

            sensor_state = {

                'gas': (
                    mq2_status == 'ok'
                    and gas_value is not None
                ),

                'fire': (
                    flame_status == 'ok'
                    and fire_value is not None
                ),

                'temp': (
                    dht_status == 'ok'
                    and temp is not None
                ),

                'humidity': (
                    dht_status == 'ok'
                    and humidity is not None
                ),
            }


            # =========================
            # تشخیص خطر
            # =========================

            gas_danger = False
            fire_danger = False
            temp_danger = False
            humidity_danger = False


            # گاز
            # 0 = خطر
            # 1 = ایمن

            if sensor_state['gas']:

                gas_danger = (
                    gas_value == 0
                )

                print(
                    f"💨 gas_value: {gas_value}, "
                    f"gas_danger: {gas_danger}"
                )


            # آتش
            # 0 = خطر
            # 1 = ایمن

            if sensor_state['fire']:

                fire_danger = (
                    fire_value == 0
                )

                print(
                    f"🔥 fire_value: {fire_value}, "
                    f"fire_danger: {fire_danger}"
                )


            # دما

            if sensor_state['temp']:

                temp_danger = (
                    temp > 35
                )

                print(
                    f"🌡️ temp: {temp}, "
                    f"temp_danger: {temp_danger}"
                )


            # رطوبت

            if sensor_state['humidity']:

                humidity_danger = (
                    humidity > 80
                    or humidity < 20
                )

                print(
                    f"💧 humidity: {humidity}, "
                    f"humidity_danger: {humidity_danger}"
                )


            # =========================
            # خطر کلی
            # =========================

            is_danger = (
                gas_danger
                or fire_danger
                or temp_danger
                or humidity_danger
            )

            print(
                f"⚠️ is_danger: {is_danger}"
            )

            # ============================================================
            # کنترل بازر
            # ============================================================

            if is_danger:

                # خطر وجود دارد
                if not device.buzzer_muted:

                    device.buzzer_active = True

                    print(
                        "🚨 خطر وجود دارد -> Buzzer ON"
                    )

                else:

                    print(
                        "🔕 Buzzer توسط کاربر MUTE شده است"
                    )

            else:

                # وضعیت امن است
                # نکته مهم:
                # buzzer_active دستی را تغییر نمی‌دهیم.
                # فقط mute را ریست می‌کنیم تا در خطر بعدی
                # بازر بتواند دوباره خودکار فعال شود.

                device.buzzer_muted = False

                print(
                    "✅ وضعیت امن است -> وضعیت دستی بازر حفظ شد"
                )

            device.save(
                update_fields=[
                    'buzzer_active',
                    'buzzer_muted',
                    'updated_at'
                ]
            )

            print(
                f"🔔 buzzer_active = "
                f"{device.buzzer_active}"
            )

            print(
                f"🔕 buzzer_muted = "
                f"{device.buzzer_muted}"
            )

            # ============================================================
            # سیستم ایمیل هشدار
            # ============================================================

            sent_alerts = {}


            # ============================================================
            # تابع داخلی ارسال هشدار
            # ============================================================

            def process_alert(
                alert_type,
                message,
                value=None
            ):

                # بررسی اینکه این هشدار قبلاً فعال شده یا نه

                existing_alert = Alert.objects.filter(
                    device=device,
                    alert_type=alert_type,
                    is_resolved=False
                ).first()


                # اگر قبلاً هشدار فعال وجود دارد
                # دوباره ایمیل نفرست.

                if existing_alert:

                    print(
                        f"📭 هشدار تکراری ارسال نشد: "
                        f"{alert_type}"
                    )

                    sent_alerts[alert_type] = False

                    return


                # ایجاد هشدار جدید در دیتابیس

                Alert.objects.create(
                    device=device,
                    alert_type=alert_type,
                    message=message,
                    value=value
                )


                # پیدا کردن صاحب دستگاه

                device_owner = device.user


                if device_owner and device_owner.email:

                    recipient_list = [
                        device_owner.email
                    ]

                    print(
                        f"📧 ارسال ایمیل به کاربر: "
                        f"{device_owner.username}"
                    )

                else:

                    recipient_list = [
                        settings.DEFAULT_FROM_EMAIL
                    ]

                    print(
                        "⚠️ دستگاه صاحب ندارد، "
                        "ارسال به DEFAULT_FROM_EMAIL"
                    )


                # =========================
                # ارسال واقعی ایمیل
                # =========================

                try:

                    sent_count = send_mail(

                        subject='⚠️ هشدار سیستم',

                        message=message,

                        from_email=(
                            settings.DEFAULT_FROM_EMAIL
                        ),

                        recipient_list=recipient_list,

                        fail_silently=False
                    )


                    if sent_count > 0:

                        print(
                            f"✅ ایمیل با موفقیت ارسال شد: "
                            f"{recipient_list}"
                        )

                        sent_alerts[
                            alert_type
                        ] = True

                    else:

                        print(
                            "⚠️ Django ایمیل را ارسال نکرد."
                        )

                        sent_alerts[
                            alert_type
                        ] = False


                except Exception as email_error:

                    print(
                        "❌ خطا در ارسال ایمیل:"
                    )

                    print(
                        f"❌ {type(email_error).__name__}: "
                        f"{email_error}"
                    )

                    sent_alerts[
                        alert_type
                    ] = False


            # ============================================================
            # بررسی هشدارها
            # ============================================================


            if fire_danger:

                process_alert(

                    alert_type='flame',

                    message=(
                        '⚠️ هشدار سیستم\n\n'
                        '🔥 آتش تشخیص داده شد.\n'
                        'لطفاً فوراً دستگاه را بررسی کنید.'
                    ),

                    value=fire_value
                )


            if gas_danger:

                process_alert(

                    alert_type='mq2',

                    message=(
                        '⚠️ هشدار سیستم\n\n'
                        '💨 دود / گاز تشخیص داده شد.\n'
                        'لطفاً فوراً دستگاه را بررسی کنید.'
                    ),

                    value=gas_value
                )


            if temp_danger:

                process_alert(

                    alert_type='temperature',

                    message=(
                        '⚠️ هشدار سیستم\n\n'
                        f'🌡 دمای بالا تشخیص داده شد.\n'
                        f'دمای فعلی: {temp}°C\n'
                        'لطفاً فوراً دستگاه را بررسی کنید.'
                    ),

                    value=temp
                )


            if humidity_danger:

                process_alert(

                    alert_type='humidity',

                    message=(
                        '⚠️ هشدار سیستم\n\n'
                        f'💧 رطوبت غیرعادی تشخیص داده شد.\n'
                        f'رطوبت فعلی: {humidity}%\n'
                        'لطفاً فوراً دستگاه را بررسی کنید.'
                    ),

                    value=humidity
                )


            # ============================================================
            # رفع هشدارهایی که دیگر وجود ندارند
            # ============================================================

            danger_status = {

                'flame': fire_danger,

                'mq2': gas_danger,

                'temperature': temp_danger,

                'humidity': humidity_danger
            }


            for alert_type, active in danger_status.items():

                if not active:

                    Alert.objects.filter(

                        device=device,

                        alert_type=alert_type,

                        is_resolved=False

                    ).update(

                        is_resolved=True,

                        resolved_at=timezone.now()
                    )


            # ============================================================
            # ذخیره داده سنسورها
            # ============================================================

            obj = DeviceData.objects.create(

                device=device,

                # 0 = خطر
                # 1 = ایمن

                fire=(
                    0
                    if fire_danger
                    else 1
                ),

                gas=(
                    0
                    if gas_danger
                    else 1
                ),

                temp=temp,

                humidity=humidity,

                sensor_state=sensor_state,

                sent_alerts=sent_alerts
            )


            # ============================================================
            # پاسخ
            # ============================================================

            response_data = {

                'status': 'ok',

                'id': obj.id,

                'fire': obj.fire,

                'gas': obj.gas,

                'temp': temp,

                'humidity': humidity,

                'danger': int(is_danger),

                'sensor_state': sensor_state,

                'buzzer_active': (
                    device.buzzer_active
                ),

                'buzzer_muted': (
                    device.buzzer_muted
                ),

                'created_at': obj.created_at,

                'device_id': device.device_id,
            }


            return JsonResponse(
                response_data
            )


        except Exception as e:

            print(
                f"❌ خطا: {str(e)}"
            )

            return JsonResponse(
                {
                    'error': str(e)
                },
                status=400
            )


    # ============================================================
    # GET
    # ============================================================

    def get(self, request):

        if request.GET.get('all') == '1':

            data = []

            for obj in DeviceData.objects.select_related(
                'device'
            ).order_by(
                '-created_at'
            )[:50]:

                danger = (
                    obj.fire == 0
                    or obj.gas == 0
                    or (
                        obj.temp is not None
                        and obj.temp > 35
                    )
                    or (
                        obj.humidity is not None
                        and (
                            obj.humidity > 80
                            or obj.humidity < 20
                        )
                    )
                )


                data.append({

                    'fire': obj.fire,

                    'gas': obj.gas,

                    'temp': obj.temp,

                    'humidity': obj.humidity,

                    'danger': int(danger),

                    'created_at': obj.created_at,

                    'sensor_state': (
                        obj.sensor_state
                    ),

                    'device_id': (
                        obj.device.device_id
                        if obj.device
                        else None
                    ),
                })


            return JsonResponse(
                data,
                safe=False
            )


        obj = DeviceData.objects.select_related(
            'device'
        ).order_by(
            '-created_at'
        ).first()


        if obj:

            danger = (
                obj.fire == 0
                or obj.gas == 0
                or (
                    obj.temp is not None
                    and obj.temp > 35
                )
                or (
                    obj.humidity is not None
                    and (
                        obj.humidity > 80
                        or obj.humidity < 20
                    )
                )
            )


            response_data = {

                'fire': obj.fire,

                'gas': obj.gas,

                'temp': obj.temp,

                'humidity': obj.humidity,

                'danger': int(danger),

                'created_at': obj.created_at,

                'sensor_state': (
                    obj.sensor_state
                ),

                'device_id': (
                    obj.device.device_id
                    if obj.device
                    else None
                ),
            }


            return JsonResponse(
                response_data
            )


        return JsonResponse(
            {
                'error': 'no data'
            },
            status=404
        )


# ============================================
# کلاس DeviceDataListView
# ============================================

class DeviceDataListView(View):

    def get(self, request):

        data = []

        for obj in DeviceData.objects.select_related(
            'device'
        ).order_by(
            '-created_at'
        )[:100]:

            danger = (
                obj.fire == 0
                or obj.gas == 0
                or (
                    obj.temp is not None
                    and obj.temp > 35
                )
                or (
                    obj.humidity is not None
                    and (
                        obj.humidity > 80
                        or obj.humidity < 20
                    )
                )
            )


            data.append({

                'fire': obj.fire,

                'gas': obj.gas,

                'temp': obj.temp,

                'humidity': obj.humidity,

                'danger': int(danger),

                'created_at': obj.created_at,

                'sensor_state': (
                    obj.sensor_state
                ),

                'device_id': (
                    obj.device.device_id
                    if obj.device
                    else None
                ),
            })


        return JsonResponse(
            data,
            safe=False
        )


# ============================================================
# کنترل بازر توسط سایت
# ============================================================

@method_decorator(csrf_exempt, name='dispatch')
class BuzzerControlView(View):

    def post(self, request):

        try:

            data = json.loads(
                request.body or '{}'
            )

            device_id = data.get(
                'device_id',
                'esp32_001'
            )

            action = data.get(
                'action'
            )


            device = Device.objects.filter(
                device_id=device_id
            ).first()


            if not device:

                return JsonResponse(

                    {
                        'success': False,

                        'error': 'دستگاه پیدا نشد'
                    },

                    status=404
                )


            # =========================
            # خاموش کردن دستی
            # =========================

            if action == 'off':

                device.buzzer_active = False

                device.buzzer_muted = True

                device.save(
                    update_fields=[
                        'buzzer_active',
                        'buzzer_muted',
                        'updated_at'
                    ]
                )


                print(
                    f'🔕 Buzzer OFF | '
                    f'Device: {device.device_id}'
                )


            # =========================
            # روشن کردن دستی
            # =========================

            elif action == 'on':

                device.buzzer_active = True

                device.buzzer_muted = False

                device.save(
                    update_fields=[
                        'buzzer_active',
                        'buzzer_muted',
                        'updated_at'
                    ]
                )


                print(
                    f'🔔 Buzzer ON | '
                    f'Device: {device.device_id}'
                )


            else:

                return JsonResponse(

                    {
                        'success': False,

                        'error': 'action نامعتبر است'
                    },

                    status=400
                )


            return JsonResponse(

                {
                    'success': True,

                    'device_id': (
                        device.device_id
                    ),

                    'buzzer_active': (
                        device.buzzer_active
                    ),

                    'buzzer_muted': (
                        device.buzzer_muted
                    )
                }
            )


        except Exception as e:

            print(
                f'❌ Buzzer Error: {str(e)}'
            )

            return JsonResponse(

                {
                    'success': False,

                    'error': str(e)
                },

                status=400
            )


# ============================================================
# دریافت وضعیت بازر توسط ESP32
# ============================================================

class BuzzerStatusView(View):

    def get(self, request):

        device_id = request.GET.get(
            'device_id',
            'esp32_001'
        )


        device = Device.objects.filter(
            device_id=device_id
        ).first()


        if not device:

            return JsonResponse(

                {
                    'success': False,

                    'error': 'دستگاه پیدا نشد'
                },

                status=404
            )


        return JsonResponse(

            {
                'success': True,

                'device_id': (
                    device.device_id
                ),

                'buzzer_active': (
                    device.buzzer_active
                ),

                'buzzer_muted': (
                    device.buzzer_muted
                )
            }
        )