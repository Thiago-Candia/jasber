"""Adjuntos en mensajes (objetivo 5 y criterios de éxito 3 y 4 de la propuesta)."""

from django.core.files.uploadedfile import SimpleUploadedFile

from apps.chat.models import Attachment, Channel
from apps.workspaces.models import Membership
from tests.conftest import auth, create_user

PDF_BYTES = b"%PDF-1.4\n" + bytes(range(256)) * 4


def _upload(name="informe.pdf", content=PDF_BYTES, content_type="application/pdf"):
    return SimpleUploadedFile(name, content, content_type=content_type)


def test_sube_un_adjunto_y_se_descarga_intacto(client, fx):
    response = client.post(
        f"/api/v1/channels/{fx.general.id}/messages", {"body": "Va el informe", "files": [_upload()]}, **auth(fx.alice)
    )
    assert response.status_code == 201
    [attachment] = response.json()["attachments"]
    assert attachment["filename"] == "informe.pdf"
    assert attachment["content_type"] == "application/pdf"
    assert attachment["byte_size"] == len(PDF_BYTES)
    assert attachment["url"] == f"/api/v1/attachments/{attachment['id']}"

    download = client.get(attachment["url"], **auth(fx.bob))
    assert download.status_code == 200
    assert b"".join(download.streaming_content) == PDF_BYTES
    assert "attachment" in download["Content-Disposition"]
    assert download["X-Content-Type-Options"] == "nosniff"


def test_permite_un_mensaje_solo_con_adjunto(client, fx):
    response = client.post(f"/api/v1/channels/{fx.general.id}/messages", {"files": [_upload()]}, **auth(fx.alice))
    assert response.status_code == 201
    assert response.json()["body"] == ""


def test_rechaza_adjuntos_demasiado_grandes(client, fx, settings):
    settings.MAX_ATTACHMENT_SIZE_MB = 1
    big = _upload("grande.bin", b"0" * (1024 * 1024 + 1), "application/octet-stream")
    response = client.post(
        f"/api/v1/channels/{fx.general.id}/messages", {"body": "x", "files": [big]}, **auth(fx.alice)
    )
    assert response.status_code == 422
    assert response.json() == {"errors": ["Archivo grande.bin es demasiado grande (máximo 1 MB)"]}
    assert not Attachment.objects.exists()


def test_los_adjuntos_no_tienen_url_publica(client, fx):
    client.post(f"/api/v1/channels/{fx.general.id}/messages", {"body": "x", "files": [_upload()]}, **auth(fx.alice))
    attachment = Attachment.objects.get()
    assert client.get(f"/media/{attachment.file.name}").status_code == 404
    assert client.get(f"/api/v1/attachments/{attachment.id}").status_code == 401


def test_un_ajeno_no_descarga_adjuntos_de_un_canal_privado_ni_de_un_dm(client, fx):
    carol = create_user("Carol", "carol@example.com")
    Membership.objects.create(user=carol, workspace=fx.acme, role="member")
    private = Channel.objects.create(workspace=fx.acme, name="privado", kind="private")
    private.channel_memberships.create(user=fx.alice)

    in_private = client.post(
        f"/api/v1/channels/{private.id}/messages", {"body": "x", "files": [_upload()]}, **auth(fx.alice)
    )
    in_dm = client.post(
        f"/api/v1/workspaces/{fx.acme.id}/direct_messages/{fx.bob.id}",
        {"body": "x", "files": [_upload()]},
        **auth(fx.alice),
    )

    for response in (in_private, in_dm):
        url = response.json()["attachments"][0]["url"]
        assert client.get(url, **auth(fx.alice)).status_code == 200
        assert client.get(url, **auth(carol)).status_code == 404


def test_borrar_el_mensaje_borra_el_archivo(client, fx, django_capture_on_commit_callbacks):
    response = client.post(
        f"/api/v1/channels/{fx.general.id}/messages", {"body": "x", "files": [_upload()]}, **auth(fx.alice)
    )
    attachment = Attachment.objects.get()
    storage, name = attachment.file.storage, attachment.file.name
    assert storage.exists(name)

    with django_capture_on_commit_callbacks(execute=True):
        assert client.delete(f"/api/v1/messages/{response.json()['id']}", **auth(fx.alice)).status_code == 204
    assert not storage.exists(name)
