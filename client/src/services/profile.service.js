import { api } from "./httpClient";

export const profileService = {
  get: () => api.get("/profile"),
  update: (formData) => api.patch("/profile", formData)
};
