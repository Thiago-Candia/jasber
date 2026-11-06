FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DJANGO_DEBUG=false \
    MEDIA_ROOT=/data/media \
    PRIVATE_MEDIA_ROOT=/data/private_media

WORKDIR /app

COPY requirements ./requirements
RUN pip install -r requirements/base.txt

COPY . .
# collectstatic no necesita secretos reales.
RUN SECRET_KEY=build-only python manage.py collectstatic --noinput \
    && useradd --create-home --uid 1000 app \
    && mkdir -p /data \
    && chown app:app /data \
    && chmod +x docker-entrypoint.sh

# Arranca como root solo para ajustar permisos del volumen; el entrypoint baja a "app".
ENTRYPOINT ["./docker-entrypoint.sh"]
EXPOSE 8000
CMD ["sh", "-c", "exec daphne -b 0.0.0.0 -p ${PORT:-8000} --proxy-headers config.asgi:application"]
