import { api } from "./httpClient";

export const directMessageService = {
  getMessages: (workspaceId, userId) => api.get(`/workspaces/${workspaceId}/direct_messages/${userId}`),
  sendMessage: (workspaceId, userId, body) =>
    api.post(`/workspaces/${workspaceId}/direct_messages/${userId}`, { body })
};
