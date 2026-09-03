from django.shortcuts import render


# این View مخصوص SPA (Single Page Application) است
# هر مسیری که توسط URLهای API یا admin match نشود
# در نهایت به این View می‌افتد
def spa(request, path=None):

    # index.html را برمی‌گرداند
    # تمام routing سمت فرانت (JS / React / Vue)
    # بعد از لود شدن این فایل انجام می‌شود
    return render(request, 'index.html')
