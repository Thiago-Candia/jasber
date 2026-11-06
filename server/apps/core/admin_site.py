from django.contrib.admin import AdminSite


class JasberAdminSite(AdminSite):
    site_header = "Jasber · Back-office"
    site_title = "Jasber admin"
    index_title = "Dashboard"
    index_template = "admin/jasber_index.html"

    def index(self, request, extra_context=None):
        from apps.accounts.models import User
        from apps.chat.models import Message
        from apps.workspaces.models import Workspace

        counters = {
            "users_count": User.objects.count(),
            "workspaces_count": Workspace.objects.count(),
            "messages_count": Message.objects.count(),
        }
        return super().index(request, {**counters, **(extra_context or {})})
