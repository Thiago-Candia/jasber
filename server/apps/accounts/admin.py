from django import forms
from django.contrib import admin

from apps.accounts.models import User


class UserAdminForm(forms.ModelForm):
    new_password = forms.CharField(
        label="Contraseña",
        required=False,
        widget=forms.PasswordInput(render_value=False),
        help_text="Dejar vacío para no cambiarla. Mínimo 8 caracteres.",
        min_length=8,
    )

    class Meta:
        model = User
        fields = ["name", "email", "admin", "avatar"]

    def clean_new_password(self):
        password = self.cleaned_data.get("new_password")
        if not self.instance.pk and not password:
            raise forms.ValidationError("La contraseña es obligatoria al crear un usuario.")
        return password

    def save(self, commit=True):
        user = super().save(commit=False)
        if self.cleaned_data.get("new_password"):
            user.set_password(self.cleaned_data["new_password"])
        if commit:
            user.save()
        return user


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    form = UserAdminForm
    list_display = ["id", "name", "email", "admin", "created_at"]
    list_filter = ["admin"]
    search_fields = ["name", "email"]
    readonly_fields = ["created_at", "updated_at", "last_login"]
