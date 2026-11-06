# Jasber · Backend Django

API REST (`/api/v1`) con autenticación JWT, WebSocket de tiempo real (Django Channels) y back-office en `/admin/`.
Reemplaza al backend Rails de `../server/` con el mismo contrato de API. Las decisiones de la migración están en
[docs/decisiones.md](docs/decisiones.md).

## Requisitos

- Python 3.12 o superior
- PostgreSQL (opcional en desarrollo: sin `DATABASE_URL` se usa SQLite)
- Redis (solo en producción, para el tiempo real con más de un proceso)

## Puesta en marcha

```bash
cd server
python -m venv .venv
.venv/Scripts/activate        # Windows (en Linux/macOS: source .venv/bin/activate)
pip install -r requirements/dev.txt
python manage.py migrate
python manage.py seed
python manage.py runserver 3000
```

Se sirve en `http://localhost:3000`, el valor por defecto de `VITE_URL_API` del cliente, así que el frontend
(`cd client && npm run dev`) funciona sin cambios.

`python manage.py seed` crea `admin@example.com` y `ana@example.com` (contraseña `password123`) dentro del workspace
"Equipo Jasber". `admin@example.com` puede entrar a `http://localhost:3000/admin/`.

## Tests y calidad

```bash
pytest                 # 121 tests: los de Rails portados + adjuntos, WebSocket, admin, seeds y regresiones de seguridad
ruff check . && ruff format --check .
```

Para correrlos contra PostgreSQL, definí `DATABASE_URL` (así lo hace CI en `.github/workflows/server-django.yml`).

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/v1/register`, `/api/v1/login` | Registro e inicio de sesión → `{token, user}` |
| DELETE | `/api/v1/logout` | 204 (JWT stateless) |
| POST / PATCH | `/api/v1/password-resets`, `/api/v1/password-resets/:token` | Recuperación de contraseña |
| GET / PATCH | `/api/v1/profile` | Perfil (`name`, `avatar` multipart) |
| GET / POST | `/api/v1/workspaces` | Mis workspaces / crear (`name`, `image`) |
| GET / PATCH (o PUT) / DELETE | `/api/v1/workspaces/:id` | Detalle / editar y borrar (dueño) |
| POST | `/api/v1/workspaces/:id/invite`, `/api/v1/join/:token` | Invitaciones |
| GET / POST / DELETE | `/api/v1/workspaces/:id/memberships[/:id]` | Miembros (alta y baja: dueño) |
| GET / POST | `/api/v1/workspaces/:id/channels` | Canales accesibles / crear (`name`, `kind` opcional) |
| GET / PATCH (o PUT) / DELETE | `/api/v1/channels/:id` | Canal (editar y borrar: dueño del workspace) |
| GET / POST | `/api/v1/channels/:id/messages` | Mensajes (`body`, `files` multipart) |
| DELETE | `/api/v1/messages/:id` | Borrar un mensaje propio |
| GET / POST | `/api/v1/workspaces/:id/direct_messages/:user_id` | Mensajes directos |
| GET | `/api/v1/attachments/:id` | Descarga autenticada de un adjunto |
| WS | `/ws/channels/:id/?token=<jwt>` | Eventos `message.created` / `message.deleted`; cierre 4401 (token) o 4404 (sin acceso) |
| GET | `/up` | Health check |

Errores: siempre `{"errors": ["..."]}`. 401 sin token válido, 404 si el recurso no existe o no es accesible,
403 si sos miembro pero la acción es del dueño, 422 por validación (también ante tipos inválidos en el JSON),
413 si el cuerpo supera `MAX_REQUEST_SIZE_MB`.

## Variables de entorno

Ver [.env.example](.env.example). En producción son obligatorias `DJANGO_DEBUG=false`, `SECRET_KEY`,
`ALLOWED_HOSTS`, `FRONTEND_URL` y `DATABASE_URL`; recomendadas `REDIS_URL` y las `EMAIL_*`.

## Despliegue en Railway

1. Crear un servicio desde el repositorio con *Root Directory* `server` (usa `Dockerfile` y `railway.json`).
2. Agregar los plugins PostgreSQL y Redis (inyectan `DATABASE_URL` y `REDIS_URL`).
3. Montar un volumen en `/data` (avatares, imágenes y adjuntos). `docker-entrypoint.sh` ajusta sus permisos,
   corre las migraciones y baja al usuario sin privilegios `app`.
4. Definir `DJANGO_DEBUG=false`, `SECRET_KEY`, `ALLOWED_HOSTS=<dominio>.up.railway.app`,
   `FRONTEND_URL=https://<frontend>.vercel.app` y `CSRF_TRUSTED_ORIGINS=https://<dominio>.up.railway.app`.
   `healthcheck.railway.app` ya se agrega solo a `ALLOWED_HOSTS` para el health check de `/up`.
5. Las migraciones corren al iniciar el contenedor. Para los datos de prueba: `railway run python manage.py seed`.
6. En Vercel, `VITE_URL_API=https://<dominio>.up.railway.app`.
