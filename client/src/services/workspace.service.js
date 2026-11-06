import { api } from "./httpClient";

export const workspaceService = {
  getAll: () => api.get("/workspaces"),
  create: (formData) => api.post("/workspaces", formData),
  createInvite: (workspaceId) => api.post(`/workspaces/${workspaceId}/invite`),
  join: (inviteToken) => api.post(`/join/${encodeURIComponent(inviteToken)}`)
};
