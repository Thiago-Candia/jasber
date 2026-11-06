export class ServerError extends Error {
  constructor(message, status, errors = []) {
    super(message);
    this.name = "ServerError";
    this.status = status;
    this.errors = errors;
  }
}

export const NETWORK_ERROR_MESSAGE = "No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.";
export const UNEXPECTED_ERROR_MESSAGE = "Ocurrió un error inesperado. Intentá de nuevo.";

export const errorMessage = (error) => error?.message || UNEXPECTED_ERROR_MESSAGE;
