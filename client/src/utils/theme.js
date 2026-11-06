const STORAGE_KEY = "theme";

const readStoredTheme = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
};

const prefersDark = () => Boolean(window.matchMedia?.("(prefers-color-scheme: dark)").matches);

export const prefersReducedMotion = () => Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

export const getInitialTheme = () => readStoredTheme() ?? (prefersDark() ? "dark" : "light");

export const storeTheme = (theme) => {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Sin almacenamiento disponible: el tema vale solo para esta visita.
  }
};

export const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
};
