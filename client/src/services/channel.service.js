import { api } from "./httpClient";

export const channelService = {
  getByWorkspace: (workspaceId) => api.get(`/workspaces/${workspaceId}/channels`),
  create: (workspaceId, name) => api.post(`/workspaces/${workspaceId}/channels`, { name }),
  getMessages: (channelId) => api.get(`/channels/${channelId}/messages`),
  sendMessage: (channelId, body) => api.post(`/channels/${channelId}/messages`, { body })
};
