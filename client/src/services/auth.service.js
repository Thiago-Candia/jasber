import { api } from "./httpClient";

export const authService = {
  login: ({ email, password }) => api.post("/login", { email, password }, { auth: false }),
  register: ({ name, email, password }) => api.post("/register", { name, email, password }, { auth: false }),
  requestPasswordReset: (email) => api.post("/password-resets", { email }, { auth: false }),
  resetPassword: (token, password) =>
    api.patch(`/password-resets/${encodeURIComponent(token)}`, { password }, { auth: false })
};
