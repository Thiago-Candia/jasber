import re

from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path

from apps.core.views import health, public_media

handler404 = "apps.core.views.json_not_found"

urlpatterns = [
    path("up", health, name="health"),
    path("admin/", admin.site.urls),
    path("api/v1/", include("config.api_urls")),
    re_path(rf"^{re.escape(settings.MEDIA_URL.lstrip('/'))}(?P<path>.*)$", public_media),
]
