import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./App";
import AppProviders from "./components/AppProviders";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { applyTheme, getInitialTheme } from "./utils/theme";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/workspace.css";
import "./styles/interaction.css";

// Antes del primer render, para que no haya un destello con el tema equivocado.
applyTheme(getInitialTheme());

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AppProviders>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </AppProviders>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
