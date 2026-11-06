from django.contrib import admin

from apps.chat.models import Channel
from apps.workspaces.models import Membership, Workspace


class MembershipInline(admin.TabularInline):
    model = Membership
    extra = 0
    autocomplete_fields = ["user"]


class ChannelInline(admin.TabularInline):
    model = Channel
    extra = 0
    fields = ["name", "kind"]
    show_change_link = True


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "owner", "created_at"]
    search_fields = ["name"]
    autocomplete_fields = ["owner"]
    readonly_fields = ["invite_token", "created_at", "updated_at"]
    inlines = [MembershipInline, ChannelInline]


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "workspace", "role", "created_at"]
    list_filter = ["role"]
    autocomplete_fields = ["user", "workspace"]
