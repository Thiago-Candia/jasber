import secrets

from django.conf import settings
from django.db import models

from apps.core.validation import BLANK, INCLUSION, TAKEN, Errors, is_blank, too_long


def generate_invite_token():
    # Equivale a SecureRandom.urlsafe_base64(16).
    return secrets.token_urlsafe(16)


class Workspace(models.Model):
    name = models.CharField("nombre", max_length=255)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="owned_workspaces")
    invite_token = models.CharField(max_length=255, unique=True, null=True, blank=True)
    image = models.ImageField(upload_to="workspaces/", null=True, blank=True)
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, through="Membership", related_name="workspaces")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "workspaces"
        ordering = ["id"]

    def __str__(self):
        return self.name

    def owned_by(self, user):
        return user is not None and self.owner_id == user.id

    def regenerate_invite_token(self):
        self.invite_token = generate_invite_token()
        self.save(update_fields=["invite_token", "updated_at"])

    def validate(self):
        errors = Errors()
        if is_blank(self.name):
            errors.add("Nombre", BLANK)
        elif len(self.name) > 255:
            errors.add("Nombre", too_long(255))
        errors.raise_if_any()

    def save(self, *args, **kwargs):
        if self._state.adding and not self.invite_token:
            self.invite_token = generate_invite_token()
        super().save(*args, **kwargs)


class Membership(models.Model):
    OWNER, ADMIN, MEMBER = "owner", "admin", "member"
    ROLES = [(OWNER, "owner"), (ADMIN, "admin"), (MEMBER, "member")]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="memberships")
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=20, choices=ROLES, default=MEMBER, db_default=MEMBER)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "memberships"
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(fields=["user", "workspace"], name="index_memberships_on_user_id_and_workspace_id")
        ]

    def __str__(self):
        return f"{self.user} @ {self.workspace} ({self.role})"

    def validate(self):
        errors = Errors()
        if self.role not in dict(self.ROLES):
            errors.add("Role", INCLUSION)
        duplicate = Membership.objects.filter(user_id=self.user_id, workspace_id=self.workspace_id).exclude(pk=self.pk)
        if duplicate.exists():
            errors.add("User", TAKEN)
        errors.raise_if_any()
