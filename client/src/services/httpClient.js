import ENVIRONMENT from "../config/environment";
import { NETWORK_ERROR_MESSAGE, ServerError } from "../utils/errors";
import { clearToken, getToken } from "./session";

export const AUTH_EXPIRED_EVENT = "auth:expired"

const API_PREFIX = "/api/v1"

const buildUrl = (path) => `${ENVIRONMENT.API_URL}${API_PREFIX}${path}`

const parseBody = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (response.status === 204 || !contentType.includes("application/json")) {
    return null
  }

  return response.json().catch(() => null);
};

export const httpClient = async (path, { method = "GET", body, auth = true } = {}) => {
  const isFormData = body instanceof FormData
  const hasBody = body !== undefined && body !== null
  const token = getToken();
  const headers = { Accept: "application/json" }

  if (hasBody && !isFormData) headers["Content-Type"] = "application/json"
  if (auth && token) headers.Authorization = `Bearer ${token}`

  let response;

  try {
    response = await fetch(buildUrl(path), {
      method,
      headers,
      body: hasBody && !isFormData ? JSON.stringify(body) : body
    });
  } catch {
    throw new ServerError(NETWORK_ERROR_MESSAGE, 0);
  }

  const data = await parseBody(response);

  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearToken();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }

    const errors = Array.isArray(data?.errors) ? data.errors : [];

    throw new ServerError(errors.join(". ") || `Error inesperado del servidor (${response.status})`, response.status, errors);
  }

  return data;
};

export const api = {
  get: (path, options) => httpClient(path, { ...options, method: "GET" }),
  post: (path, body, options) => httpClient(path, { ...options, body, method: "POST" }),
  patch: (path, body, options) => httpClient(path, { ...options, body, method: "PATCH" }),
  delete: (path, options) => httpClient(path, { ...options, method: "DELETE" })
};
