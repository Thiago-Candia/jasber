import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestProviders } from "../test/TestProviders";
import { ServerError } from "../utils/errors";
import Conversation from "./Conversation";

// El selector de emojis real (emoji-mart) es pesado y usa custom elements: se cambia por un botón.
vi.mock("./EmojiPicker", () => ({
  default: ({ onSelect }) => (
    <button type="button" onClick={() => onSelect("🎉")}>
      Elegir fiesta
    </button>
  )
}));

const ana = { id: 1, name: "Ana Pérez", email: "ana@example.com", avatar_url: null };
const bruno = { id: 2, name: "Bruno Díaz", email: "bruno@example.com", avatar_url: null };

const message = (id, body, sender = ana) => ({ id, body, created_at: "2026-10-14T12:00:00Z", sender });

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const renderConversation = ({ loadMessages, sendMessage, ...props }) =>
  render(
    <Conversation
      title="# general"
      placeholder="Escribe un mensaje en #general"
      loadMessages={loadMessages}
      sendMessage={sendMessage}
      currentUser={bruno}
      {...props}
    />,
    { wrapper: TestProviders }
  );

describe("Conversation", () => {
  it("muestra el historial de mensajes con su remitente", async () => {
    renderConversation({
      loadMessages: () => Promise.resolve([message(1, "Hola equipo"), message(2, "Dale, me sumo", bruno)]),
      sendMessage: vi.fn()
    });

    expect(await screen.findByText("Hola equipo")).toBeInTheDocument();
    expect(screen.getByText("Dale, me sumo")).toBeInTheDocument();
    expect(screen.getByText("Bruno Díaz")).toBeInTheDocument();
  });

  it("muestra un esqueleto accesible mientras carga", () => {
    renderConversation({ loadMessages: () => new Promise(() => {}), sendMessage: vi.fn() });

    const skeleton = screen.getByText("Cargando mensajes...").closest('[role="status"]');

    expect(skeleton).toHaveAttribute("aria-busy", "true");
  });

  it("muestra el estado vacío cuando no hay mensajes", async () => {
    renderConversation({ loadMessages: () => Promise.resolve([]), sendMessage: vi.fn() });

    expect(await screen.findByText(/todavía no hay mensajes/i)).toBeInTheDocument();
  });

  it("envía un mensaje, lo agrega una sola vez y limpia el campo", async () => {
    const sendMessage = vi.fn((body) => Promise.resolve(message(3, body)));
    renderConversation({ loadMessages: () => Promise.resolve([message(1, "Hola equipo")]), sendMessage });
    const user = userEvent.setup();
    await screen.findByText("Hola equipo");

    const input = screen.getByRole("textbox", { name: /mensaje/i });
    await user.type(input, "  Nuevo mensaje  ");
    await user.click(screen.getByRole("button", { name: /enviar/i }));

    expect(sendMessage).toHaveBeenCalledWith("Nuevo mensaje");
    expect(await screen.findByText("Nuevo mensaje")).toBeInTheDocument();
    expect(screen.getAllByText("Nuevo mensaje")).toHaveLength(1);
    expect(input).toHaveValue("");
  });

  it("no envía mensajes vacíos", async () => {
    const sendMessage = vi.fn();
    renderConversation({ loadMessages: () => Promise.resolve([]), sendMessage });
    await screen.findByText(/todavía no hay mensajes/i);

    expect(screen.getByRole("button", { name: /enviar/i })).toBeDisabled();
  });

  it("si falla la carga muestra el error y permite reintentar", async () => {
    const loadMessages = vi
      .fn()
      .mockRejectedValueOnce(new ServerError("No se pudo conectar con el servidor.", 0))
      .mockResolvedValueOnce([message(1, "Hola equipo")]);
    renderConversation({ loadMessages, sendMessage: vi.fn() });
    const user = userEvent.setup();

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor.");

    await user.click(screen.getByRole("button", { name: /reintentar/i }));

    expect(await screen.findByText("Hola equipo")).toBeInTheDocument();
    expect(loadMessages).toHaveBeenCalledTimes(2);
  });

  describe("envío optimista", () => {
    it("muestra el mensaje al instante como 'Enviando…' y limpia el campo antes de que responda la API", async () => {
      const pending = deferred();
      const sendMessage = vi.fn(() => pending.promise);
      renderConversation({ loadMessages: () => Promise.resolve([message(1, "Hola equipo")]), sendMessage });
      const user = userEvent.setup();
      await screen.findByText("Hola equipo");

      const input = screen.getByRole("textbox", { name: /mensaje/i });
      await user.type(input, "Ya voy");
      await user.keyboard("{Enter}");

      expect(screen.getByText("Ya voy")).toBeInTheDocument();
      expect(screen.getByText("Enviando…")).toBeInTheDocument();
      expect(input).toHaveValue("");

      pending.resolve(message(9, "Ya voy", bruno));

      await waitFor(() => expect(screen.queryByText("Enviando…")).not.toBeInTheDocument());
      expect(screen.getAllByText("Ya voy")).toHaveLength(1);
    });

    it("si falla queda en la lista con el error de la API y permite reintentar", async () => {
      const sendMessage = vi
        .fn()
        .mockRejectedValueOnce(new ServerError("Mensaje no puede estar en blanco", 422))
        .mockImplementationOnce((body) => Promise.resolve(message(7, body, bruno)));
      renderConversation({ loadMessages: () => Promise.resolve([]), sendMessage });
      const user = userEvent.setup();
      await screen.findByText(/todavía no hay mensajes/i);

      await user.type(screen.getByRole("textbox", { name: /mensaje/i }), "Hola");
      await user.keyboard("{Enter}");

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Mensaje no puede estar en blanco");
      expect(screen.getByText("Hola")).toBeInTheDocument();

      await user.click(within(alert).getByRole("button", { name: /reintentar/i }));

      await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
      expect(sendMessage).toHaveBeenCalledTimes(2);
      expect(sendMessage).toHaveBeenLastCalledWith("Hola");
      expect(screen.getAllByText("Hola")).toHaveLength(1);
    });

    it("permite descartar un mensaje que no se pudo enviar", async () => {
      const sendMessage = vi.fn(() => Promise.reject(new ServerError("Sin conexión", 0)));
      renderConversation({ loadMessages: () => Promise.resolve([]), sendMessage });
      const user = userEvent.setup();
      await screen.findByText(/todavía no hay mensajes/i);

      await user.type(screen.getByRole("textbox", { name: /mensaje/i }), "Hola");
      await user.keyboard("{Enter}");
      await user.click(await screen.findByRole("button", { name: /descartar/i }));

      expect(screen.queryByText("Hola")).not.toBeInTheDocument();
      expect(await screen.findByText(/todavía no hay mensajes/i)).toBeInTheDocument();
    });
  });

  describe("responder", () => {
    it("cita el mensaje elegido y lo manda como primera línea", async () => {
      const sendMessage = vi.fn((body) => Promise.resolve(message(5, body, bruno)));
      renderConversation({ loadMessages: () => Promise.resolve([message(1, "Hola equipo")]), sendMessage });
      const user = userEvent.setup();
      await screen.findByText("Hola equipo");

      await user.click((await screen.findAllByRole("button", { name: "Responder" }))[0]);

      expect(screen.getByText(/respondiendo a/i)).toHaveTextContent("Ana Pérez");

      await user.type(screen.getByRole("textbox", { name: /mensaje/i }), "Gracias");
      await user.keyboard("{Enter}");

      expect(sendMessage).toHaveBeenCalledWith("> Ana Pérez: Hola equipo\nGracias");
      expect(screen.queryByText(/respondiendo a/i)).not.toBeInTheDocument();
      expect(await screen.findByText("Ana Pérez: Hola equipo", { selector: "blockquote" })).toBeInTheDocument();
      expect(screen.getByText("Gracias")).toBeInTheDocument();
    });

    it("se puede cancelar con Escape", async () => {
      renderConversation({ loadMessages: () => Promise.resolve([message(1, "Hola equipo")]), sendMessage: vi.fn() });
      const user = userEvent.setup();
      await screen.findByText("Hola equipo");

      await user.click((await screen.findAllByRole("button", { name: "Responder" }))[0]);
      expect(screen.getByText(/respondiendo a/i)).toBeInTheDocument();

      await user.keyboard("{Escape}");

      expect(screen.queryByText(/respondiendo a/i)).not.toBeInTheDocument();
    });
  });

  describe("reacciones", () => {
    const seed = (reactions) => localStorage.setItem("reactions:v1", JSON.stringify({ "channel-1-1": { 1: reactions } }));

    it("muestra las reacciones guardadas y permite sumar y quitar la propia", async () => {
      seed([{ emoji: "👍", userIds: [1] }]);
      renderConversation({
        loadMessages: () => Promise.resolve([message(1, "Hola equipo")]),
        sendMessage: vi.fn(),
        storageKey: "channel-1-1"
      });
      const user = userEvent.setup();

      const chip = await screen.findByRole("button", { name: "👍, 1 persona" });
      expect(chip).toHaveAttribute("aria-pressed", "false");

      await user.click(chip);

      const mine = screen.getByRole("button", { name: "👍, 2 personas, incluyéndote" });
      expect(mine).toHaveAttribute("aria-pressed", "true");
      expect(JSON.parse(localStorage.getItem("reactions:v1"))["channel-1-1"][1]).toEqual([{ emoji: "👍", userIds: [1, 2] }]);

      await user.click(mine);

      expect(screen.getByRole("button", { name: "👍, 1 persona" })).toBeInTheDocument();
    });

    it("reacciona desde la barra de acciones con el selector de emojis", async () => {
      renderConversation({
        loadMessages: () => Promise.resolve([message(1, "Hola equipo")]),
        sendMessage: vi.fn(),
        storageKey: "channel-1-1"
      });
      const user = userEvent.setup();
      await screen.findByText("Hola equipo");

      await user.click((await screen.findAllByRole("button", { name: /reaccionar con un emoji/i }))[0]);
      await user.click(await screen.findByRole("button", { name: "Elegir fiesta" }));

      expect(await screen.findByRole("button", { name: "🎉, 1 persona, incluyéndote" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Elegir fiesta" })).not.toBeInTheDocument();
    });

    it("quitar la última reacción elimina el chip", async () => {
      seed([{ emoji: "❤️", userIds: [2] }]);
      renderConversation({
        loadMessages: () => Promise.resolve([message(1, "Hola equipo")]),
        sendMessage: vi.fn(),
        storageKey: "channel-1-1"
      });
      const user = userEvent.setup();

      await user.click(await screen.findByRole("button", { name: "❤️, 1 persona, incluyéndote" }));

      expect(screen.queryByRole("button", { name: /❤️/ })).not.toBeInTheDocument();
    });
  });

  it("muestra quién está escribiendo cuando se le informa", async () => {
    renderConversation({
      loadMessages: () => Promise.resolve([]),
      sendMessage: vi.fn(),
      typingNames: ["Ana"]
    });

    expect(await screen.findByText("Ana está escribiendo…")).toBeInTheDocument();
  });
});
