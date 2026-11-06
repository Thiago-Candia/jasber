import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useCommandShortcut } from "../hooks/useCommandShortcut";
import CommandPalette from "./CommandPalette";

const workspace = {
  id: 5,
  name: "Equipo",
  members: [
    { id: 1, name: "Ana Pérez", email: "ana@example.com" },
    { id: 2, name: "Bruno Díaz", email: "bruno@example.com" }
  ]
};
const channels = {
  status: "ready",
  data: [
    { id: 10, name: "general" },
    { id: 11, name: "diseño" }
  ]
};

const Location = () => <p data-testid="location">{useLocation().pathname}</p>;

const Harness = ({ actions = {}, initialOpen = true }) => {
  const [open, setOpen] = useState(initialOpen);

  return (
    <>
      <p data-testid="state">{open ? "abierta" : "cerrada"}</p>
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        workspace={workspace}
        channels={channels}
        currentUser={workspace.members[1]}
        theme="light"
        onCreateChannel={actions.onCreateChannel ?? vi.fn()}
        onInvite={actions.onInvite ?? vi.fn()}
        onToggleTheme={actions.onToggleTheme ?? vi.fn()}
      />
      <Location />
    </>
  );
};

const renderPalette = (props) =>
  render(
    <MemoryRouter initialEntries={["/workspace/5"]}>
      <Harness {...props} />
    </MemoryRouter>
  );

describe("CommandPalette", () => {
  it("lista canales, personas y acciones", async () => {
    renderPalette();

    expect(await screen.findByRole("option", { name: /general/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /diseño/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Ana Pérez/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Bruno Díaz \(vos\)/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /crear un canal/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /cambiar a tema oscuro/i })).toBeInTheDocument();
  });

  it("filtra mientras se escribe", async () => {
    renderPalette();
    const user = userEvent.setup();

    await user.type(await screen.findByRole("combobox"), "dise");

    expect(screen.getByRole("option", { name: /diseño/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /general/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Ana Pérez/ })).not.toBeInTheDocument();
  });

  it("encuentra personas por email", async () => {
    renderPalette();
    const user = userEvent.setup();

    await user.type(await screen.findByRole("combobox"), "bruno@");

    expect(screen.getByRole("option", { name: /Bruno Díaz/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Ana Pérez/ })).not.toBeInTheDocument();
  });

  it("avisa cuando no hay resultados", async () => {
    renderPalette();
    const user = userEvent.setup();

    await user.type(await screen.findByRole("combobox"), "zzzz");

    expect(screen.getByText("No hay resultados.")).toBeInTheDocument();
  });

  it("al elegir un canal navega a él y se cierra", async () => {
    renderPalette();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("option", { name: /diseño/ }));

    expect(screen.getByTestId("location")).toHaveTextContent("/workspace/5/channel/11");
    expect(screen.getByTestId("state")).toHaveTextContent("cerrada");
  });

  it("se navega con teclado: flechas y Enter", async () => {
    renderPalette();
    const user = userEvent.setup();
    await screen.findByRole("combobox");

    await user.type(screen.getByRole("combobox"), "a");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(screen.getByTestId("location")).not.toHaveTextContent(/^\/workspace\/5$/));
    expect(screen.getByTestId("state")).toHaveTextContent("cerrada");
  });

  it("al elegir una persona abre su mensaje directo", async () => {
    renderPalette();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("option", { name: /Ana Pérez/ }));

    expect(screen.getByTestId("location")).toHaveTextContent("/workspace/5/dm/1");
  });

  it("ejecuta las acciones y se cierra", async () => {
    const onCreateChannel = vi.fn();
    renderPalette({ actions: { onCreateChannel } });
    const user = userEvent.setup();

    await user.click(await screen.findByRole("option", { name: /crear un canal/i }));

    expect(onCreateChannel).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("state")).toHaveTextContent("cerrada");
  });

  it("se cierra con Escape", async () => {
    renderPalette();
    const user = userEvent.setup();
    await screen.findByRole("combobox");

    await user.keyboard("{Escape}");

    expect(screen.getByTestId("state")).toHaveTextContent("cerrada");
  });
});

describe("useCommandShortcut", () => {
  const Probe = ({ onTrigger }) => {
    useCommandShortcut(onTrigger);

    return null;
  };

  it("responde a Ctrl+K y a Cmd+K, y evita el atajo del navegador", async () => {
    const onTrigger = vi.fn();
    render(<Probe onTrigger={onTrigger} />);
    const user = userEvent.setup();

    await user.keyboard("{Control>}k{/Control}");
    await user.keyboard("{Meta>}k{/Meta}");

    expect(onTrigger).toHaveBeenCalledTimes(2);
  });

  it("ignora la tecla K sola", async () => {
    const onTrigger = vi.fn();
    render(<Probe onTrigger={onTrigger} />);

    await userEvent.setup().keyboard("k");

    expect(onTrigger).not.toHaveBeenCalled();
  });
});
