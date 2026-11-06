# Jasber — Frontend

Cliente web en React para la API de `server/`. Permite crear una cuenta, entrar a espacios de trabajo (workspaces), conversar en canales y mandar mensajes directos.

> Guía para programar sobre el proyecto (hooks, formularios, estilos, tests y pasos para agregar cosas): [docs/desarrollo.md](docs/desarrollo.md).

## Índice

1. [Inicio rápido](#inicio-rápido)
2. [Scripts](#scripts)
3. [Variables de entorno](#variables-de-entorno)
4. [Stack](#stack)
5. [Estructura de carpetas](#estructura-de-carpetas)
6. [Cómo fluye un dato](#cómo-fluye-un-dato)
7. [Rutas](#rutas)
8. [Sesión y autenticación](#sesión-y-autenticación)
9. [Comunicación con la API](#comunicación-con-la-api)
10. [Errores y estados de pantalla](#errores-y-estados-de-pantalla)
11. [Convenciones](#convenciones)
12. [Limitaciones conocidas](#limitaciones-conocidas)

## Inicio rápido

Para tener la app andando en tu máquina.

**Requisitos**

- Node.js 20.19 o superior (o 22.12 o superior).
- El backend corriendo en `http://localhost:3000` (ver el README de la raíz).

**Pasos**

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Abrí `http://localhost:5173`. Usá `localhost` y no `127.0.0.1`: el backend solo acepta pedidos (CORS) desde `http://localhost:5173`.

**Usuarios de prueba** (los crea `bin/rails db:seed` en `server/`):

| Email | Contraseña |
|---|---|
| `admin@example.com` | `password123` |
| `ana@example.com` | `password123` |

## Scripts

Comandos disponibles en `package.json`.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta el servidor de desarrollo en el puerto 5173. |
| `npm run build` | Genera el build de producción en `dist/`. |
| `npm run preview` | Sirve el build de `dist/` para probarlo. |
| `npm run lint` | Revisa el código con ESLint. |
| `npm test` | Corre todos los tests una vez. |
| `npm run test:watch` | Corre los tests y los repite al guardar cambios. |

## Variables de entorno

Configuración que cambia según dónde corre la app. Va en `client/.env` (no se sube al repo).

| Variable | Ejemplo | Para qué |
|---|---|---|
| `VITE_URL_API` | `http://localhost:3000` | URL base del backend. Si falta, se usa ese mismo valor. |

Las variables `VITE_*` quedan visibles en el navegador. Nunca pongas secretos ahí.

## Stack

Qué herramientas usa el proyecto y para qué.

| Tecnología | Para qué se usa |
|---|---|
| React 19 | Construir la interfaz con componentes. |
| Vite 7 | Servidor de desarrollo y build de producción. |
| react-router-dom 7 | Navegación entre pantallas (rutas). |
| Vitest 5 | Correr los tests. |
| Testing Library | Probar componentes como los usaría una persona. |
| ESLint 9 | Detectar errores y malas prácticas en el código. |
| Motion | Animaciones (entrada de mensajes, reacciones, botón "Ir al último mensaje"). Se carga con `LazyMotion` y respeta `prefers-reduced-motion`. |
| react-virtuoso | Lista de mensajes virtualizada: solo dibuja lo que se ve y maneja el scroll del chat. |
| Radix UI (dialog, dropdown-menu, popover, tooltip) | Piezas accesibles: menú de más opciones, selector de emojis flotante y tooltips. El diálogo lo usa `cmdk`. |
| cmdk | Paleta de comandos `Ctrl+K` / `Cmd+K`. |
| emoji-mart | Selector de emojis. Se monta a mano porque `@emoji-mart/react` todavía no soporta React 19. |
| Sonner | Avisos efímeros (toasts). |
| @formkit/auto-animate | Anima altas y bajas de canales y personas en la barra lateral. |

No hay librerías de estado global ni de pedidos HTTP: alcanza con React y `fetch`. Los estilos siguen siendo CSS plano (sin Tailwind). Detalle de cómo usar las librerías de interacción: [docs/desarrollo.md](docs/desarrollo.md#interacción-del-chat).

## Estructura de carpetas

Dónde está cada cosa dentro de `src/`.

```text
src/
├── config/          URL de la API (lee VITE_URL_API)
├── services/        Pedidos a la API: httpClient + un servicio por recurso
├── context/         Estado compartido: sesión (AuthContext) y datos del usuario (WorkspaceContext)
├── hooks/           Lógica reutilizable: cargar datos, enviar formularios, mensajes con envío optimista, reacciones, atajo Ctrl+K
├── components/      Piezas de interfaz reutilizables (modal, campos, avatar, conversación…)
│   └── workspace/   Piezas propias de la vista del workspace (barra lateral, modales)
├── screens/         Una pantalla por ruta
├── utils/           Funciones puras: errores, validaciones, formato, URLs de imágenes
├── styles/          CSS global (base, layout, workspace, interaction)
├── test/            Configuración y helpers de los tests
├── App.jsx          Definición de rutas
└── main.jsx         Punto de entrada: monta la app
```

## Cómo fluye un dato

El camino que hace un pedido, desde la pantalla hasta la API y de vuelta.

```text
 Pantalla (screens/)        ej. HomeScreen
      │ usa
      ▼
 Contexto o hook            ej. WorkspaceContext → useResource
      │ llama
      ▼
 Servicio (services/)       ej. workspaceService.getAll()
      │ llama
      ▼
 httpClient                 arma la URL, agrega el token, interpreta la respuesta
      │ fetch
      ▼
 API Rails /api/v1/...      responde JSON o { errors: [...] }
```

| Capa | Responsabilidad |
|---|---|
| Pantalla | Muestra datos y estados. No sabe de URLs ni de tokens. |
| Contexto / hook | Guarda el estado (cargando, listo, error) y expone acciones. |
| Servicio | Una función por endpoint. Solo define método, ruta y cuerpo. |
| `httpClient` | Único lugar que usa `fetch`. Maneja token, formato y errores. |

## Rutas

Qué pantalla corresponde a cada URL y quién puede verla. Están definidas en `src/App.jsx`.

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/` | Redirige a `/home` | — |
| `/login` | `LoginScreen` | Solo sin sesión |
| `/register` | `RegisterScreen` | Solo sin sesión |
| `/reset-password` | `ResetPasswordScreen` (pedir enlace por mail) | Pública |
| `/rewrite-password?reset_token=…` | `RewritePasswordScreen` (nueva contraseña) | Pública |
| `/home` | `HomeScreen` (mis workspaces) | Con sesión |
| `/new-workspace` | `CreateWorkspaceScreen` | Con sesión |
| `/join/:token` | `JoinWorkspaceScreen` (unirse por invitación) | Con sesión |
| `/workspace/:workspace_id` | `WorkspaceScreen` + `WorkspaceWelcome` | Con sesión |
| `/workspace/:workspace_id/channel/:channel_id` | `ChannelScreen` | Con sesión |
| `/workspace/:workspace_id/dm/:user_id` | `DirectMessageScreen` | Con sesión |
| cualquier otra | `NotFoundScreen` | Pública |

Los dos guardias están en `src/components/routes.jsx`:

- **`ProtectedRoute`**: sin sesión, manda a `/login` y guarda la ruta pedida en `state.from`. Con sesión, carga los datos del usuario (`WorkspaceProvider`).
- **`PublicOnlyRoute`**: con sesión, manda a `state.from` o, si no hay, a `/home`.

Gracias a `state.from`, quien abre un link de invitación sin sesión inicia sesión y vuelve directo a `/join/:token`.

## Sesión y autenticación

Cómo sabe la app quién la está usando.

- Al iniciar sesión o registrarse, la API devuelve un **JWT** (token firmado que identifica a la persona). Dura 24 horas.
- El token se guarda en `localStorage` con la clave `auth_token` (`src/services/session.js`).
- `httpClient` lo manda en cada pedido protegido: `Authorization: Bearer <token>`.
- Si la API responde **401** (no autorizado: token vencido o inválido), `httpClient` borra el token y emite el evento `auth:expired`. `AuthContext` lo escucha, cierra la sesión y el login muestra "Tu sesión venció".
- Un 401 en el login (credenciales incorrectas) no cierra nada: solo muestra el error.
- **Cerrar sesión** (desde el modal de perfil) borra el token y vuelve a `/login`. El servidor no invalida el token: simplemente deja de usarse.
- Si cerrás sesión en una pestaña, las demás se enteran por el evento `storage` del navegador.

## Comunicación con la API

Cómo se hacen los pedidos HTTP.

`src/services/httpClient.js` resuelve todo lo común:

| Situación | Qué hace |
|---|---|
| Ruta | Antepone `VITE_URL_API` + `/api/v1`. Los servicios escriben solo `/workspaces`. |
| Cuerpo común | Lo convierte a JSON y agrega `Content-Type: application/json`. |
| Cuerpo `FormData` | Lo manda tal cual, sin `Content-Type`: el navegador arma el **multipart** (formato para enviar archivos). |
| Respuesta 204 | Devuelve `null` (no hay cuerpo). |
| Error HTTP | Lanza un `ServerError` con `status`, `message` y `errors`. |
| Sin conexión | Lanza un `ServerError` con `status: 0` y un mensaje claro. |

Así se ve un servicio (`src/services/channel.service.js`):

```js
export const channelService = {
  getByWorkspace: (workspaceId) => api.get(`/workspaces/${workspaceId}/channels`),
  create: (workspaceId, name) => api.post(`/workspaces/${workspaceId}/channels`, { name }),
  getMessages: (channelId) => api.get(`/channels/${channelId}/messages`),
  sendMessage: (channelId, body) => api.post(`/channels/${channelId}/messages`, { body })
};
```

**Todos los servicios** (las rutas son relativas a `/api/v1`):

| Servicio | Método | Endpoint |
|---|---|---|
| `authService.login` | POST | `/login` |
| `authService.register` | POST | `/register` |
| `authService.requestPasswordReset` | POST | `/password-resets` |
| `authService.resetPassword` | PATCH | `/password-resets/:token` |
| `profileService.get` | GET | `/profile` |
| `profileService.update` | PATCH | `/profile` (multipart: `name`, `avatar`) |
| `workspaceService.getAll` | GET | `/workspaces` |
| `workspaceService.create` | POST | `/workspaces` (multipart: `name`, `image`) |
| `workspaceService.createInvite` | POST | `/workspaces/:id/invite` |
| `workspaceService.join` | POST | `/join/:token` |
| `channelService.getByWorkspace` | GET | `/workspaces/:id/channels` |
| `channelService.create` | POST | `/workspaces/:id/channels` |
| `channelService.getMessages` | GET | `/channels/:id/messages` |
| `channelService.sendMessage` | POST | `/channels/:id/messages` |
| `directMessageService.getMessages` | GET | `/workspaces/:id/direct_messages/:user_id` |
| `directMessageService.sendMessage` | POST | `/workspaces/:id/direct_messages/:user_id` |

La API devuelve solo el `invite_token`. El link completo (`<origen del front>/join/<token>`) lo arma `InviteModal`.

## Errores y estados de pantalla

Cómo se muestra lo que pasa mientras se carga o cuando algo falla.

- La API responde los errores como `{ "errors": ["mensaje 1", "mensaje 2"] }`, ya en español.
- `httpClient` los convierte en un `ServerError` (`src/utils/errors.js`): `message` es la lista unida con ". " y `errors` conserva la lista.
- Toda pantalla que carga datos muestra uno de estos estados (`src/components/StatusView.jsx`):

| Componente | Cuándo | Detalle |
|---|---|---|
| `LoadingState` | Cargando | Spinner + texto, con `role="status"`. |
| `EmptyState` | No hay datos | Título + sugerencia de qué hacer. |
| `ErrorState` | Falló la carga | Mensaje + botón **Reintentar**, con `role="alert"`. |

- En formularios, `FormError` muestra el error de la API (o la lista, si hay varios).
- Los errores de validación de cada campo aparecen debajo del campo, en `TextField`.

## Convenciones

Reglas que sigue el código para que todo se vea igual.

| Tema | Regla |
|---|---|
| Nombres de archivos | Componentes y pantallas en `PascalCase.jsx`; servicios en `nombre.service.js`; hooks en `useAlgo.js`. |
| Tests | Junto al archivo que prueban: `Algo.test.jsx`. |
| Ids de la URL | Los params llegan como texto (`"3"`) y la API manda números (`3`). Compará con `sameId(a, b)` de `utils/format.js`, nunca con `===`. |
| Imágenes | La API devuelve rutas relativas (`/rails/active_storage/...`). Pasalas por `assetUrl()` o usá `Avatar`, que ya lo hace. |
| Textos | Toda la interfaz está en español rioplatense ("Ingresá", "Elegí"). |
| Errores | No armes mensajes a mano a partir de la respuesta: usá `error.message` del `ServerError`. |

## Limitaciones conocidas

Comportamientos actuales que conviene conocer. Están confirmados en el código y en la API.

- **Sin actualización automática**: los mensajes de otras personas aparecen al volver a abrir la conversación o al recargar. Por lo mismo, "escribiendo…", la presencia (en línea / ausente) y los contadores de no leídos están construidos como componentes (`TypingIndicator`, `PresenceDot`, `UnreadBadge`) pero no se muestran: falta tiempo real en la API.
- **Reacciones solo locales**: la API no tiene reacciones, así que se guardan en el navegador de cada persona (`localStorage`, vía `reactionService`) y nadie más las ve.
- **Responder es una cita**: no hay hilos. Al responder, el mensaje se manda con su primera línea como `> Nombre: texto citado` y se muestra como cita.
- **"Mensajes nuevos" depende del navegador**: la marca de última visita se guarda en `localStorage`, por lo que no se comparte entre dispositivos.
- **Historial completo**: cada conversación carga todos sus mensajes, sin paginar.
- **Acciones sin interfaz**: la API permite editar o borrar workspaces y canales, gestionar miembros por email y borrar mensajes, pero la interfaz todavía no lo ofrece.
- **Avatar al registrarse**: el registro pide nombre, email y contraseña. La foto se sube después, desde el perfil.
