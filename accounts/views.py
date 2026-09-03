import json

from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required

from .models import User


def user_to_dict(user):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'full_name': f'{user.first_name} {user.last_name}'.strip(),
        'phone': user.phone or '',
        'address': user.address or '',
        'date_joined': user.date_joined.strftime('%Y-%m-%d %H:%M:%S'),
    }


# ============================================================
# REGISTER
# ============================================================

@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(View):

    def post(self, request):

        print('\n')
        print('========================================')
        print('🚀 REGISTER VIEW CALLED')
        print('========================================')
        print('METHOD:', request.method)
        print('PATH:', request.path)
        print('BODY:', request.body)

        try:

            # -----------------------------
            # JSON
            # -----------------------------

            try:
                data = json.loads(request.body)
            except json.JSONDecodeError as e:

                print('❌ JSON ERROR:', repr(e))

                return JsonResponse({
                    'success': False,
                    'error': 'اطلاعات ارسالی JSON معتبر نیست'
                }, status=400)

            print('📦 DATA:', data)

            # -----------------------------
            # دریافت اطلاعات
            # -----------------------------

            email = str(
                data.get('email', '')
            ).strip().lower()

            password = str(
                data.get('password', '')
            )

            full_name = str(
                data.get('full_name', '')
            ).strip()

            phone = str(
                data.get('phone', '')
            ).strip()

            address = str(
                data.get('address', '')
            ).strip()

            print('📧 EMAIL:', email)
            print('👤 FULL NAME:', full_name)
            print('📱 PHONE:', phone)
            print('🏠 ADDRESS:', address)

            # -----------------------------
            # Validation
            # -----------------------------

            if not email:
                return JsonResponse({
                    'success': False,
                    'error': 'ایمیل الزامی است'
                }, status=400)

            if not password:
                return JsonResponse({
                    'success': False,
                    'error': 'رمز عبور الزامی است'
                }, status=400)

            if not full_name:
                return JsonResponse({
                    'success': False,
                    'error': 'نام و نام خانوادگی الزامی است'
                }, status=400)

            if len(password) < 6:
                return JsonResponse({
                    'success': False,
                    'error': 'رمز عبور باید حداقل ۶ کاراکتر باشد'
                }, status=400)

            # -----------------------------
            # Name
            # -----------------------------

            parts = full_name.split()

            first_name = parts[0]

            last_name = (
                ' '.join(parts[1:])
                if len(parts) > 1
                else ''
            )

            # -----------------------------
            # Duplicate email
            # -----------------------------

            if User.objects.filter(
                username=email
            ).exists():

                print('❌ USERNAME EXISTS')

                return JsonResponse({
                    'success': False,
                    'error': 'این ایمیل قبلاً ثبت شده است'
                }, status=400)

            if User.objects.filter(
                email=email
            ).exists():

                print('❌ EMAIL EXISTS')

                return JsonResponse({
                    'success': False,
                    'error': 'این ایمیل قبلاً ثبت شده است'
                }, status=400)

            # -----------------------------
            # Duplicate phone
            # -----------------------------

            if phone:

                if User.objects.filter(
                    phone=phone
                ).exists():

                    print('❌ PHONE EXISTS')

                    return JsonResponse({
                        'success': False,
                        'error': 'این شماره موبایل قبلاً ثبت شده است'
                    }, status=400)

            # -----------------------------
            # CREATE USER
            # -----------------------------

            print('🟡 CREATING USER...')

            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                phone=phone if phone else None,
                address=address
            )

            print('🟢 USER CREATED!')
            print('🆔 USER ID:', user.id)
            print('📧 USER EMAIL:', user.email)
            print('👤 USERNAME:', user.username)

            # -----------------------------
            # Verify database
            # -----------------------------

            saved_user = User.objects.filter(
                id=user.id
            ).first()

            print(
                '🔎 DATABASE CHECK:',
                saved_user
            )

            if not saved_user:

                print('❌ USER WAS NOT SAVED TO DATABASE')

                return JsonResponse({
                    'success': False,
                    'error': 'کاربر ساخته نشد'
                }, status=500)

            # -----------------------------
            # LOGIN
            # -----------------------------

            login(request, user)

            print('🔐 LOGIN SESSION CREATED')

            # -----------------------------
            # FINAL RESPONSE
            # -----------------------------

            response_data = {
                'success': True,
                'message': 'ثبت‌نام با موفقیت انجام شد',
                'user': user_to_dict(user)
            }

            print('📤 RESPONSE:', response_data)

            print('========================================')
            print('✅ REGISTER FINISHED SUCCESSFULLY')
            print('========================================')
            print('\n')

            return JsonResponse(
                response_data,
                status=200
            )

        except Exception as e:

            print('\n')
            print('========================================')
            print('❌ REGISTER EXCEPTION')
            print('========================================')
            print(repr(e))
            print('========================================')
            print('\n')

            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)


# ============================================================
# LOGIN
# ============================================================

@method_decorator(csrf_exempt, name='dispatch')
class LoginView(View):

    def post(self, request):

        print('🔐 LOGIN VIEW CALLED')

        try:

            data = json.loads(request.body)

            email = str(
                data.get('email', '')
            ).strip().lower()

            password = str(
                data.get('password', '')
            )

            if not email or not password:

                return JsonResponse({
                    'success': False,
                    'error': 'ایمیل و رمز عبور الزامی است'
                }, status=400)

            user = authenticate(
                request,
                username=email,
                password=password
            )

            if user is None:

                return JsonResponse({
                    'success': False,
                    'error': 'ایمیل یا رمز عبور اشتباه است'
                }, status=401)

            if not user.is_active:

                return JsonResponse({
                    'success': False,
                    'error': 'حساب کاربری غیرفعال است'
                }, status=403)

            login(request, user)

            print('✅ LOGIN SUCCESS:', user.email)

            return JsonResponse({
                'success': True,
                'message': 'ورود با موفقیت انجام شد',
                'user': user_to_dict(user)
            })

        except Exception as e:

            print('❌ LOGIN ERROR:', repr(e))

            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)


# ============================================================
# LOGOUT
# ============================================================

@method_decorator(csrf_exempt, name='dispatch')
class LogoutView(View):

    def post(self, request):

        print('🚪 LOGOUT VIEW CALLED')

        try:

            logout(request)

            return JsonResponse({
                'success': True,
                'message': 'با موفقیت از حساب خارج شدید'
            })

        except Exception as e:

            print('❌ LOGOUT ERROR:', repr(e))

            return JsonResponse({
                'success': False,
                'error': 'خطایی هنگام خروج رخ داد'
            }, status=500)


# ============================================================
# ME
# ============================================================

class MeView(View):

    def get(self, request):

        print('👤 ME VIEW CALLED')
        print('AUTHENTICATED:', request.user.is_authenticated)

        if not request.user.is_authenticated:

            return JsonResponse({
                'success': True,
                'authenticated': False,
                'user': None
            })

        return JsonResponse({
            'success': True,
            'authenticated': True,
            'user': user_to_dict(request.user)
        })


# ============================================================
# PROFILE
# ============================================================

@method_decorator(csrf_exempt, name='dispatch')
class ProfileView(View):

    def post(self, request):

        print('✏️ PROFILE VIEW CALLED')

        if not request.user.is_authenticated:

            return JsonResponse({
                'success': False,
                'error': 'وارد حساب کاربری نشده‌اید'
            }, status=401)

        try:

            data = json.loads(request.body)

            full_name = str(
                data.get('full_name', '')
            ).strip()

            phone = str(
                data.get('phone', '')
            ).strip()

            address = str(
                data.get('address', '')
            ).strip()

            if not full_name:

                return JsonResponse({
                    'success': False,
                    'error': 'نام و نام خانوادگی الزامی است'
                }, status=400)

            parts = full_name.split()

            request.user.first_name = parts[0]

            request.user.last_name = (
                ' '.join(parts[1:])
                if len(parts) > 1
                else ''
            )

            request.user.phone = (
                phone
                if phone
                else None
            )

            request.user.address = address

            request.user.save()

            print('✅ PROFILE UPDATED')

            return JsonResponse({
                'success': True,
                'message': 'اطلاعات با موفقیت ذخیره شد',
                'user': user_to_dict(request.user)
            })

        except Exception as e:

            print('❌ PROFILE ERROR:', repr(e))

            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)