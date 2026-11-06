from django.contrib.admin.apps import AdminConfig


class JasberAdminConfig(AdminConfig):
    """Django Admin con el dashboard de contadores del back-office Rails."""

    default_site = "apps.core.admin_site.JasberAdminSite"
