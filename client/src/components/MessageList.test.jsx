import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TestProviders } from "../test/TestProviders";
import MessageList from "./MessageList";

// Virtuoso depende de medidas reales del navegador. Acá se reemplaza por una lista simple que
// expone las props que usa MessageList, para poder simular "estoy abajo / arriba" y el scroll.
const mock = vi.hoisted(() => ({ props: null, scrollToIndex: null }));

vi.mock("react-virtuoso", async () => {
  const React = await import("react");

  const Virtuoso = React.forwardRef(function Virtuoso(props, ref) {
    mock.props = props;
    React.useImperativeHandle(ref, () => ({ scrollToIndex: mock.scrollToIndex }));

    return (
      <div role="log" aria-label="Mensajes">
        {props.data.map((item, index) => (
          <div key={props.computeItemKey(index, item)}>{props.itemContent(index, item)}</div>
        ))}
      </div>
    );
  });

  // TestProviders también importa el contexto de prueba de Virtuoso: acá no hace falta, pero debe existir.
  return { Virtuoso, VirtuosoMockContext: React.createContext(undefined) };
});

const ana = { id: 1, name: "Ana Pérez" };
const bruno = { id: 2, name: "Bruno Díaz" };

const at = (minute) => `2026-10-14T12:${String(minute).padStart(2, "0")}:00Z`;
const message = (id, body, minute, sender = ana) => ({ id, body, created_at: at(minute), sender });

const renderList = (messages, props = {}) =>
  render(
    <MessageList
      status="ready"
      messages={messages}
      currentUserId={2}
      lastSeen={null}
      reactions={{}}
      onToggleReaction={vi.fn()}
      onReply={vi.fn()}
      onRetrySend={vi.fn()}
      onDiscard={vi.fn()}
      {...props}
    />,
    { wrapper: TestProviders }
  );

const setAtBottom = (value) => act(() => mock.props.atBottomStateChange(value));

describe("MessageList", () => {
  beforeEach(() => {
    mock.scrollToIndex = vi.fn();
  });

  it("empieza en el último mensaje y no ofrece 'Ir al último mensaje' mientras estás abajo", () => {
    renderList([message(1, "Uno", 0), message(2, "Dos", 1)]);

    expect(mock.props.initialTopMostItemIndex).toEqual({ index: "LAST", align: "end" });
    expect(screen.queryByRole("button", { name: /ir al último mensaje/i })).not.toBeInTheDocument();
  });

  it("muestra el botón al subir y vuelve al final al tocarlo", async () => {
    renderList([message(1, "Uno", 0), message(2, "Dos", 1)]);
    const user = userEvent.setup();

    setAtBottom(false);
    const button = await screen.findByRole("button", { name: /ir al último mensaje/i });

    await user.click(button);

    expect(mock.scrollToIndex).toHaveBeenCalledWith({ index: "LAST", align: "end", behavior: "smooth" });

    setAtBottom(true);

    await waitFor(() => expect(screen.queryByRole("button", { name: /ir al último mensaje/i })).not.toBeInTheDocument());
  });

  it("cuenta en el botón los mensajes que llegan mientras estás arriba", async () => {
    const { rerender } = renderList([message(1, "Uno", 0)]);
    setAtBottom(false);
    await screen.findByRole("button", { name: /ir al último mensaje/i });

    rerender(
      <MessageList
        status="ready"
        messages={[message(1, "Uno", 0), message(2, "Dos", 1), message(3, "Tres", 2)]}
        currentUserId={2}
        lastSeen={null}
        reactions={{}}
        onToggleReaction={vi.fn()}
        onReply={vi.fn()}
        onRetrySend={vi.fn()}
        onDiscard={vi.fn()}
      />
    );

    expect(await screen.findByLabelText("2 mensajes nuevos")).toBeInTheDocument();

    setAtBottom(true);

    await waitFor(() => expect(screen.queryByLabelText("2 mensajes nuevos")).not.toBeInTheDocument());
  });

  it("al enviar un mensaje propio baja hasta él aunque estés arriba", () => {
    const { rerender } = renderList([message(1, "Uno", 0)]);
    setAtBottom(false);

    rerender(
      <MessageList
        status="ready"
        messages={[message(1, "Uno", 0), { ...message("local-1", "Mío", 5, bruno), clientId: "local-1", localStatus: "sending" }]}
        currentUserId={2}
        lastSeen={null}
        reactions={{}}
        onToggleReaction={vi.fn()}
        onReply={vi.fn()}
        onRetrySend={vi.fn()}
        onDiscard={vi.fn()}
      />
    );

    expect(mock.scrollToIndex).toHaveBeenCalledWith({ index: "LAST", align: "end", behavior: "smooth" });
  });

  describe("separador de mensajes nuevos", () => {
    const messages = [message(1, "Viejo", 0), message(2, "Nuevo de Ana", 10), message(3, "Otro nuevo", 11)];
    const lastSeen = Date.parse(at(5));

    it("aparece antes del primer mensaje ajeno posterior a la última visita y empieza el scroll ahí", () => {
      renderList(messages, { lastSeen });

      expect(screen.getByRole("separator", { name: "Mensajes nuevos" })).toBeInTheDocument();
      expect(mock.props.initialTopMostItemIndex).toEqual({ index: 1, align: "start" });
      expect(screen.getByRole("button", { name: /ir al último mensaje/i })).toBeInTheDocument();
    });

    it("no cuenta como nuevos los mensajes propios", () => {
      renderList([message(1, "Viejo", 0), message(2, "Mío", 10, bruno)], { lastSeen });

      expect(screen.queryByRole("separator")).not.toBeInTheDocument();
    });

    it("no aparece si nunca se había abierto la conversación", () => {
      renderList(messages, { lastSeen: null });

      expect(screen.queryByRole("separator")).not.toBeInTheDocument();
    });
  });
});
