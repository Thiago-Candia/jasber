import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestProviders } from "../test/TestProviders";
import PresenceDot from "./PresenceDot";
import { MessageListSkeleton, SidebarSkeleton } from "./StatusView";
import TypingIndicator from "./TypingIndicator";
import UnreadBadge from "./UnreadBadge";

describe("TypingIndicator", () => {
  it("no muestra nada si no hay nadie escribiendo", () => {
    render(<TypingIndicator />);

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it.each([
    [["Ana"], "Ana está escribiendo…"],
    [["Ana", "Bruno"], "Ana y Bruno están escribiendo…"],
    [["Ana", "Bruno", "Carla"], "Varias personas están escribiendo…"]
  ])("describe quién escribe: %j", (names, text) => {
    render(<TypingIndicator names={names} />);

    expect(screen.getByRole("status")).toHaveTextContent(text);
  });
});

describe("PresenceDot", () => {
  it.each([
    ["online", "En línea"],
    ["away", "Ausente"],
    ["offline", "Desconectado"]
  ])("el estado %s se anuncia como %s", (status, label) => {
    render(<PresenceDot status={status} />);

    expect(screen.getByRole("img", { name: label })).toHaveClass(`presence--${status}`);
  });

  it("no dibuja nada si no se conoce el estado", () => {
    const { container } = render(<PresenceDot />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("UnreadBadge", () => {
  it("muestra la cantidad de no leídos", async () => {
    render(<UnreadBadge count={3} />, { wrapper: TestProviders });

    expect(await screen.findByLabelText("3 sin leer")).toHaveTextContent("3");
  });

  it("acota a 99+", async () => {
    render(<UnreadBadge count={250} />, { wrapper: TestProviders });

    expect(await screen.findByLabelText("250 sin leer")).toHaveTextContent("99+");
  });

  it("desaparece cuando no quedan no leídos", async () => {
    const { rerender } = render(<UnreadBadge count={2} />, { wrapper: TestProviders });
    await screen.findByLabelText("2 sin leer");

    rerender(<UnreadBadge count={0} />);

    await waitFor(() => expect(screen.queryByLabelText(/sin leer/)).not.toBeInTheDocument());
  });
});

describe("esqueletos de carga", () => {
  it("el de mensajes avisa a los lectores de pantalla y marca la región como ocupada", () => {
    render(<MessageListSkeleton>Cargando canal...</MessageListSkeleton>);

    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveTextContent("Cargando canal...");
  });

  it("el de la barra lateral dibuja la cantidad de filas pedida", () => {
    const { container } = render(<SidebarSkeleton rows={4}>Cargando canales...</SidebarSkeleton>);

    expect(container.querySelectorAll(".skeleton--row")).toHaveLength(4);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando canales...");
  });
});
