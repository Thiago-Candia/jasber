import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AUTH_EXPIRED_EVENT } from "../services/httpClient";
import { TOKEN_KEY, clearToken, getToken, setToken } from "../services/session";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setTokenState] = useState(getToken);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const handleExpired = () => {
      setTokenState(null);
      setSessionExpired(true);
    };

    const handleStorage = (event) => {
      if (event.key === TOKEN_KEY) setTokenState(event.newValue);
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const login = useCallback((newToken) => {
    setToken(newToken);
    setTokenState(newToken);
    setSessionExpired(false);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setSessionExpired(false);
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated: Boolean(token), sessionExpired, login, logout }),
    [token, sessionExpired, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
