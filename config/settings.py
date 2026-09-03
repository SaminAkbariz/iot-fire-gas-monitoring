"""
تنظیمات اصلی پروژه Django با نام config
این فایل قلب پیکربندی پروژه است
"""

import os
from pathlib import Path
from dotenv import load_dotenv


# =========================
# مسیر پایه پروژه
# =========================
# مسیر ریشه پروژه (جایی که manage.py قرار دارد)
BASE_DIR = Path(__file__).resolve().parent.parent

# بارگذاری متغیرهای محیطی از فایل .env
load_dotenv(BASE_DIR / '.env')


# =========================
# تنظیمات اولیه (فقط مناسب توسعه)
# =========================

# کلید امنیتی پروژه
# ⚠️ در محیط production نباید public باشد و نباید commit شود
SECRET_KEY = os.environ.get(
    'SECRET_KEY',
    'django-insecure-change-this-in-your-.env-file'
)

# فعال بودن حالت دیباگ
# True = نمایش خطاها (فقط برای توسعه)
DEBUG = os.environ.get('DEBUG', 'True') == 'True'

# هاست‌های مجاز
# ['*'] یعنی همه مجازند (فقط برای توسعه قابل قبول است)
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '*').split(',')


# =========================
# اپلیکیشن‌های نصب‌شده
# =========================

INSTALLED_APPS = [
    # اپ‌های پیش‌فرض Django
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # اپلیکیشن مربوط به IoT / سنسورها
    'devices.apps.DevicesConfig',
    'accounts',

]

AUTH_USER_MODEL = 'accounts.User'

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]




# =========================
# Middlewareها
# =========================
# این‌ها لایه‌هایی هستند که قبل و بعد از هر request اجرا می‌شوند

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # این باید اول باشه
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',

    # محافظت CSRF (برای API شما در View غیرفعال شده)
    'django.middleware.csrf.CsrfViewMiddleware',

    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

CORS_ALLOW_ALL_ORIGINS = True

# فایل URL اصلی پروژه
ROOT_URLCONF = 'config.urls'


# =========================
# تنظیمات Template
# =========================

TEMPLATES = [
    {
        # موتور قالب‌سازی Django
        'BACKEND': 'django.template.backends.django.DjangoTemplates',

        # مسیر templates اصلی پروژه
        'DIRS': [BASE_DIR / 'templates'],

        # فعال بودن templates داخل اپ‌ها
        'APP_DIRS': True,

        'OPTIONS': {
            'context_processors': [
                # دسترسی به request داخل template
                'django.template.context_processors.request',

                # اطلاعات کاربر لاگین‌شده
                'django.contrib.auth.context_processors.auth',

                # پیام‌ها (messages framework)
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


# تنظیم WSGI (برای اجرا روی سرور)
WSGI_APPLICATION = 'config.wsgi.application'


# =========================
# دیتابیس
# =========================

# استفاده از SQLite (ساده و مناسب پروژه‌های کوچک / دانشگاهی)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# =========================
# اعتبارسنجی رمز عبور
# =========================

AUTH_PASSWORD_VALIDATORS = [
    # جلوگیری از رمز مشابه اطلاعات کاربر
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },

    # حداقل طول رمز
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },

    # جلوگیری از رمزهای رایج
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },

    # جلوگیری از رمز فقط عددی
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# =========================
# تنظیمات زبان و زمان
# =========================

# زبان پیش‌فرض
LANGUAGE_CODE = 'en-us'

# منطقه زمانی
# ⚠️ برای ایران معمولاً 'Asia/Tehran' بهتر است
TIME_ZONE = 'UTC'

USE_I18N = True
USE_TZ = True


# =========================
# فایل‌های Static (CSS / JS / Images)
# =========================

# آدرس URL فایل‌های static
STATIC_URL = 'static/'

# مسیرهایی که Django در حالت توسعه از آن‌ها static می‌خواند
STATICFILES_DIRS = [
    BASE_DIR / "static",
]

# مسیر جمع‌آوری static برای production
STATIC_ROOT = BASE_DIR / "staticfiles"



# =========================
# تنظیمات ایمیل (SMTP Gmail)
# =========================

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

EMAIL_HOST = "smtp.gmail.com"

EMAIL_PORT = 587

EMAIL_USE_TLS = True

EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')

EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')

DEFAULT_FROM_EMAIL = EMAIL_HOST_USER

EMAIL_TIMEOUT = 30