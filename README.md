# Jasber

Plataforma de mensajería para equipos con espacios de trabajo, canales y mensajes directos.

| Carpeta | Contenido |
|---|---|
| `client/` | Frontend en React 19 + Vite |
| `server/` | Backend en Python + Django 6.1 (DRF + Channels) con PostgreSQL |
| `wireframes/` | Diseños de referencia de las pantallas |

## Estado

- El backend Django expone la API REST en `/api/v1` con autenticación JWT, WebSocket de tiempo real en `/ws/channels/:id/`, adjuntos en mensajes y el back-office en `/admin/`. Mismo contrato que el backend Rails (ver `server/docs/decisiones.md`).
- El frontend consume esa API: registro, inicio de sesión, recuperación de contraseña, workspaces, invitaciones, canales, mensajes, mensajes directos y perfil.

## Rutas del frontend

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/login`, `/register` | Iniciar sesión / crear cuenta | Pública |
| `/reset-password`, `/rewrite-password?reset_token=…` | Recuperar contraseña | Pública |
| `/home` | Mis espacios de trabajo | Con sesión |
| `/new-workspace` | Crear espacio de trabajo | Con sesión |
| `/join/:token` | Unirse por link de invitación | Con sesión (sin sesión, pasa por el login y vuelve) |
| `/workspace/:workspace_id` | Espacio de trabajo | Con sesión |
| `/workspace/:workspace_id/channel/:channel_id` | Chat de canal | Con sesión |
| `/workspace/:workspace_id/dm/:user_id` | Mensaje directo | Con sesión |

## Requisitos

- Node.js 20 o superior
- Python 3.12 o superior
- PostgreSQL

## Puesta en marcha

### Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Se sirve en `http://localhost:5173`.

### Backend

```bash
cd server
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements/dev.txt
python manage.py migrate
python manage.py runserver 3000
```

Se sirve en `http://localhost:3000`. Detalles, tests y despliegue en `server/README.md`.

### Datos de prueba

`python manage.py seed` crea las cuentas `admin@example.com` y `ana@example.com` (contraseña `password123`) dentro del workspace "Equipo Jasber".

## Variables de entorno

Nunca se suben al repositorio. Solo se versionan los archivos `.env.example`.

| Variable | Dónde | Descripción |
|---|---|---|
| `VITE_URL_API` | `client/.env` | URL base de la API. Es pública en el bundle del navegador: no debe contener secretos. |
| `FRONTEND_URL` | Entorno del servidor | Origen del frontend permitido por CORS y WebSocket, además de `http://localhost:5173`. |
| `SECRET_KEY` | Entorno del servidor (producción) | Clave de Django; también firma los JWT si no hay `JWT_SECRET`. |
| `DATABASE_URL` | Entorno del servidor | Conexión a PostgreSQL. Sin ella, en desarrollo se usa SQLite. |
| `REDIS_URL` | Entorno del servidor (producción) | Capa de canales para el tiempo real. |

La lista completa está en `server/.env.example`.

## Scripts del frontend

| Comando | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción en `client/dist` |
| `npm run lint` | ESLint |
| `npm test` | Tests con Vitest y Testing Library |
| `npm run test:watch` | Tests en modo observador |
| `npm run preview` | Sirve el build localmente |

## Despliegue del frontend

`client/vercel.json` reescribe todas las rutas a `index.html` para el enrutado del lado del cliente. Define `VITE_URL_API` en el panel de Vercel.
