import { describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../test/jsonResponse";
import { AUTH_EXPIRED_EVENT, api } from "./httpClient";
import { TOKEN_KEY } from "./session";

describe("httpClient", () => {
  it("envía el token Bearer y la ruta versionada en pedidos protegidos", async () => {
    localStorage.setItem(TOKEN_KEY, "token-123");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => jsonResponse([]));

    await api.get("/workspaces");

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/workspaces$/);
    expect(options.headers.Authorization).toBe("Bearer token-123");
  });

  it("no envía el token en pedidos públicos", async () => {
    localStorage.setItem(TOKEN_KEY, "token-123");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => jsonResponse({}));

    await api.post("/login", { email: "a@b.com", password: "x" }, { auth: false });

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(options.body)).toEqual({ email: "a@b.com", password: "x" });
  });

  it("manda FormData sin fijar Content-Type para que el navegador arme el multipart", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => jsonResponse({ id: 1 }, 201));
    const formData = new FormData();
    formData.append("name", "Equipo");

    await api.post("/workspaces", formData);

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.body).toBe(formData);
    expect(options.headers["Content-Type"]).toBeUndefined();
  });

  it("devuelve null en respuestas sin contenido (204)", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => Promise.resolve(new Response(null, { status: 204 })));

    await expect(api.delete("/workspaces/1")).resolves.toBeNull();
  });

  it("une los errores de la API en el mensaje y los conserva como lista", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      jsonResponse({ errors: ["Nombre no puede estar en blanco", "Email no es válido"] }, 422)
    );

    await expect(api.post("/register", {}, { auth: false })).rejects.toMatchObject({
      status: 422,
      message: "Nombre no puede estar en blanco. Email no es válido",
      errors: ["Nombre no puede estar en blanco", "Email no es válido"]
    });
  });

  it("con un 401 en un pedido protegido borra el token y avisa que la sesión venció", async () => {
    localStorage.setItem(TOKEN_KEY, "vencido");
    vi.spyOn(globalThis, "fetch").mockImplementation(() => jsonResponse({ errors: ["No autorizado"] }, 401));
    const onExpired = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);

    await expect(api.get("/profile")).rejects.toMatchObject({ status: 401 });

    window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it("con un 401 en un pedido público (login fallido) no cierra ninguna sesión", async () => {
    localStorage.setItem(TOKEN_KEY, "vigente");
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      jsonResponse({ errors: ["Email o contraseña inválidos"] }, 401)
    );
    const onExpired = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);

    await expect(api.post("/login", {}, { auth: false })).rejects.toMatchObject({
      status: 401,
      message: "Email o contraseña inválidos"
    });

    window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
    expect(localStorage.getItem(TOKEN_KEY)).toBe("vigente");
    expect(onExpired).not.toHaveBeenCalled();
  });

  it("devuelve un mensaje claro cuando no hay conexión con el servidor", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => Promise.reject(new TypeError("Failed to fetch")));

    await expect(api.get("/workspaces")).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining("No se pudo conectar")
    });
  });
});
