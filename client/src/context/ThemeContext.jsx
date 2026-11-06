import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { applyTheme, getInitialTheme, prefersReducedMotion, storeTheme } from "../utils/theme";

const TRANSITION_CLASS = "theme-transition";
const TRANSITION_MS = 250;

const ThemeContext = createContext({ theme: "light", toggleTheme: () => {} });

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const root = document.documentElement;

    if (!prefersReducedMotion()) {
      root.classList.add(TRANSITION_CLASS);
      window.setTimeout(() => root.classList.remove(TRANSITION_CLASS), TRANSITION_MS);
    }

    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      storeTheme(next);

      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);
