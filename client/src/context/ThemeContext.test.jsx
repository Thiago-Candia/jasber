import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getInitialTheme } from "../utils/theme";
import { ThemeProvider, useTheme } from "./ThemeContext";

const Toggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button type="button" onClick={toggleTheme}>
      Tema: {theme}
    </button>
  );
};

const mockSystemTheme = (dark) =>
  vi.stubGlobal("matchMedia", (query) => ({
    matches: dark && query.includes("dark"),
    addEventListener() {},
    removeEventListener() {}
  }));

describe("tema claro y oscuro", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete document.documentElement.dataset.theme;
  });

  it("sin preferencia guardada usa la del sistema", () => {
    mockSystemTheme(true);
    expect(getInitialTheme()).toBe("dark");

    mockSystemTheme(false);
    expect(getInitialTheme()).toBe("light");
  });

  it("la preferencia guardada gana sobre la del sistema", () => {
    mockSystemTheme(true);
    localStorage.setItem("theme", "light");

    expect(getInitialTheme()).toBe("light");
  });

  it("alterna el tema, lo aplica a <html> y lo recuerda", async () => {
    mockSystemTheme(false);
    render(
      <ThemeProvider>
        <Toggle />
      </ThemeProvider>
    );
    const user = userEvent.setup();

    expect(document.documentElement.dataset.theme).toBe("light");

    await user.click(screen.getByRole("button", { name: /tema: light/i }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(screen.getByRole("button", { name: /tema: dark/i })).toBeInTheDocument();
  });
});
