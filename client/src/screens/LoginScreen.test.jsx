import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../App";
import { AuthProvider } from "../context/AuthContext";
import { TOKEN_KEY } from "../services/session";
import { jsonResponse } from "../test/jsonResponse";

const ana = { id: 1, name: "Ana Pérez", email: "ana@example.com", avatar_url: null };

const mockApi = () =>
  vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
    if (url.endsWith("/login")) return jsonResponse({ token: "abc123", user: ana });
    if (url.endsWith("/workspaces")) return jsonResponse([]);
    if (url.endsWith("/profile")) return jsonResponse(ana);
    return jsonResponse({ errors: ["Recurso no encontrado"] }, 404);
  });

const renderApp = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>
  );

const fillAndSubmit = async (email, password) => {
  const user = userEvent.setup();

  await user.type(screen.getByLabelText(/email/i), email);
  await user.type(screen.getByLabelText(/contraseña/i), password);
  await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));
};

describe("LoginScreen", () => {
  it("guarda el token y lleva a mis espacios de trabajo con credenciales válidas", async () => {
    mockApi();

    renderApp("/login");
    await fillAndSubmit("ana@example.com", "password123");

    expect(await screen.findByRole("heading", { name: /tus espacios de trabajo/i })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBe("abc123");
  });

  it("muestra el error de la API y no guarda token con credenciales inválidas", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      jsonResponse({ errors: ["Email o contraseña inválidos"] }, 401)
    );

    renderApp("/login");
    await fillAndSubmit("ana@example.com", "incorrecta");

    expect(await screen.findByRole("alert")).toHaveTextContent("Email o contraseña inválidos");
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeEnabled();
  });

  it("sin sesión redirige al login y, al entrar, vuelve a la ruta pedida", async () => {
    mockApi();

    renderApp("/new-workspace");
    expect(await screen.findByRole("heading", { name: /iniciar sesión/i })).toBeInTheDocument();

    await fillAndSubmit("ana@example.com", "password123");

    expect(await screen.findByRole("heading", { name: /crear un espacio de trabajo/i })).toBeInTheDocument();
  });
});
