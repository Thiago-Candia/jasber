from django.contrib import admin

from apps.chat.models import Attachment, Channel, ChannelMembership, Message


class ChannelMembershipInline(admin.TabularInline):
    model = ChannelMembership
    extra = 0
    autocomplete_fields = ["user"]


@admin.register(Channel)
class ChannelAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "kind", "workspace", "created_at"]
    list_filter = ["kind"]
    search_fields = ["name"]
    autocomplete_fields = ["workspace"]
    inlines = [ChannelMembershipInline]


class AttachmentInline(admin.TabularInline):
    model = Attachment
    extra = 0
    fields = ["filename", "content_type", "byte_size"]
    readonly_fields = fields
    can_delete = False


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    """Como en el back-office Rails: listado, detalle y borrado (sin alta ni edición)."""

    list_display = ["id", "short_body", "user", "channel", "created_at"]
    list_select_related = ["user", "channel"]
    search_fields = ["body"]
    readonly_fields = ["channel", "user", "body", "created_at", "updated_at"]
    inlines = [AttachmentInline]

    @admin.display(description="mensaje")
    def short_body(self, obj):
        return str(obj)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
