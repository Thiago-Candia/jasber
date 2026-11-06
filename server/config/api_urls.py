"""Rutas de /api/v1. Mismo contrato que `server/config/routes.rb` (sin barra final)."""

from django.urls import path

from apps.accounts import views as accounts
from apps.chat import views as chat
from apps.workspaces import views as workspaces

urlpatterns = [
    path("register", accounts.register),
    path("login", accounts.login),
    path("logout", accounts.logout),
    path("password-resets", accounts.password_reset_create),
    path("password-resets/<str:token>", accounts.password_reset_update),
    path("profile", accounts.profile),
    path("join/<str:token>", workspaces.join),
    path("workspaces", workspaces.workspace_list),
    path("workspaces/<int:pk>", workspaces.workspace_detail),
    path("workspaces/<int:pk>/invite", workspaces.invite),
    path("workspaces/<int:workspace_id>/memberships", workspaces.membership_list),
    path("workspaces/<int:workspace_id>/memberships/<int:pk>", workspaces.membership_detail),
    path("workspaces/<int:workspace_id>/channels", chat.workspace_channels),
    path("workspaces/<int:workspace_id>/direct_messages/<int:user_id>", chat.direct_messages),
    path("channels/<int:pk>", chat.channel_detail),
    path("channels/<int:channel_id>/messages", chat.channel_messages),
    path("messages/<int:pk>", chat.message_detail),
    path("attachments/<int:pk>", chat.attachment_download),
]
