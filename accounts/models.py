from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):

    phone = models.CharField(
        max_length=15,
        unique=True,
        blank=True,
        null=True,
        verbose_name="شماره موبایل"
    )

    address = models.TextField(
        blank=True,
        verbose_name="آدرس"
    )

    class Meta:
        verbose_name = "کاربر"
        verbose_name_plural = "کاربران"

    def __str__(self):
        full_name = f"{self.first_name} {self.last_name}".strip()

        if full_name:
            return f"{full_name} - {self.email}"

        return self.email or self.username