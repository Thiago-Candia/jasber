import re

import bcrypt
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.db import models
from django.db.models.functions import Lower

from apps.core.validation import BLANK, INVALID, TAKEN, Errors, is_blank, too_long, too_short

# Aproximación de URI::MailTo::EMAIL_REGEXP de Ruby.
EMAIL_REGEXP = re.compile(
    r"\A[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?"
    r"(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\Z"
)
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_BYTES = 72  # límite de bcrypt que aplica has_secure_password
MAX_STRING_LENGTH = 255  # largo de las columnas varchar


class UserManager(BaseUserManager):
    def get_by_natural_key(self, username):
        return self.get(email=(username or "").lower())

    def create_user(self, email, password=None, **fields):
        user = self.model(email=email, **fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, password=None, **fields):
        fields["admin"] = True
        return self.create_user(email, password, **fields)


class User(AbstractBaseUser):
    name = models.CharField("nombre", max_length=255)
    email = models.CharField("email", max_length=255, unique=True)
    # Misma columna que `has_secure_password` en Rails.
    password = models.CharField("contraseña", max_length=255, db_column="password_digest")
    admin = models.BooleanField(default=False, db_default=False)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    reset_password_token = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    reset_password_sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    EMAIL_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    objects = UserManager()

    class Meta:
        db_table = "users"
        verbose_name = "usuario"
        constraints = [models.UniqueConstraint(Lower("email"), name="users_email_ci_unique")]

    def __str__(self):
        return f"{self.name} <{self.email}>"

    # --- permisos del Django Admin: solo usuarios con `admin = true` (como Admin::BaseController)
    @property
    def is_staff(self):
        return self.admin

    @property
    def is_superuser(self):
        return self.admin

    def has_perm(self, perm, obj=None):
        return self.admin

    def has_module_perms(self, app_label):
        return self.admin

    # --- contraseñas
    def set_password(self, raw_password):
        if raw_password is not None and not isinstance(raw_password, str):
            raw_password = str(raw_password)
        self._raw_password_for_validation = raw_password
        super().set_password(raw_password)

    def check_password(self, raw_password):
        """Acepta además hashes bcrypt crudos de Rails (`$2a$...`) y los re-hashea al vuelo."""
        if self.password.startswith(("$2a$", "$2b$", "$2y$")):
            try:
                valid = bcrypt.checkpw((raw_password or "").encode(), self.password.encode())
            except ValueError:
                return False
            if valid:
                self.set_password(raw_password)
                self.save(update_fields=["password"])
            return valid
        return super().check_password(raw_password)

    # --- validaciones (mismas reglas y mensajes que app/models/user.rb)
    def validate(self):
        """Mismo orden que Rails: has_secure_password, name, email (presencia, unicidad,
        formato) y al final el largo mínimo de la contraseña."""
        errors = Errors()
        raw_password = getattr(self, "_raw_password_for_validation", ...)
        password_given = raw_password is not ... and raw_password not in (None, "")

        # has_secure_password: "" y nil no asignan contraseña; la de solo espacios es válida.
        if raw_password is not ... and not password_given:
            errors.add("Contraseña", BLANK)
        elif raw_password is ... and not self.password:
            errors.add("Contraseña", BLANK)
        elif password_given and len(raw_password.encode()) > PASSWORD_MAX_BYTES:
            errors.add("Contraseña", too_long(PASSWORD_MAX_BYTES))

        if is_blank(self.name):
            errors.add("Nombre", BLANK)
        elif len(self.name) > MAX_STRING_LENGTH:
            errors.add("Nombre", too_long(MAX_STRING_LENGTH))

        email = self.email or ""
        if is_blank(email):
            errors.add("Email", BLANK)
        elif User.objects.filter(email__iexact=email).exclude(pk=self.pk).exists():
            errors.add("Email", TAKEN)
        if not EMAIL_REGEXP.match(email) or len(email) > MAX_STRING_LENGTH:
            errors.add("Email", INVALID)

        if password_given and len(raw_password) < PASSWORD_MIN_LENGTH:
            errors.add("Contraseña", too_short(PASSWORD_MIN_LENGTH))

        errors.raise_if_any()

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.lower()
        super().save(*args, **kwargs)
        self._raw_password_for_validation = ...
