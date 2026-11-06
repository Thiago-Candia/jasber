import os

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.db import models, transaction
from django.db.models import Count, Q
from django.db.models.functions import Lower

from apps.core.validation import BLANK, INCLUSION, TAKEN, Errors, is_blank, too_long


class ChannelQuerySet(models.QuerySet):
    def direct(self):
        return self.filter(kind=Channel.DIRECT)

    def accessible_by(self, user):
        """Port de `Channel.accessible_by` (app/models/channel.rb).

        Canales de los workspaces del usuario que sean públicos, o en los que el
        usuario figure en channel_memberships (privados y directos).
        """
        from apps.workspaces.models import Membership

        in_user_workspaces = self.filter(workspace_id__in=Membership.objects.filter(user=user).values("workspace_id"))
        member_of = ChannelMembership.objects.filter(user=user).values("channel_id")
        return in_user_workspaces.filter(Q(kind=Channel.PUBLIC) | Q(id__in=member_of))


class Channel(models.Model):
    PUBLIC, PRIVATE, DIRECT = "public", "private", "direct"
    KINDS = [(PUBLIC, "público"), (PRIVATE, "privado"), (DIRECT, "directo")]

    workspace = models.ForeignKey("workspaces.Workspace", on_delete=models.CASCADE, related_name="channels")
    name = models.CharField("nombre", max_length=255, null=True, blank=True)
    kind = models.CharField(max_length=20, choices=KINDS, default=PUBLIC, db_default=PUBLIC)
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, through="ChannelMembership", related_name="channels")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ChannelQuerySet.as_manager()

    class Meta:
        db_table = "channels"
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(
                Lower("name"),
                "workspace",
                condition=~Q(kind="direct"),
                name="channels_name_ci_unique_per_workspace",
            )
        ]

    def __str__(self):
        return self.name or f"DM #{self.pk}"

    @property
    def is_direct(self):
        return self.kind == self.DIRECT

    def validate(self):
        errors = Errors()
        if self.kind not in dict(self.KINDS):
            errors.add("Kind", INCLUSION)
        if not self.is_direct:
            if is_blank(self.name):
                errors.add("Nombre", BLANK)
            elif len(self.name) > 255:
                errors.add("Nombre", too_long(255))
            elif (
                Channel.objects.filter(workspace_id=self.workspace_id, name__iexact=self.name)
                .exclude(kind=self.DIRECT)
                .exclude(pk=self.pk)
                .exists()
            ):
                errors.add("Nombre", TAKEN)
        errors.raise_if_any()

    @classmethod
    def direct_between(cls, workspace, user_a, user_b):
        """Busca o crea el canal directo entre dos usuarios del workspace.

        A diferencia de Rails, exige que el canal tenga exactamente esos participantes,
        así el "chat con uno mismo" se reutiliza y no coincide con DMs de dos personas.
        """
        from apps.workspaces.models import Workspace

        ids = {user_a.id, user_b.id}
        with transaction.atomic():
            # Serializa la creación de DMs por workspace (en PostgreSQL); evita duplicados por carrera.
            Workspace.objects.select_for_update().filter(pk=workspace.pk).first()
            existing = (
                cls.objects.direct()
                .filter(workspace=workspace)
                .annotate(
                    total=Count("channel_memberships", distinct=True),
                    matched=Count(
                        "channel_memberships",
                        filter=Q(channel_memberships__user_id__in=ids),
                        distinct=True,
                    ),
                )
                .filter(total=len(ids), matched=len(ids))
                .order_by("id")
                .first()
            )
            if existing:
                return existing

            channel = cls.objects.create(workspace=workspace, kind=cls.DIRECT)
            for uid in sorted(ids):
                ChannelMembership.objects.create(channel=channel, user_id=uid)
            return channel


class ChannelMembership(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="channel_memberships")
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name="channel_memberships")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "channel_memberships"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "channel"], name="index_channel_memberships_on_user_id_and_channel_id"
            )
        ]

    def __str__(self):
        return f"{self.user} en {self.channel}"


class Message(models.Model):
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name="messages")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="messages")
    body = models.TextField("mensaje", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "messages"
        ordering = ["created_at", "id"]

    def __str__(self):
        return (self.body or "")[:50]

    def validate(self, has_attachments=False):
        errors = Errors()
        if is_blank(self.body) and not has_attachments:
            errors.add("Mensaje", BLANK)
        errors.raise_if_any()


class PrivateFileSystemStorage(FileSystemStorage):
    """Adjuntos fuera de MEDIA_ROOT: sin URL pública, solo por la vista autenticada."""

    @property
    def base_location(self):
        return settings.PRIVATE_MEDIA_ROOT

    @property
    def location(self):
        return os.path.abspath(self.base_location)

    def url(self, name):
        raise ValueError("Los adjuntos no tienen URL pública")


def private_storage():
    return PrivateFileSystemStorage()


class Attachment(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to="attachments/%Y/%m/", storage=private_storage)
    filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=255, blank=True)
    byte_size = models.PositiveBigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "attachments"
        ordering = ["id"]

    def __str__(self):
        return self.filename
