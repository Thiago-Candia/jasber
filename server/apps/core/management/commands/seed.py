"""Port de `server/db/seeds.rb`. Idempotente: se puede correr varias veces."""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import User
from apps.chat.models import Channel, ChannelMembership, Message
from apps.workspaces.models import Membership, Workspace

SEED_PASSWORD = "password123"


def _user(email, name, admin=False):
    user = User.objects.filter(email=email).first()
    if user:
        return user
    user = User(email=email, name=name, admin=admin)
    user.set_password(SEED_PASSWORD)
    user.save()
    return user


class Command(BaseCommand):
    help = "Crea los datos de prueba (admin@example.com y ana@example.com, contraseña password123)."

    @transaction.atomic
    def handle(self, *args, **options):
        admin = _user("admin@example.com", "Admin", admin=True)
        member = _user("ana@example.com", "Ana Pérez")

        workspace, _ = Workspace.objects.get_or_create(name="Equipo Jasber", defaults={"owner": admin})
        Membership.objects.get_or_create(user=admin, workspace=workspace, defaults={"role": Membership.OWNER})
        Membership.objects.get_or_create(user=member, workspace=workspace, defaults={"role": Membership.MEMBER})

        general, _ = Channel.objects.get_or_create(
            workspace=workspace, name="general", defaults={"kind": Channel.PUBLIC}
        )
        ChannelMembership.objects.get_or_create(channel=general, user=admin)
        ChannelMembership.objects.get_or_create(channel=general, user=member)

        Message.objects.get_or_create(channel=general, user=admin, body="Bienvenidos al workspace")
        Message.objects.get_or_create(channel=general, user=member, body="Hola equipo")

        self.stdout.write(self.style.SUCCESS("Datos de prueba listos."))
