#!/bin/sh
# Railway monta el volumen en /data como root al arrancar (el chown del build no aplica).
# Si arrancamos como root: preparar /data, migrar y bajar privilegios al usuario "app".
set -e

mkdir -p "${MEDIA_ROOT:-/data/media}" "${PRIVATE_MEDIA_ROOT:-/data/private_media}"

if [ "$(id -u)" = "0" ]; then
  chown -R app:app /data
  exec setpriv --reuid=app --regid=app --init-groups "$0" "$@"
fi

python manage.py migrate --noinput
exec "$@"
